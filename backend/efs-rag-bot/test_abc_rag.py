import sys
from pathlib import Path

root_path = Path(__file__).parent
sys.path.append(str(root_path))

from langchain_chroma import Chroma
from config import get_embeddings, CHROMA_DIR
from dotenv import load_dotenv
load_dotenv()
db = Chroma(
    collection_name="abc_bank_faqs",
    embedding_function=get_embeddings(),
    persist_directory=CHROMA_DIR
)

query = "How do I update my registered mobile number?"

results = db.similarity_search(query, k=3)
print("Collection count:", db._collection.count())

print("\n🔎 QUERY:", query)

for i, doc in enumerate(results):
    print("\n===================")
    
    print(f"RESULT {i+1}")
    print("===================")
    print(doc.page_content)
