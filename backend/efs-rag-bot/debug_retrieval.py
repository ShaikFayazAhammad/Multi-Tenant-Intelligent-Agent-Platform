import os
import sys
from dotenv import load_dotenv

# Path setup
sys.path.append(r"c:\Users\rakes\OneDrive\Desktop\efs_vms_2.0\backend\efs-rag-bot")

load_dotenv()

from graph.nodes import canonical_mapper, retrieve, generate, build_full_question
from graph.state import RAGState

def test_rag_fixes():
    print("--- DEBUG: RAG Retrieval Test ---\n")
    
    test_cases = [
        {
            "question": "The AC in the meeting room isn't working how to switch it on",
            "room": "General"
        },
        {
            "question": "My visitor hasn ’t received the OTP/pass — can you resend it",
            "room": "General"
        }
    ]

    for case in test_cases:
        print(f"\nTesting: '{case['question']}' (Room: {case['room']})")
        
        state = {
            "question": case["question"],
            "room": case["room"],
            "conversation_history": []
        }
        
        # Step A: Build full question
        full_q = build_full_question(state)
        # print(f"Step A: Full Question: '{full_q}'")
        state["question"] = full_q
        
        # Step B: Canonical Mapper
        mapper_result = canonical_mapper(state)
        canonical = mapper_result["canonical_question"]
        print(f"  -> Mapped directly to: '{canonical}'")
        state["question"] = canonical
        
        # Step C: Retrieval
        retrieve_result = retrieve(state)
        docs = retrieve_result["docs"]
        print(f"  -> Retrieved {len(docs)} docs")
        
        if docs:
            print(f"  -> Top Content: {docs[0][:150]}...")
            
            # Step D: Generation
            gen_result = generate(state | {"docs": docs})
            print(f"  -> Generated Answer: {gen_result['answer']}\n")
        else:
            print("  -> FAIL: No documents found!\n")

if __name__ == "__main__":
    test_rag_fixes()
