import sys
import json
from pathlib import Path
from dotenv import load_dotenv

# Add project root
root_path = Path(__file__).parent.parent
sys.path.append(str(root_path))

# Load environment variables from backend/efs-rag-bot/.env
load_dotenv(dotenv_path=root_path / ".env")

from langchain_chroma import Chroma
from langchain_core.documents import Document
from config import get_embeddings, CHROMA_DIR

# NEW COLLECTION (does NOT touch existing EFS)
ABC_COLLECTION = "abc_bank_faqs"

# Path to JSON
JSON_PATH = Path(__file__).parent.parent / "data" / "abc_bank_faq.json"


def load_json():
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def build_docs(data):
    docs = []

    for item in data:
        question = item.get("question", "").strip()
        answers = item.get("answer", [])
        metadata = item.get("metadata", {})

        category = metadata.get("category", "general")

        # Join answers into single text block
        answer_text = " ".join(answers)

        content = f"Question: {question}\nAnswer: {answer_text}"

        docs.append(
            Document(
                page_content=content,
                metadata={
                    "category": str(category).lower().strip(),
                    "source": "abc_bank"
                }
            )
        )

    return docs


def main():
    print("🚀 Loading ABC Bank FAQ JSON...")

    data = load_json()
    docs = build_docs(data)

    print(f"📄 Total documents: {len(docs)}")

    print("🧠 Initializing Chroma DB...")

    db = Chroma(
        collection_name=ABC_COLLECTION,
        embedding_function=get_embeddings(),
        persist_directory=CHROMA_DIR
    )

    print("📥 Inserting into Chroma...")

    db.add_documents(docs)

    print(f"✅ Successfully inserted {len(docs)} docs into collection: {ABC_COLLECTION}")


if __name__ == "__main__":
    main()