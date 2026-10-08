import json, urllib.request, sys

def post(url, data):
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json'}, method='POST')
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.read().decode()
    except urllib.error.HTTPError as e:
        return f'HTTPError {e.code}: {e.read().decode()}'
    except Exception as e:
        return f'Error: {e}'

base = 'http://localhost:8125'
signup_data = {
    'email': 'testuser@example.com',
    'password': 'Secret123!',
    'full_name': 'Test User'
}
print('Signing up...')
print(post(f'{base}/api/auth/signup', signup_data))

login_data = {
    'email': 'testuser@example.com',
    'password': 'Secret123!'
}
print('Logging in...')
print(post(f'{base}/api/auth/login', login_data))
