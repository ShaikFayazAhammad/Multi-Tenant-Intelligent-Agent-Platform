
# import asyncio
# import sys
# import os
# from datetime import datetime
# from dotenv import load_dotenv

# # Add the backend directory to sys.path
# sys.path.append(r"C:\Users\rakes\OneDrive\Desktop\efs_vms_2.0\backend\efs_vms_chatbot")

# # Load .env from the chatbot directory
# load_dotenv(r"C:\Users\rakes\OneDrive\Desktop\efs_vms_2.0\backend\efs_vms_chatbot\.env")

# from agents.orchestrator import OrchestratorAgent
# from models.state import AgentState

# async def test_routing(query, room="Governance"):
#     orchestrator = OrchestratorAgent()
    
#     state: AgentState = {
#         "session_id": "test_session",
#         "user_id": "test_user",
#         "access_token": "test_token",
#         "room_location": room,
#         "messages": [{"role": "user", "content": query}],
#         "current_query": query,
#         "next_agent": "orchestrator",
#         "intent": None,
#         "tool_calls": [],
#         "tool_results": [],
#         "api_data": {},
#         "final_response": None,
#         "error": None,
#         "timestamp": datetime.now(),
#         "conversation_history": []
#     }
    
#     print(f"\nTesting Query: '{query}' in Room: '{room}'")
#     result = await orchestrator.process(state)
#     print(f"Result Intent: {result['intent']}")
#     print(f"Result Next Agent: {result['next_agent']}")
#     print(f"Reasoning: {result.get('conversation_history', [{}])[-1].get('decision', {}).get('reasoning')}")

# if __name__ == "__main__":
#     queries = [
#         "Can I extend the parking space booking?",
#         "My visitor hasn’t received the OTP/pass — can you resend it?",
#         "My visitor hasn't received the OTP/pass - can you resend it?" # with standard quote and hyphen
#     ]
    
#     for q in queries:
#         asyncio.run(test_routing(q))

import httpx
import asyncio
import json

RAG_URL = "https://vms2.0.haloocom.in/rag/ask"

async def test_rag(query, source):
    payload = {
        "input": query,
        "session_id": "repro-session",
        "source": source,
        "history": []
    }
    print(f"\nTesting Query: '{query}' with Source: '{source}'")
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(RAG_URL, json=payload)
            response.raise_for_status()
            data = response.json()
            answer = data.get("answer", "NO ANSWER KEY")
            print(f"Response Status: {response.status_code}")
            print(f"Answer: {answer[:200]}...")
            return answer
    except Exception as e:
        print(f"Error: {e}")
        return None

async def main():
    query = "how to register a visitor"
    
    # Test with 'governance' (Common default)
    await test_rag(query, "governance")
    
    # Test with 'transformation' (FAQAgent default)
    await test_rag(query, "transformation")
    
    # Test with 'general' (Category in JSON)
    await test_rag(query, "general")

if __name__ == "__main__":
    asyncio.run(main())
