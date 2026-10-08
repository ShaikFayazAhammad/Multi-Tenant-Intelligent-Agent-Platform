import os
import sys
from pathlib import Path

# Add project root to sys.path
root_path = Path(__file__).parent
if str(root_path) not in sys.path:
    sys.path.append(str(root_path))
from graph.graph import app
from dotenv import load_dotenv
import os
load_dotenv()

# Optional sanity check
if not os.getenv("OPENAI_API_KEY"):
    raise RuntimeError("OPENAI_API_KEY not found in environment")
while True:
    q = input("Ask a question: ")
    room = input("Room name: ")

    result = app.invoke({
        "question": q,
        "room": room
    })

    print("\nAnswer:\n", result["answer"])
