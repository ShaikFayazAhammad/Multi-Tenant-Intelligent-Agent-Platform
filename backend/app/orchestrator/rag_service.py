import os
from typing import List, Dict, Any
from app.core.config import settings

class PerProjectRAGService:
    """
    Tenant Isolation RAG Service: One vector collection per project
    """
    _in_memory_kb: Dict[str, List[Dict[str, Any]]] = {}

    @classmethod
    def index_document_text(cls, project_id: str, filename: str, content: str) -> bool:
        """Index document text into project collection"""
        collection_name = f"project_{project_id}"
        if collection_name not in cls._in_memory_kb:
            cls._in_memory_kb[collection_name] = []
        
        # Chunk text into passages
        chunks = [c.strip() for c in content.split("\n\n") if c.strip()]
        for idx, chunk in enumerate(chunks):
            cls._in_memory_kb[collection_name].append({
                "id": f"{filename}_{idx}",
                "filename": filename,
                "text": chunk
            })
        return True

    @classmethod
    def query_project_kb(cls, project_id: str, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """Query isolated vector collection for given project ID"""
        collection_name = f"project_{project_id}"
        docs = cls._in_memory_kb.get(collection_name, [])
        if not docs or not query:
            return []

        # Simple semantic keyword score matching for local execution
        query_words = set(query.lower().split())
        scored_docs = []

        for d in docs:
            text_words = set(d["text"].lower().split())
            score = len(query_words.intersection(text_words))
            if score > 0:
                scored_docs.append((score, d))

        scored_docs.sort(key=lambda x: x[0], reverse=True)
        return [item[1] for item in scored_docs[:top_k]]
