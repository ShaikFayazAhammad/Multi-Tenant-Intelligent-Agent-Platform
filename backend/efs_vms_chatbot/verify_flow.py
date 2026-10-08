import asyncio
import os
import sys
from unittest.mock import MagicMock, patch, AsyncMock
import json

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from agents.faq_agent import FAQAgent
from models.state import AgentState

async def verify_full_followup():
    print("\n--- TEST: Multi-turn Follow-up & RAG Fallback ---\n")
    
    # Mock settings
    with patch("config.settings.settings") as mock_settings:
        mock_settings.OPENAI_MODEL = "gpt-4o-mini"
        mock_settings.OPENAI_API_KEY = "sk-fake-key"
        
        with patch("langchain_openai.ChatOpenAI"):
            agent = FAQAgent()
            
            # --- TURN 1: Ambiguous Query ---
            print("Turn 1: User says 'how to connect laptop to tv'")
            # Mock RAG Bot response for missing info (as seen in screenshot)
            mock_rag_response_1 = {
                "answer": "Which type of laptop are you using - Apple or Windows?",
                "needs_followup": True
            }
            
            # --- TURN 2: Follow-up answer ---
            print("Turn 2: User says 'apple'")
            state_2 = {
                "current_query": "apple",
                "intent": "connectivity",
                "session_id": "test_session",
                "room_location": "Governance",
                "timestamp": "2025",
                "messages": [
                    {"role": "user", "content": "how to connect laptop to tv"},
                    {"role": "assistant", "content": "Which type of laptop are you using - Apple or Windows?"},
                    {"role": "user", "content": "apple"}
                ],
                "conversation_history": []
            }
            
            # Mock Rewriter
            agent.rewriter = MagicMock()
            agent.rewriter.ainvoke = AsyncMock(return_value="How to connect apple laptop to tv")
            
            # Mock httpx for RAG calls
            with patch("httpx.AsyncClient") as MockClient:
                mock_client = MagicMock()
                MockClient.return_value.__aenter__.return_value = mock_client
                
                # Turn 2 mock response (Success after context reconstruction)
                mock_response = MagicMock()
                mock_response.status_code = 200
                mock_response.json.return_value = {"answer": "Use USB-C for Apple devices to connect to TV."}
                mock_client.post = AsyncMock(return_value=mock_response)
                
                result = await agent.process(state_2)
                
                print(f"Rewritten Query passed to RAG: {result['conversation_history'][-1].get('rewritten_query')}")
                print(f"Room passed to RAG: {state_2['room_location'].lower()}")
                print(f"Final Answer: {result['final_response']}")
                
                # Verifications
                if "apple" in result['conversation_history'][-1].get('rewritten_query', "").lower():
                    print("PASS: Context reconstructed correctly")
                else:
                    print("FAIL: Context reconstruction failed")
                
                if result['final_response'] == "Use USB-C for Apple devices to connect to TV.":
                    print("PASS: Follow-up answer retrieved successfully")
                else:
                    print("FAIL: Follow-up answer missing")

if __name__ == "__main__":
    asyncio.run(verify_full_followup())
