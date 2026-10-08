import os
import sys
from pathlib import Path

# Add project root to sys.path
root_path = Path(__file__).parent.parent
sys.path.append(str(root_path))

import json
# from langchain_chroma import Chroma
# from langchain.schema import Document
# from config import get_embeddings, CHROMA_DIR, COLLECTION_NAME
from dotenv import load_dotenv
import os
from langchain_chroma import Chroma
from langchain_core.documents import Document
from config import get_embeddings, CHROMA_DIR, COLLECTION_NAME

# Load environment variables
load_dotenv()
if not os.getenv("OPENAI_API_KEY"):
    raise RuntimeError("OPENAI_API_KEY not found in environment")

# Load FAQ JSON
with open("/home/HEXA/rakesh/efs_vms_2.0/backend/efs-rag-bot/data/efs_faq.json", "r", encoding="utf-8") as f:
# with open(r"C:\Users\rakes\OneDrive\Desktop\efs_vms_2.0\backend\efs-rag-bot\data\efs_faq.json", "r", encoding="utf-8") as f:
    faqs = json.load(f)

docs = []

for item in faqs:
    question = item.get("question", "").strip()
    answers = item.get("answer", [])
    metadata = item.get("metadata", {})

    # Normalize rooms
    rooms = metadata.get("room", "general")
    if isinstance(rooms, str):
        rooms = [rooms]  # convert single room to list

    category = metadata.get("category", "General")

    for room in rooms:
        # 🔒 Explicit metadata (Chroma only allows str/int/float/bool/None)
        clean_metadata = {
            "room": str(room).lower().strip(),
            "category": str(category).lower().strip()
        }

        # ✅ Embed both question + answer for reliable retrieval
        content = f"Question: {question}\nAnswer: {' '.join(answers)}"

        docs.append(
            Document(
                page_content=content,
                metadata=clean_metadata
            )
        )

# Create or load Chroma collection
db = Chroma(
    collection_name=COLLECTION_NAME,
    embedding_function=get_embeddings(),
    persist_directory=CHROMA_DIR
)

# Add all documents
db.add_documents(docs)

print(f"[OK] Successfully ingested {len(docs)} documents into Chroma")
