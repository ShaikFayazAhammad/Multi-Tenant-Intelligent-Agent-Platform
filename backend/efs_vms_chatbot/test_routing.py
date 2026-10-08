import sys
import os
import asyncio
from datetime import datetime

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from graph.workflow import create_workflow
from models.state import AgentState

async def run_routing_test(query: str, session_id: str):
    print(f"\nTesting Query: '{query}'")
    print("-" * 50)
    
    workflow = create_workflow()
    
    state = {
        "session_id": session_id,
        "user_id": "test-user-001",
        "user_email": "test@haloocom.com",
        "access_token": "",
        "room_location": "Reception",
        "messages": [{"role": "user", "content": query}],
        "current_query": query,
        "next_agent": "orchestrator",
        "intent": None,
        "tool_calls": [],
        "tool_results": [],
        "api_data": {},
        "final_response": None,
        "error": None,
        "timestamp": datetime.now(),
        "conversation_history": [],
    }
    
    try:
        result = await workflow.ainvoke(state)
        history = result.get("conversation_history", [])
        agents_used = [h.get("agent") for h in history]
        print(f"Result Status:")
        print(f"  - Intent identified: {result.get('intent')}")
        print(f"  - Next agent: {result.get('next_agent')}")
        print(f"  - Agents involved: {agents_used}")
        print(f"  - Final Response: {result.get('final_response')}")
        if result.get("error"):
            print(f"  - Error encountered: {result.get('error')}")
    except Exception as e:
        print(f"Exception during test: {e}")
        import traceback
        traceback.print_exc()

async def main():
    print("Starting Routing and Integration Tests...")
    print("=" * 60)
    
    # Test Case 1: Wifi (API Agent)
    await run_routing_test("What is the guest wifi password?", "session-wifi-test")
    
    # Test Case 2: Visitor Policy (RAG/FAQ Agent)
    await run_routing_test("How do I register a visitor?", "session-visitor-test")
    
    # Test Case 3: FD Rates (RAG/FAQ Agent - Banking)
    await run_routing_test("What are the current FD interest rates?", "session-fd-test")

if __name__ == "__main__":
    asyncio.run(main())
