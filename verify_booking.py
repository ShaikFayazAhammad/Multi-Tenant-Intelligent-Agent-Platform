import threading
import time
import sys
import os

# Mock OpenAI Key for testing to bypass Pydantic validation
os.environ["OPENAI_API_KEY"] = "sk-mock-key-for-testing-12345"
os.environ["API_BASE_URL"] = "http://localhost:5000"

import requests
import asyncio
from datetime import datetime, timedelta
import contextlib

# Add backend path to sys.path to import modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "backend", "efs_vms_chatbot")))

# Import the mock server app
from mock_api_server import app

# Import tools
from tools.meeting_room_tools import DateValidationTool, CheckMeetingRoomAvailabilityTool, BookMeetingRoomTool

def run_server():
    app.run(port=5000, use_reloader=False)

def test_tools():
    print("\n--- Starting Verification ---")
    
    # 1. Test Date Validation
    print("\n[1] Testing Date Validation...")
    validator = DateValidationTool()
    
    # Test valid date (dynamic future date)
    future_date = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
    res = validator._run(date=future_date)
    print(f"Valid date ({future_date}): {res['valid']} (Expected: True)")
    
    # Test passed date (assuming today is after 2020-01-01)
    past_date = "2020-01-01"
    res = validator._run(date=past_date)
    print(f"Past date ({past_date}): {res['valid']} (Expected: False)")

    # 2. Test Availability Check
    print("\n[2] Testing Availability Check...")
    checker = CheckMeetingRoomAvailabilityTool()
    try:
        res = checker._run(date=future_date, space_type_id=2120)
        print(f"Availability Status: {res.get('success')}")
        print(f"Rooms Found: {res.get('count')}")
        if res.get('success') and res.get('rooms'):
            print("First room:", res['rooms'][0]['name'])
    except Exception as e:
        print(f"Availability check failed: {e}")

    # 3. Test Booking
    print("\n[3] Testing Booking...")
    booker = BookMeetingRoomTool()
    try:
        res = booker._run(
            space_id="57315",
            space_name="Diversity",
            location_id="41035",
            floor_id="2643",
            space_type_id=2120,
            date=future_date,
            start_time="14:00",
            end_time="15:00",
            title="Test Meeting"
        )
        print(f"Booking Status: {res.get('success')}")
        print(f"Message: {res.get('message')}")
    except Exception as e:
        print(f"Booking failed: {e}")

if __name__ == "__main__":
    # Start server in thread
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    
    # Give server a moment to start
    time.sleep(2)
    
    try:
        test_tools()
    finally:
        print("\n--- Verification Complete ---")
        # Thread will die when main process exits
