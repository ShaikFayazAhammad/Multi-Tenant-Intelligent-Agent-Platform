import httpx
import asyncio
import os
import sys
from dotenv import load_dotenv

load_dotenv()

# Avoid dependent settings for raw connectivity test
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
RAG_BOT_URL = os.getenv("RAG_BOT_URL", "http://localhost:8123")

async def test_conn(name, verify, proxy=None):
    print(f"\n--- Testing: {name} (verify={verify}, proxy={proxy}) ---")
    try:
        async with httpx.AsyncClient(verify=verify, proxy=proxy, timeout=10.0) as client:
            resp = await client.get("https://api.openai.com/v1/models", headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}"
            })
            print(f"Status: {resp.status_code}")
            if resp.status_code == 200:
                print("Success!")
            else:
                print(f"Error Body: {resp.text[:100]}")
    except Exception as e:
        print(f"Failed: {type(e).__name__}: {e}")

async def main():
    print(f"OPENAI_API_KEY length: {len(OPENAI_API_KEY) if OPENAI_API_KEY else 0}")
    print(f"HTTPS_PROXY env: {os.environ.get('HTTPS_PROXY')}")
    
    # Test 0: Internal RAG Bot (localhost:8145)
    print(f"\n--- Testing: Internal RAG Bot ({RAG_BOT_URL}) ---")
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            url = f"{RAG_BOT_URL}/health" if not RAG_BOT_URL.endswith("/") else f"{RAG_BOT_URL}health"
            resp = await client.get(url)
            print(f"RAG Health Status: {resp.status_code}")
    except Exception as e:
        print(f"RAG Health Failed: {e}")

    # Test 1: Standard OpenAI
    await test_conn("Standard OpenAI", True)
    
    # Test 2: Insecure OpenAI
    await test_conn("Insecure OpenAI (verify=False)", False)
    
    # Test 3: Neutral Outbound (Google)
    print("\n--- Testing: Neutral Outbound (Google) ---")
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get("https://www.google.com")
            print(f"Google Status: {resp.status_code}")
    except Exception as e:
        print(f"Google Failed: {e}")

    # Test 4: With explicit proxy (if any)
    proxy = os.environ.get("HTTPS_PROXY")
    if proxy:
        await test_conn("With Proxy & Insecure", False, proxy)

if __name__ == "__main__":
    asyncio.run(main())
