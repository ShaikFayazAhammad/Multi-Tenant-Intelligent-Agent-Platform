"""
Reindex Knowledge Base documents in the database using the new DocumentParser.
Removes legacy corrupted chunks (such as raw binary PDF strings) and re-indexes clean text.
Deduplicates multiple duplicate uploads of the same filename per project.
"""
import os
import sys

# Ensure backend root is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.models import KnowledgeDoc, Project
from app.services.document_parser import DocumentParser, DocumentParseError
from app.orchestrator.rag_service import PerProjectRAGService

def reindex_all():
    db = SessionLocal()
    try:
        docs = db.query(KnowledgeDoc).all()
        print(f"==================================================", flush=True)
        print(f"Total Knowledge Documents in DB: {len(docs)}", flush=True)
        print(f"==================================================", flush=True)

        success_count = 0
        skipped_count = 0
        failed_count = 0

        # Track (project_id, filename) to avoid re-embedding duplicate uploads
        seen_project_files = {}

        for doc in docs:
            proj_file_key = (doc.project_id, doc.filename)
            print(f"\n[Doc ID: {doc.id}] File: '{doc.filename}' (Project: {doc.project_id})", flush=True)

            # Check if this is a web crawl doc
            is_web = (doc.filename.startswith("Web:") or 
                      (doc.doc_metadata and doc.doc_metadata.get("source") == "web_crawler") or
                      (doc.file_path and doc.file_path.startswith("http")))

            if is_web:
                print("  -> Web crawled document; retaining existing chunks.", flush=True)
                skipped_count += 1
                continue

            if not doc.file_path or not os.path.exists(doc.file_path):
                print(f"  -> WARNING: File not found on disk at {doc.file_path}; skipping.", flush=True)
                failed_count += 1
                continue

            # If already processed for this project during this run, share the result
            if proj_file_key in seen_project_files:
                cached = seen_project_files[proj_file_key]
                print(f"  -> Duplicate file entry in DB; syncing metadata from previously indexed file ({cached['chunks_count']} chunks).", flush=True)
                meta = doc.doc_metadata or {}
                meta.update(cached["meta"])
                doc.doc_metadata = meta
                doc.status = "indexed"
                db.commit()
                skipped_count += 1
                continue

            try:
                with open(doc.file_path, "rb") as f:
                    file_bytes = f.read()

                # Parse cleanly using DocumentParser
                parsed = DocumentParser.extract_text(content=file_bytes, filename=doc.filename)
                extracted_text = parsed["text"]
                char_len = len(extracted_text)
                page_count = parsed.get("page_count", 1)
                file_type = parsed.get("file_type", "unknown")
                print(f"  -> Successfully extracted {char_len} chars (pages={page_count}, type={file_type})", flush=True)

                # Delete legacy/corrupted chunks for this file
                PerProjectRAGService.delete_document_chunks(project_id=doc.project_id, filename=doc.filename)

                # Re-index clean text into Chroma
                chunks_count = PerProjectRAGService.index_document_text(
                    project_id=doc.project_id,
                    filename=doc.filename,
                    content=extracted_text,
                    source="reindex_migration",
                    extra_metadata={
                        "file_type": file_type,
                        "page_count": page_count,
                        "reindexed": True,
                    }
                )

                meta_update = {
                    "chunks_count": chunks_count,
                    "char_count": char_len,
                    "page_count": page_count,
                    "file_type": file_type,
                    "status": "indexed",
                }

                # Update doc metadata in DB
                meta = doc.doc_metadata or {}
                meta.update(meta_update)
                doc.doc_metadata = meta
                doc.status = "indexed"
                db.commit()

                seen_project_files[proj_file_key] = {
                    "chunks_count": chunks_count,
                    "meta": meta_update
                }

                print(f"  -> SUCCESS: Indexed {chunks_count} clean chunks into Chroma.", flush=True)
                success_count += 1

            except DocumentParseError as pe:
                print(f"  -> PARSE ERROR: {pe}", flush=True)
                failed_count += 1
            except Exception as e:
                print(f"  -> ERROR during re-indexing: {e}", flush=True)
                failed_count += 1

        print(f"\n==================================================", flush=True)
        print(f"Re-indexing Complete!", flush=True)
        print(f"  Success (Unique Files): {success_count}", flush=True)
        print(f"  Skipped (Web / Duplicates): {skipped_count}", flush=True)
        print(f"  Failed:  {failed_count}", flush=True)
        print(f"==================================================", flush=True)

    finally:
        db.close()

if __name__ == "__main__":
    reindex_all()
