
import sys
# sys.path.append("/home/haloocom/efs-rag-bot")
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()
if not os.getenv("OPENAI_API_KEY"):
    raise RuntimeError("OPENAI_API_KEY not found in environment")

from langchain_chroma import Chroma
from config import get_embeddings, CHROMA_DIR, COLLECTION_NAME

db = Chroma(
    collection_name=COLLECTION_NAME,
    embedding_function=get_embeddings(),
    persist_directory=CHROMA_DIR
)
