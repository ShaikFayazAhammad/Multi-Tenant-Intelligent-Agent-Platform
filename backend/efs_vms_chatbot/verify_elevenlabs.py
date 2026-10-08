import os
import requests
from dotenv import load_dotenv

load_dotenv()

def verify_elevenlabs():
    api_key = os.getenv("ELEVENLABS_API_KEY", "").strip()
    voice_id = os.getenv("ELEVENLABS_VOICE_ID", "eMZSaad4tZC98eLRlyKT").strip()

    print(f"--- ElevenLabs Diagnostic ---")
    print(f"API Key Length: {len(api_key)}")
    if api_key:
        print(f"API Key (masked): {api_key[:4]}...{api_key[-4:]}")
    else:
        print("❌ API Key is MISSING in .env")
        return

    print(f"Voice ID: {voice_id}")

    # Step 1: Check User Info (easiest way to verify Key)
    print("\n1. Verifying API Key with /v1/user...")
    user_url = "https://api.elevenlabs.io/v1/user"
    headers = {"xi-api-key": api_key}
    
    try:
        response = requests.get(user_url, headers=headers)
        if response.status_code == 200:
            user_data = response.json()
            print("✅ API Key is VALID!")
            print(f"Subscription tier: {user_data.get('subscription', {}).get('tier')}")
            print(f"Character count: {user_data.get('subscription', {}).get('character_count')}/{user_data.get('subscription', {}).get('character_limit')}")
        else:
            print(f"❌ API Key is INVALID (401 Unauthorized)")
            print(f"Response: {response.text}")
            return
    except Exception as e:
        print(f"❌ Connection failed: {str(e)}")
        return

    # Step 2: Check Voice Access
    print("\n2. Checking Voice ID access...")
    voices_url = "https://api.elevenlabs.io/v1/voices"
    try:
        response = requests.get(voices_url, headers=headers)
        if response.status_code == 200:
            voices = response.json().get("voices", [])
            voice_ids = [v["voice_id"] for v in voices]
            if voice_id in voice_ids:
                print(f"✅ Voice ID '{voice_id}' is available.")
            else:
                print(f"⚠️ Voice ID '{voice_id}' not found in your account.")
                print(f"Available IDs: {voice_ids[:5]}...")
        else:
            print(f"❌ Failed to list voices: {response.status_code}")
    except Exception as e:
        print(f"❌ Failed to check voices: {str(e)}")

if __name__ == "__main__":
    verify_elevenlabs()
