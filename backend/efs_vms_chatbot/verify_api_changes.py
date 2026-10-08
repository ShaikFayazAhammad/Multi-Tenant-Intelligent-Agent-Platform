import urllib.request
import urllib.parse
import json
import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get Mock API base URL from environment, fallback to localhost:5000
BASE_URL = os.getenv("MOCK_API_BASE_URL", "http://localhost:5000")

def make_request(endpoint, payload):
    url = f"{BASE_URL}{endpoint}"
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as response:
            status_code = response.getcode()
            response_body = response.read().decode('utf-8')
            return status_code, json.loads(response_body)
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode('utf-8'))
    except Exception as e:
        return None, str(e)

def test_create_notification():
    print("\n--- Testing /notification/create ---")
    payload = {
        "title": "Test Notif",
        "message": "This is a test",
        "type": "Info",
        "to": "All"
    }
    status, response = make_request("/notification/create", payload)
    print(f"Status Code: {status}")
    print("Response:", json.dumps(response, indent=2))

def test_book_room():
    print("\n--- Testing /iwaa-workspaces/bookings ---")
    payload = {
        "room_id": "123",
        "start_time": "2025-01-01T10:00:00",
        "end_time": "2025-01-01T11:00:00"
    }
    status, response = make_request("/iwaa-workspaces/bookings", payload)
    print(f"Status Code: {status}")
    print("Response:", json.dumps(response, indent=2))

def test_validate_booking():
    print("\n--- Testing /iwaa-workspaces/validate-booking ---")
    
    # Test Past Date
    past_date = (datetime.datetime.utcnow() - datetime.timedelta(days=1)).isoformat()
    print(f"Testing Past Date: {past_date}")
    status, response = make_request("/iwaa-workspaces/validate-booking", {"date": past_date})
    print(f"Status Code: {status}")
    print("Response:", json.dumps(response, indent=2))

    # Test Future Date
    future_date = (datetime.datetime.utcnow() + datetime.timedelta(days=1)).isoformat()
    print(f"Testing Future Date: {future_date}")
    status, response = make_request("/iwaa-workspaces/validate-booking", {"date": future_date})
    print(f"Status Code: {status}")
    print("Response:", json.dumps(response, indent=2))

if __name__ == "__main__":
    test_create_notification()
    test_book_room()
    test_validate_booking()
