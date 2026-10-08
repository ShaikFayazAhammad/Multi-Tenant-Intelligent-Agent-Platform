# import sys
# sys.path.insert(0, r'c:\Users\rakes\OneDrive\Desktop\efs_vms_2.0\backend\efs-rag-bot')

# from graph.nodes import canonical_mapper, retrieve, generate

# # Test 1: AC question RAG retrieval
# print("=" * 60)
# print("Test 1: AC Question RAG Retrieval")
# print("=" * 60)

# state1 = {
#     'question': "The AC in the meeting room isn't working how to switch it on",
#     'room': 'General',
#     'conversation_history': []
# }

# # Map to canonical
# canonical_result = canonical_mapper(state1)
# state1['canonical_question'] = canonical_result['canonical_question']
# print(f"Original: {state1['question']}")
# print(f"Canonical: {state1['canonical_question']}")

# # Update question for retrieval
# state1['question'] = state1['canonical_question']

# # Retrieve
# retrieve_result = retrieve(state1)
# state1['docs'] = retrieve_result['docs']
# print(f"\nRetrieved {len(state1['docs'])} documents")

# # Generate answer
# answer_result = generate(state1)
# print(f"\nAnswer:\n{answer_result['answer']}")

# # Test 2: Visitor OTP question RAG retrieval
# print("\n\n" + "=" * 60)
# print("Test 2: Visitor OTP Question RAG Retrieval")
# print("=" * 60)

# state2 = {
#     'question': "My visitor hasn't received the OTP/pass — can you resend it",
#     'room': 'General',
#     'conversation_history': []
# }

# # Map to canonical
# canonical_result2 = canonical_mapper(state2)
# state2['canonical_question'] = canonical_result2['canonical_question']
# print(f"Original: {state2['question']}")
# print(f"Canonical: {state2['canonical_question']}")

# # Update question for retrieval
# state2['question'] = state2['canonical_question']

# # Retrieve
# retrieve_result2 = retrieve(state2)
# state2['docs'] = retrieve_result2['docs']
# print(f"\nRetrieved {len(state2['docs'])} documents")

# # Generate answer
# answer_result2 = generate(state2)
# print(f"\nAnswer:\n{answer_result2['answer']}")


import os
import httpx
import asyncio
from dotenv import load_dotenv
from langchain_openai import OpenAIEmbeddings, ChatOpenAI

load_dotenv()

async def check_openai_connectivity():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("❌ OPENAI_API_KEY not found in environment.")
        return

    print(f"Using API Key: {api_key[:10]}...{api_key[-5:]}")
    
    # 1. Simple HTTP check
    print("\n1. Testing HTTP connection to OpenAI API...")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get("https://api.openai.com/v1/models", headers={"Authorization": f"Bearer {api_key}"})
            if response.status_code == 200:
                print(f"✅ HTTP connection successful! (Status: {response.status_code})")
            else:
                print(f"❌ HTTP connection failed. Status: {response.status_code}, Body: {response.text}")
    except Exception as e:
        print(f"❌ HTTP connection error: {e}")

    # 2. Test Embeddings (requires OpenAIEmbeddings)
    print("\n2. Testing OpenAIEmbeddings...")
    try:
        embeddings = OpenAIEmbeddings()
        result = embeddings.embed_query("test connectivity")
        print(f"✅ Embeddings retrieval successful! Result size: {len(result)}")
    except Exception as e:
        print(f"❌ Embeddings error: {e}")

    # 3. Test LLM
    print("\n3. Testing ChatOpenAI...")
    try:
        llm = ChatOpenAI(model="gpt-4o-mini")
        response = llm.invoke("Hello, are you there?")
        print(f"✅ LLM response: {response.content}")
    except Exception as e:
        print(f"❌ LLM error: {e}")

if __name__ == "__main__":
    asyncio.run(check_openai_connectivity())
