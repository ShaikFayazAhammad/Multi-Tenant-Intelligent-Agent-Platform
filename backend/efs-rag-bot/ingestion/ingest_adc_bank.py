import sys
import json
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

from langchain_chroma import Chroma
from langchain_core.documents import Document

root_path = Path(__file__).parent.parent
sys.path.append(str(root_path))

from config import get_embeddings, CHROMA_DIR

ABC_COLLECTION = "abc_bank_faqs"

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

        content = f"Question: {question}\nAnswer: {' '.join(answers)}"

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
    print("🚀 Loading JSON...")

    data = load_json()
    docs = build_docs(data)

    print(f"📄 Docs: {len(docs)}")

    db = Chroma(
        collection_name=ABC_COLLECTION,
        embedding_function=get_embeddings(),
        persist_directory=CHROMA_DIR
    )

    db.add_documents(docs)

    print(f"✅ Inserted into {ABC_COLLECTION}")


if __name__ == "__main__":
    main()