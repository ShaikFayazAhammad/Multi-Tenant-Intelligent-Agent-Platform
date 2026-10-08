import os
import re
import requests
from app.core.config import settings

def clean_text_for_tts(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r'https?://\S+|www\.\S+', '', text)
    text = re.sub(r'[\U00010000-\U0010ffff]', '', text)
    text = re.sub(r'\*', '', text)
    return text.strip()

def text_to_speech(text: str) -> bytes:
    cleaned = clean_text_for_tts(text)
    api_key = settings.ELEVENLABS_API_KEY
    voice_id = settings.ELEVENLABS_VOICE_ID

    if not api_key:
        # Generate dummy 1-second silent MP3 audio bytes if no API key is present locally
        return b'\xFF\xFB\x90\x00' + b'\x00' * 500

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": api_key
    }
    data = {
        "text": cleaned,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {"stability": 0.8, "similarity_boost": 0.8}
    }
    try:
        resp = requests.post(url, json=data, headers=headers, timeout=5.0)
        resp.raise_for_status()
        return resp.content
    except Exception:
        return b'\xFF\xFB\x90\x00' + b'\x00' * 500
