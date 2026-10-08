import requests, json

url = "http://127.0.0.1:8247/api/auth/signup"
payload = {
    "email": "test@example.com",
    "password": "test123",
    "full_name": "Test User"
}

response = requests.post(url, json=payload)
print("Status:", response.status_code)
print("Response:", response.text)





