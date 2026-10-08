import os
import requests
import re
import json
import base64
import asyncio
import websockets
from dotenv import load_dotenv

load_dotenv()

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY").strip()
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "eMZSaad4tZC98eLRlyKT").strip()


def clean_text_for_tts(text: str) -> str:
    """
    Clean text before sending to TTS.
    - Removes asterisks and special formatting.
    - Skips URLs entirely.
    - Spells out phone numbers digit by digit.
    - Normalizes email addresses (e.g., 'at' and 'dot').
    """
    if not text:
        return text
    
    # 1. Remove URLs entirely (web and local file paths)
    # Matches http/https or www. followed by non-whitespace
    text = re.sub(r'https?://\S+|www\.\S+', '', text)
    # Matches file:/// or C:\ style paths
    text = re.sub(r'file://\S+', '', text)
    text = re.sub(r'\b[a-zA-Z]:\\[^\s]+', '', text)
    
    # Remove emojis (Matches common emoji ranges and supplementary characters)
    text = re.sub(r'[\U00010000-\U0010ffff]', '', text)
    
    # 2. Clean up asterisks, markdown bullets, and multiple spaces
    text = re.sub(r'\*', '', text)
    # Remove leading dashes/bullets used in markdown lists
    text = re.sub(r'(^|\n)\s*-\s+', r'\1', text)
    
    # 3. Handle Phone Numbers: +971 50... -> plus nine seven one, five zero...
    # Matches patterns like +91 7980555555, (050) 123 4567, etc.
    # Include parentheses in the allowed characters
    def spell_digits(match):
        digits = match.group(0)
        # Clean up separators (including parens) to get raw number
        clean_digits = re.sub(r'[-\s.()]', '', digits)
        
        # Only spell out if it looks like a phone number (>= 7 digits)
        if len(clean_digits) >= 7:
            digit_map = {
                '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four',
                '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine',
                '+': 'plus'
            }
            
            # Convert to words
            words = [digit_map[char] for char in clean_digits if char in digit_map]
            
            # Use simple comma separation for clear, distinct pronunciation
            # Removing grouping as it can sometimes confuse the rhythm
            return " " + ", ".join(words) + " "
            
        return digits

    text = re.sub(r'\+?\(?\d[\d\s.()-]{6,}\d', spell_digits, text)
    
    # 4. Handle Emails: name@domain.com -> name at d o m a i n dot com
    def normalize_email(match):
        email_str = match.group(0)
        parts = email_str.split('@')
        if len(parts) == 2:
            name, domain = parts
            
            # Name part: replace dot with "dot"
            name_spoken = name.replace('.', ' dot ')
            
            # Domain part: spell out letters (e.g., efsme -> e f s m e)
            domain_parts = domain.rsplit('.', 1)
            if len(domain_parts) == 2:
                dom_name, tld = domain_parts
                # Spell out domain name chars with spaces
                dom_spoken = " ".join(list(dom_name))
                # Keep TLD as word (dot com)
                tld_spoken = "dot " + tld
                
                domain_spoken = f"{dom_spoken} {tld_spoken}"
            else:
                # Fallback
                domain_spoken = " ".join(list(domain)).replace('.', ' dot ')
            
            return f"{name_spoken} at {domain_spoken}"
            
        return email_str.replace('@', ' at ').replace('.', ' dot ')
    
    text = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', normalize_email, text)

    # 5. Handle serial numbers and pauses (existing logic)
    text = re.sub(r'\s+(\d+)[.,]\s+', '. ', text)
    text = re.sub(r'^(\d+)[.,]\s+', '', text)
    
    # Ensure there's a period at the end if the text ends with an option
    if text and not text.rstrip().endswith(('.', '!', '?', ':', ';')):
        if re.search(r'\w\s*$', text):
            text = text.rstrip() + '.'
    
    # Clean up multiple spaces and consecutive periods
    text = re.sub(r'\.\s*\.\s*', '. ', text)
    text = re.sub(r'\.\s{2,}', '. ', text)
    text = re.sub(r'[ \t]+', ' ', text)
    
    return text.strip()


