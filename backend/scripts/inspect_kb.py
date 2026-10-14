import os
from app.core.database import SessionLocal
from app.models import Project, KnowledgeDoc
from app.orchestrator.rag_service import PerProjectRAGService

db = SessionLocal()
projs = db.query(Project).all()
print(f"Total Projects in DB: {len(projs)}")
for p in projs:
    print(f"\nProject: ID={p.id} Name='{p.name}' Status='{p.status}' Domain='{p.domain}'")
    docs = db.query(KnowledgeDoc).filter(KnowledgeDoc.project_id == p.id).all()
    print(f"  KnowledgeDocs in DB: {len(docs)}")
    for d in docs:
        print(f"    - ID: {d.id}, Filename: {d.filename}, Status: {d.status}, Size: {d.file_size}")
    
    col_name = PerProjectRAGService._get_collection_name(p.id)
    try:
        client = PerProjectRAGService._get_client()
        col = client.get_collection(col_name)
        count = col.count()
        print(f"  Chroma Collection [{col_name}] count: {count}")
        if count > 0:
            peek = col.peek(limit=2)
            print(f"    Sample IDs: {peek['ids']}")
            print(f"    Sample Document preview: {[d[:100] for d in peek['documents']]}")
    except Exception as e:
        print(f"  Chroma Collection [{col_name}] Error: {e}")
db.close()
