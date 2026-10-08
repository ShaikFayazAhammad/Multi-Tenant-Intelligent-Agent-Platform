# from langgraph.graph import StateGraph
# from graph.state import RAGState
# from graph.nodes import rewrite_query, retrieve, generate

# graph = StateGraph(RAGState)
# graph.add_node("rewrite", rewrite_query)
# graph.add_node("retrieve", retrieve)
# graph.add_node("generate", generate)

# graph.set_entry_point("rewrite")
# graph.add_edge("rewrite", "retrieve")
# graph.add_edge("retrieve", "generate")

# app = graph.compile()


# graph/graph.py
from langgraph.graph import StateGraph, END
from graph.state import RAGState
from graph.nodes import (
    detect_intent,
    detect_missing_info,
    generate_followup,
    canonical_mapper,
    rewrite_query,
    retrieve,
    generate
)

# ----------- Conditional Edge Functions -----------

def should_generate_followup(state: RAGState) -> str:
    """
    Decide if we need to ask a follow-up question.
    """
    if not state.get("is_complete", True):
        if state.get("confidence") in ["high", "medium"]:
            return "generate_followup"
    
    return "canonical_mapper"


def after_followup(state: RAGState) -> str:
    """
    After generating follow-up, decide whether to end or continue.
    """
    if state.get("needs_followup", False):
        return END
    return "canonical_mapper"


# ----------- Build the Graph -----------

def build_graph():
    """
    Constructs the LangGraph workflow.
    """
    workflow = StateGraph(RAGState)
    
    # Add all nodes
    workflow.add_node("detect_intent", detect_intent)
    workflow.add_node("detect_missing_info", detect_missing_info)
    workflow.add_node("generate_followup", generate_followup)
    workflow.add_node("canonical_mapper", canonical_mapper)
    workflow.add_node("rewrite", rewrite_query)
    workflow.add_node("retrieve", retrieve)
    workflow.add_node("generate", generate)
    
    # Set entry point
    workflow.set_entry_point("detect_intent")
    
    # Build the flow
    workflow.add_edge("detect_intent", "detect_missing_info")
    
    # Conditional: Check if we need follow-up
    workflow.add_conditional_edges(
        "detect_missing_info",
        should_generate_followup,
        {
            "generate_followup": "generate_followup",
            "canonical_mapper": "canonical_mapper"
        }
    )
    
    # After generating follow-up, decide to end or continue
    workflow.add_conditional_edges(
        "generate_followup",
        after_followup,
        {
            END: END,
            "canonical_mapper": "canonical_mapper"
        }
    )
    
    # Normal flow for complete questions
    workflow.add_edge("canonical_mapper", "rewrite")
    workflow.add_edge("rewrite", "retrieve")
    workflow.add_edge("retrieve", "generate")
    workflow.add_edge("generate", END)
    
    return workflow.compile()


# Compile the graph once
app = build_graph()


# ----------- Wrapper Function for API Usage -----------

def invoke_graph(question: str, room: str = "general", conversation_history: list = None) -> dict:
    """
    Wrapper function to invoke the compiled graph.
    This is what the API should call.
    
    Args:
        question: User's question
        room: Meeting room name
        conversation_history: List of previous messages
    
    Returns:
        dict with answer, needs_followup, canonical_question
    """
    try:
        conv_history = conversation_history or []
        
        print(f"\n{'='*60}")
        print(f"🔄 Processing: '{question}'")
        print(f"🏢 Room: {room}")
        print(f"💬 History: {len(conv_history)} messages")
        print(f"{'='*60}")
        
        # Invoke the graph
        result = app.invoke({
            "question": question,
            "room": room,
            "conversation_history": conv_history
        })
        
        # Handle follow-up case
        if result.get("needs_followup", False):
            print(f"❓ Follow-up needed")
            return {
                "answer": result.get("followup_question", result.get("answer", "I need more information.")),
                "needs_followup": True,
                "canonical_question": None
            }
        
        # Normal answer case
        print(f"✅ Answer ready")
        return {
            "answer": result.get("answer", "I couldn't find an answer."),
            "needs_followup": False,
            "canonical_question": result.get("canonical_question")
        }
        
    except Exception as e:
        print(f"❌ Error in graph execution: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return {
            "answer": "I encountered an error processing your question. Please try again.",
            "needs_followup": False,
            "canonical_question": None,
            "error": str(e)
        }


# ----------- Testing Function -----------

if __name__ == "__main__":
    print("🧪 Testing Graph\n")
    
    # Test 1: Incomplete question
    print("=" * 60)
    print("Test 1: Incomplete question")
    result1 = invoke_graph("how to connect apple laptop", room="Diversity")
    print(f"\nResult: {result1['answer']}")
    print(f"Needs follow-up: {result1['needs_followup']}\n")
    
    # Test 2: With conversation history
    print("=" * 60)
    print("Test 2: With conversation history")
    history = [
        {"role": "user", "content": "how to connect apple laptop"},
        {"role": "assistant", "content": "Which device?"}
    ]
    result2 = invoke_graph("to tv screen", room="Diversity", conversation_history=history)
    print(f"\nResult: {result2['answer'][:200]}...")
    print(f"Needs follow-up: {result2['needs_followup']}\n")
    
    # Test 3: Complete question
    print("=" * 60)
    print("Test 3: Complete question")
    result3 = invoke_graph("how to connect apple laptop to tv", room="Diversity")
    print(f"\nResult: {result3['answer'][:200]}...")
    print(f"Needs follow-up: {result3['needs_followup']}")