def text_to_speech(text: str) -> bytes:
    """
    Convert text to speech using ElevenLabs API (Blocking).
    
    Args:
        text: The text to convert to speech
        
    Returns:
        Audio bytes in MP3 format
        
    Raises:
        Exception: If API call fails
    """
    if not ELEVENLABS_API_KEY:
        raise ValueError("ELEVENLABS_API_KEY not found in environment")
    
    # Clean text before sending to TTS
    cleaned_text = clean_text_for_tts(text)
    
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}"
    
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY
    }
    
    data = {
        "text": cleaned_text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.8,
            "similarity_boost": 0.8
        }
    }
    
    try:
        response = requests.post(url, json=data, headers=headers)
        response.raise_for_status()
        return response.content
    except requests.exceptions.RequestException as e:
        print(f"❌ ElevenLabs API Error: {str(e)}")
        if e.response is not None:
            print(f"Response: {e.response.text}")
        raise Exception(f"Failed to generate speech: {str(e)}")


async def stream_text_to_speech(text_iterator):
    """
    Stream text to ElevenLabs using WebSockets and yield audio chunks.
    
    Args:
        text_iterator: An async iterator of text chunks (tokens)
        
    Yields:
        Base64 encoded audio chunks
    """
    if not ELEVENLABS_API_KEY:
        raise ValueError("ELEVENLABS_API_KEY not found in environment")

    uri = f"wss://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}/stream-input?model_id=eleven_flash_v2_5"

    async with websockets.connect(uri) as websocket:
        # Send initial configuration
        await websocket.send(json.dumps({
            "text": " ", # Initial blank to start the stream
            "voice_settings": {"stability": 0.8, "similarity_boost": 0.8},
            "xi_api_key": ELEVENLABS_API_KEY,
        }))

        async def listen():
            """Listen for audio chunks from ElevenLabs"""
            try:
                while True:
                    response = await websocket.recv()
                    data = json.loads(response)
                    
                    if data.get("audio"):
                        yield data["audio"]
                    
                    if data.get("isFinal"):
                        break
            except websockets.exceptions.ConnectionClosed:
                pass

        # Task to consume text and send to websocket
        async def send_text():
            buffer = ""
            async for text in text_iterator:
                if text:
                    buffer += text
                    
                    # Regex to find a safe split point: newline OR sentence ending punctuation followed by space
                    # Pattern: (\n|(?<=[.!?])\s)
                    search_pat = r'(\n|(?<=[.!?])\s)'
                    
                    while True:
                        match = re.search(search_pat, buffer)
                        if match:
                            split_idx = match.end() # Split after the separator
                            chunk = buffer[:split_idx]
                            buffer = buffer[split_idx:]
                            
                            cleaned = clean_text_for_tts(chunk)
                            if cleaned:
                                await websocket.send(json.dumps({"text": cleaned + " ", "try_trigger_generation": True}))
                        else:
                            break
            
            # Send remaining buffer
            if buffer:
                cleaned = clean_text_for_tts(buffer)
                if cleaned:
                    await websocket.send(json.dumps({"text": cleaned, "try_trigger_generation": True}))

            # Send end of stream message
            await websocket.send(json.dumps({"text": ""}))

        # Run listener and sender concurrently
        send_task = asyncio.create_task(send_text())
        
        async for audio_chunk in listen():
            yield audio_chunk
            
        await send_task


if __name__ == "__main__":
    # Test block
    test_text = "Hello, I am testing the ElevenLabs text to speech integration."
    print(f"Testing TTS with text: '{test_text}'")
    try:
        audio = text_to_speech(test_text)
        with open("test_audio.mp3", "wb") as f:
            f.write(audio)
        print("✅ Test successful! Audio saved to 'test_audio.mp3'")
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
