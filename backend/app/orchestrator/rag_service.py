import os
import re
import uuid
import logging
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.utils import embedding_functions
from app.core.config import settings

logger = logging.getLogger(__name__)


class PerProjectRAGService:
    """
    Tenant Isolation RAG Service:
    Maintains one isolated persistent Chroma vector collection per project
    using local zero-cost all-MiniLM-L6-v2 embeddings.
    """
    _client: Optional[chromadb.ClientAPI] = None
    _embedding_fn = None

    @classmethod
    def _get_client(cls) -> chromadb.ClientAPI:
        if cls._client is None:
            persist_dir = os.path.abspath(settings.CHROMA_PERSIST_DIR)
            os.makedirs(persist_dir, exist_ok=True)
            cls._client = chromadb.PersistentClient(path=persist_dir)
            cls._embedding_fn = embedding_functions.DefaultEmbeddingFunction()
        return cls._client

    @classmethod
    def _get_collection_name(cls, project_id: str) -> str:
        # Chroma collection names: 3-63 chars, alphanumeric, underscore or hyphen
        clean_id = re.sub(r"[^a-zA-Z0-9_\-]", "_", project_id)
        name = f"proj_{clean_id}"
        return name[:63]

    @classmethod
    def chunk_text(cls, text: str, chunk_size: int = 500, overlap: int = 100) -> List[str]:
        """Split text into semantic chunks with overlap"""
        if not text:
            return []

        # Split on paragraph or double newlines first
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        chunks = []
        current_chunk = []
        current_len = 0

        for p in paragraphs:
            p_len = len(p)
            if current_len + p_len > chunk_size and current_chunk:
                chunks.append("\n\n".join(current_chunk))
                # Retain last piece for overlap
                current_chunk = [current_chunk[-1]] if len(current_chunk) > 1 else []
                current_len = len(current_chunk[0]) if current_chunk else 0

            current_chunk.append(p)
            current_len += p_len

        if current_chunk:
            chunks.append("\n\n".join(current_chunk))

        # Fallback if chunks are still too large
        refined_chunks = []
        for c in chunks:
            if len(c) > chunk_size * 2:
                words = c.split()
                for i in range(0, len(words), 80):
                    part = " ".join(words[i:i + 100])
                    if part.strip():
                        refined_chunks.append(part.strip())
            else:
                refined_chunks.append(c)

        return [c for c in refined_chunks if len(c.strip()) > 15]

    @classmethod
    def index_document_text(
        cls,
        project_id: str,
        filename: str,
        content: str,
        source: str = "upload",
        extra_metadata: Optional[Dict[str, Any]] = None,
    ) -> int:
        """
        Chunk and index document text into the project's vector store collection.
        Returns count of indexed chunks.
        """
        try:
            client = cls._get_client()
            col_name = cls._get_collection_name(project_id)
            collection = client.get_or_create_collection(
                name=col_name,
                embedding_function=cls._embedding_fn,
            )

            chunks = cls.chunk_text(content)
            if not chunks:
                return 0

            ids = []
            documents = []
            metadatas = []

            for idx, chunk in enumerate(chunks):
                chunk_id = f"{filename}_{idx}_{uuid.uuid4().hex[:6]}"
                ids.append(chunk_id)
                documents.append(chunk)
                meta = {
                    "project_id": str(project_id),
                    "filename": str(filename),
                    "source": str(source),
                    "chunk_index": idx,
                }
                if extra_metadata:
                    for k, v in extra_metadata.items():
                        if isinstance(v, (str, int, float, bool)):
                            meta[k] = v
                metadatas.append(meta)

            collection.add(ids=ids, documents=documents, metadatas=metadatas)
            logger.info(f"[Chroma RAG] Indexed {len(chunks)} chunks into collection {col_name} for file {filename}")
            return len(chunks)

        except Exception as e:
            logger.error(f"[Chroma RAG] Failed to index document for project {project_id}: {e}")
            return 0

    @classmethod
    def delete_document_chunks(cls, project_id: str, filename: str) -> bool:
        """
        Delete all indexed chunks associated with a specific filename in a project's collection.
        """
        try:
            client = cls._get_client()
            col_name = cls._get_collection_name(project_id)
            try:
                collection = client.get_collection(name=col_name, embedding_function=cls._embedding_fn)
            except Exception:
                return False

            collection.delete(where={"filename": filename})
            logger.info(f"[Chroma RAG] Deleted chunks for file '{filename}' from collection '{col_name}'")
            return True
        except Exception as e:
            logger.warning(f"[Chroma RAG] Failed to delete chunks for '{filename}' in '{project_id}': {e}")
            return False

    @classmethod
    def query_project_kb(
        cls,
        project_id: str,
        query: str,
        top_k: int = 3,
    ) -> List[Dict[str, Any]]:
        """
        Query isolated vector collection for given project ID.
        Returns top matching passages with distance score.
        """
        if not query or not query.strip():
            return []

        try:
            client = cls._get_client()
            col_name = cls._get_collection_name(project_id)
            logger.info(f"[Chroma RAG] Querying collection='{col_name}' for project={project_id}")

            # Check if collection exists
            try:
                collection = client.get_collection(
                    name=col_name,
                    embedding_function=cls._embedding_fn,
                )
            except Exception as coll_err:
                # Collection does not exist yet — no documents have been uploaded
                logger.warning(
                    f"[Chroma RAG] Collection '{col_name}' not found for project={project_id}. "
                    f"No knowledge base documents have been uploaded yet. Error: {coll_err}"
                )
                return []

            count = collection.count()
            logger.info(f"[Chroma RAG] Collection '{col_name}' has {count} indexed chunks")
            if count == 0:
                logger.warning(f"[Chroma RAG] Collection '{col_name}' exists but is empty (0 chunks)")
                return []

            n_results = min(top_k, count)
            results = collection.query(
                query_texts=[query],
                n_results=n_results,
            )

            passages = []
            if results and results.get("documents") and results["documents"][0]:
                docs = results["documents"][0]
                metas = results["metadatas"][0] if results.get("metadatas") else [{}] * len(docs)
                dists = results["distances"][0] if results.get("distances") else [0.0] * len(docs)
                doc_ids = results["ids"][0] if results.get("ids") else [""] * len(docs)

                for doc, meta, dist, d_id in zip(docs, metas, dists, doc_ids):
                    passages.append({
                        "id": d_id,
                        "text": doc,
                        "filename": (meta or {}).get("filename", "unknown"),
                        "source": (meta or {}).get("source", "upload"),
                        "score": round(float(dist), 4),
                    })

                logger.info(
                    f"[Chroma RAG] Query returned {len(passages)} passages. "
                    f"Distances: {[p['score'] for p in passages]}"
                )
            else:
                logger.warning(f"[Chroma RAG] Query returned no matching documents for collection '{col_name}'")

            return passages

        except Exception as e:
            logger.warning(f"[Chroma RAG] Query failed for project {project_id}: {e}")
            return []

