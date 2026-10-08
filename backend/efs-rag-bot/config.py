import os
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

CHROMA_DIR = "./chroma"

COLLECTION_NAME = "efs_faqs"

# NEW COLLECTIONS
PDF_COLLECTION = "efs_pdf"
ABC_COLLECTION = "abc_bank_faqs"


def _get_openai_api_key() -> str:
    key = os.getenv("OPENAI_API_KEY", "").strip()
    if not key:
        raise RuntimeError("OPENAI_API_KEY not set")
    return key


def get_llm():
    return ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0,
        api_key=_get_openai_api_key(),
    )


def get_embeddings():
    return OpenAIEmbeddings(
        api_key=_get_openai_api_key(),
    )