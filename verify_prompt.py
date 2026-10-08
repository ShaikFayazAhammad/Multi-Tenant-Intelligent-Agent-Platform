import os
import sys
import asyncio
from typing import List, Dict

# Mock keys
os.environ["OPENAI_API_KEY"] = "sk-mock-key-for-testing-12345"

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "backend", "efs_vms_chatbot")))

from agents.api_agent import APIAgent
from models.state import AgentState

async def simulate_conversation():
    print("\n--- Simulating Conversation for Context Retention ---\n")
    
    # Initialize Agent
    agent = APIAgent(user_id="test_user", session_id="test_session")
    
    # Mock State
    state = {
        "current_query": "",
        "room_location": "Reception",
        "user_id": "test_user",
        "session_id": "test_session",
        "messages": [],
        "conversation_history": [],
        "timestamp": "2026-01-23T11:00:00"
    }

    # Turn 1: User asks to book (without date)
    print("User: I want to book a meeting room")
    state["current_query"] = "I want to book a meeting room"
    # Agent should ask for date
    # Note: We can't easily run the full agent with LLM locally without a real key/mock LLM.
    # This script is limited because I cannot invoke the actual LLM.
    # However, I can verify the System Prompt was updated correctly in the file.
    
    print("\n[NOTE] Cannot execute LLM locally. Verifying System Prompt content...")
    
    if "Always look at the **Conversation History**" in agent.system_prompt:
        print("[OK] System Prompt contains 'Conversation History' instruction.")
    else:
        print("[FAIL] System Prompt missing 'Conversation History' instruction.")
        
    if "RETRIEVE DATE/TIME" in agent.system_prompt:
         print("[OK] System Prompt contains 'RETRIEVE DATE/TIME' instruction.")
    else:
         print("[FAIL] System Prompt missing 'RETRIEVE DATE/TIME' instruction.")

    if "For how many hours" in agent.system_prompt:
         print("[OK] System Prompt contains duration question instruction.")
    else:
         print("[FAIL] System Prompt missing duration question instruction.")

if __name__ == "__main__":
    asyncio.run(simulate_conversation())

