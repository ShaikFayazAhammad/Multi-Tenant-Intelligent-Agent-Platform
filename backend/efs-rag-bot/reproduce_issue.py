import sys
import os

from pathlib import Path
import base64

# Add project root to sys.path
root_path = Path(__file__).parent
if str(root_path) not in sys.path:
    sys.path.append(str(root_path))


from dotenv import load_dotenv
load_dotenv()

from graph.nodes import canonical_mapper, retrieve, generate

def test_question(question, room="General"):
    print(f"\n--- Testing: '{question}' (Room: {room}) ---")
    state = {
        'question': question,
        'room': room,
        'conversation_history': []
    }
    
    # Map to canonical
    print("Mapping to canonical...")
    canonical_result = canonical_mapper(state)
    state['canonical_question'] = canonical_result.get('canonical_question', question)
    print(f"Canonical: {state['canonical_question']}")
    
    # Update question for retrieval
    state['question'] = state['canonical_question']
    
    # Retrieve
    print("Retrieving...")
    retrieve_result = retrieve(state)
    docs = retrieve_result.get('docs', [])
    state['docs'] = docs
    print(f"Retrieved {len(docs)} documents")
    if docs:
        for i, doc in enumerate(docs):
            safe_doc = doc.encode('ascii', 'replace').decode('ascii')
            print(f"Doc {i+1}: {safe_doc[:200]}...")
            print("-" * 20)
    
    # Generate answer
    print("Generating answer...")
    answer_result = generate(state)
    print(f"Answer:\n{answer_result['answer']}")

if __name__ == "__main__":
    # Case 1: User's exact string with space in "hasn 't"
    test_question("My visitor hasn 't received the OTP/pass — can you resend it")
    
    # Case 2: User's exact string for parking
    test_question("Can I extend the parking space booking?")
