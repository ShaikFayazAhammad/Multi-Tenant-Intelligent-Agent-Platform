import sys
import os
import asyncio
from unittest.mock import MagicMock, patch
import json

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from graph.workflow import create_workflow
from models.state import AgentState
from datetime import datetime

async def run_verification():
    print("Starting Verification of Orchestrator Integration")
    print("="*60)
    
    # Mock ChatOpenAI before creating workflow to avoid init issues
    with patch("agents.base_agent.ChatOpenAI") as MockLLM:
        # Check if ChatOpenAI is instantiated
        mock_instance = MockLLM.return_value
        
        # Setup mock responses for ainvoke
        async def side_effect(*args, **kwargs):
            # Inspect the input to decide response
            # args[0] is usually the list of messages or prompt value
            input_text = str(args)
            
            response = MagicMock()
            if "guest wifi" in input_text.lower():
                content = json.dumps({
                    "intent": "wifi",
                    "requires_api": True,
                    "next_agent": "api_agent",
                    "reasoning": "User asking for wifi credentials"
                })
            elif "visitor" in input_text.lower():
                content = json.dumps({
                    "intent": "visitor",
                    "requires_api": False,
                    "next_agent": "faq_agent",
                    "reasoning": "User asking visitor policy FAQ"
                })
            else:
                content = json.dumps({
                    "intent": "unknown",
                    "requires_api": False,
                    "next_agent": "faq_agent",
                    "reasoning": "Fallback"
                })
            
            response.content = content
            return response
            
        mock_instance.ainvoke.side_effect = side_effect

        workflow = create_workflow()
        
        # Test Case 1: API Agent Routing (e.g., WiFi)
        print("\n[1] Test Case: Query for WiFi Credentials")
        state_wifi = {
            "current_query": "What is the guest wifi password?",
            "room_location": "Reception",
            "session_id": "test-session-1",
            "conversation_history": [],
            "timestamp": datetime.now()
        }
        
        try:
            # We also mock API agent process if it tries to hit real endpoints?
            # API Agent usually calls tools. If tools are real, they might fail.
            # But let's see if we can get through routing first.
            
            # Using patch on APIAgent.process might be safer if we want to isolate routing
            with patch("agents.api_agent.APIAgent.process") as mock_api_process:
                mock_api_process.return_value = {"final_response": "Mocked API Response", "conversation_history": [{"agent": "api_agent"}]}
                mock_api_process.side_effect = lambda state: {**state, "conversation_history": state["conversation_history"] + [{"agent": "api_agent"}]}
                
                result = await workflow.ainvoke(state_wifi)
                
                # Check if it went through api_agent
                history = result.get("conversation_history", [])
                agents_used = [h.get("agent") for h in history]
                print(f"   Agents involved: {agents_used}")
                if "api_agent" in agents_used or result.get("intent") == "wifi":
                     print("    SUCCESS: Routed to API Agent")
                else:
                     print(f"    FAILURE: Unexpected routing. Intent: {result.get('intent')}")
                 
        except Exception as e:
            print(f"    Error: {e}")
            import traceback
            traceback.print_exc()

        # Test Case 2: FAQ Agent Routing (e.g., Visitor Policy)
        print("\n[2] Test Case: Query for Visitor Policy (FAQ)")
        state_faq = {
            "current_query": "How do I register a visitor?",
            "room_location": "Reception",
            "session_id": "test-session-2",
            "conversation_history": [],
            "timestamp": datetime.now()
        }
        
        # Mock httpx to intercept RAG call
        with patch("httpx.AsyncClient.post") as mock_post:
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {"answer": "You can register visitors at the front desk tablet."}
            mock_post.return_value = mock_response
            
            try:
                result = await workflow.ainvoke(state_faq)
                history = result.get("conversation_history", [])
                agents_used = [h.get("agent") for h in history]
                print(f"   Agents involved: {agents_used}")
                
                if "faq_agent" in agents_used:
                     print("    SUCCESS: Routed to FAQ Agent")
                     print(f"   Response: {result.get('final_response')}")
                else:
                     print(f"    FAILURE: Unexpected routing. Intent: {result.get('intent')}")
                     
            except Exception as e:
                print(f"    Error: {e}")
                import traceback
                traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(run_verification())
