import httpx
import asyncio

async def test_url(url):
    print(f"Testing: {url}")
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            # Test GET (health)
            resp = await client.get(url)
            print(f"  GET Status: {resp.status_code}")
            
            # Test POST (empty ask)
            resp = await client.post(url, json={"input": "test", "session_id": "test"})
            print(f"  POST Status: {resp.status_code}")
    except Exception as e:
        print(f"  Error: {e}")

async def main():
    urls = [
        "https://vms2.0.haloocom.in/rag",
        "https://vms2.0.haloocom.in/rag/",
        "https://vms2.0.haloocom.in/rag/ask",
        "https://vms2.0.haloocom.in/rag/health",
        "http://localhost:8123/health",
        "http://localhost:8123/ask"
    ]
    for url in urls:
        await test_url(url)
        print("-" * 20)

if __name__ == "__main__":
    asyncio.run(main())
