import asyncio
import os
import sys
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.models import Project
from app.orchestrator.dynamic_graph import DynamicOrchestrator

async def run_test():
    db = SessionLocal()
    try:
        proj = db.query(Project).filter(Project.id == "84953258-00c3-4c7d-8122-c021e7893d7f").first()
        orchestrator = DynamicOrchestrator(project_id=proj.id, db=db)

        # Turn 1
        print("=== TURN 1 (Warm cache) ===")
        start_time = time.time()
        first_token_time = None
        async for chunk in orchestrator.process_turn_stream(user_query="What is Ibrahim Patel's account status?", is_playground=True):
            if chunk["type"] == "token":
                if first_token_time is None:
                    first_token_time = round((time.time() - start_time) * 1000, 2)
                    print(f"TTFT: {first_token_time} ms | Text: ", end="", flush=True)
                sys.stdout.write(chunk["payload"])
                sys.stdout.flush()
        print(f"\nTotal Turn 1: {round((time.time() - start_time) * 1000, 2)} ms\n")

        # Turn 2
        print("=== TURN 2 ===")
        start_time = time.time()
        first_token_time = None
        async for chunk in orchestrator.process_turn_stream(user_query="What city is Rohan Gupta in?", is_playground=True):
            if chunk["type"] == "token":
                if first_token_time is None:
                    first_token_time = round((time.time() - start_time) * 1000, 2)
                    print(f"TTFT: {first_token_time} ms | Text: ", end="", flush=True)
                sys.stdout.write(chunk["payload"])
                sys.stdout.flush()
        print(f"\nTotal Turn 2: {round((time.time() - start_time) * 1000, 2)} ms\n")

    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(run_test())
