from flask import Flask, request, jsonify
from flask_cors import CORS
import uuid
from datetime import datetime
import os
from pathlib import Path
from dotenv import load_dotenv
import secrets
import string
import hashlib
import base64

# Load environment variables from .env file
# Look for .env in the backend/ directory (parent directory)
backend_dir = Path(__file__).parent.parent
env_file = backend_dir / ".env"
load_dotenv(dotenv_path=env_file)

# Also try loading from current directory as fallback
load_dotenv()

app = Flask(__name__)

# Enable CORS for all routes with specific configuration
# This allows the frontend to access the API from different origins
CORS(app, resources={
    r"/*": {
        "origins": "*",  # Allow all origins (restrict in production)
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

# --------------------------------------------------
# STAFF LIST API
# --------------------------------------------------
@app.route("/staff/GetStaffs", methods=["GET"])
def get_staffs():
    customer_id = request.args.get("customerId")

    return jsonify({
        "data": [
            {
                "email": "pantry@efsme.com",
                "category": "Pantry"
            },
            {
                "email": "it.support@efsme.com",
                "category": "IT"
            },
            {
                "email": "housekeeping@efsme.com",
                "category": "Housekeeping"
            },
            {
                "email": "facilities@efsme.com",
                "category": "Facilities"
            }
        ]
    }), 200


# --------------------------------------------------
# NOTIFICATION API (Pantry / IT / Housekeeping)
# --------------------------------------------------
@app.route("/notification/create", methods=["POST"])
def create_notification():
    payload = request.json

    return jsonify({
        "success": True,
        "id": payload.get("id", str(uuid.uuid4())),
        "title": payload.get("title"),
        "message": payload.get("message"),
        "type": payload.get("type"),
        "to": payload.get("to"),
        "status": "Notification accepted",
        "created_at": datetime.utcnow().isoformat()
    }), 201


# --------------------------------------------------
# PANTRY MENU API
# --------------------------------------------------
@app.route("/yarooms/services", methods=["GET"])
def pantry_menu():
    service_type = request.args.get("type")

    return jsonify({
        "data": {
            "list": [
                {"id": 1, "name": "Black Coffee"},
                {"id": 2, "name": "Milk Coffee"},
                {"id": 3, "name": "Green Tea"},
                {"id": 4, "name": "Black Tea"},
                {"id": 5, "name": "Bottled Water (Chilled)"},
                {"id": 6, "name": "Bottled Water (Room Temperature)"}
            ]
        }
    }), 200


# --------------------------------------------------
# MEETING ROOM AVAILABILITY
# --------------------------------------------------   
@app.route("/iwaa-workspaces/GetAvailability", methods=["GET"])
def get_availability():
    space_type_id = request.args.get("spaceTypeId")
    date = request.args.get("date")

    return jsonify({
        "status": "success",
        "formatted": "Here are the available rooms",
        "date": date,
        "spaceTypeId": space_type_id,
        "available_spaces": [
            {
                "id": "57315",
                "space_id": "57315", 
                "name": "Diversity",
                "roomName": "Diversity",
                "location_id": "41035",
                "floor_id": "2643",
                "capacity": 8,
                "availableSlots": [
                    {"start": "10:00", "end": "11:00"},
                    {"start": "15:00", "end": "16:00"}
                ]
            },
            {
                "id": "57316",
                "space_id": "57316",
                "name": "Innovation",
                "roomName": "Innovation",
                "location_id": "41035",
                "floor_id": "2643",
                "capacity": 10,
                "availableSlots": [
                    {"start": "11:00", "end": "12:00"}
                ]
            }
        ]
    }), 200


# --------------------------------------------------
# MEETING ROOM BOOKING
# --------------------------------------------------

@app.route("/iwaa-workspaces/bookings", methods=["POST"])
def book_room():
    # Handle both JSON and Form Data
    if request.is_json:
        data = request.json
    else:
        data = request.form

    # Extract fields based on CURL request structure
    location_id = data.get('location_id')
    floor_id = data.get('floor_id')
    space_type_id = data.get('space_type_id')
    title = data.get('title')
    space_id = data.get('space_id')
    
    # Handle array-like keys from form-data if present (e.g. dates[0][start])
    start_time = data.get('dates[0][start]')
    end_time = data.get('dates[0][end]')
    
    # Fallback to direct keys if not using array syntax
    if not start_time:
        start_time = data.get('start_datetime')
    if not end_time:
        end_time = data.get('end_datetime')

    print(f"Booking Request received for space {space_id} | Time: {start_time} - {end_time}")

    return jsonify({
        "status": "success",
        "booking_id": str(uuid.uuid4()),
        "formatted": f"✅ Meeting room booked successfully for {start_time} to {end_time}!",
        "details": {
            "title": title,
            "space_id": space_id,
            "start": start_time,
            "end": end_time
        }
    }), 201
    
    
# --------------------------------------------------
# BANKING MOCK APIs
# --------------------------------------------------

@app.route("/bank/customer/verify", methods=["POST"])
def bank_verify_customer():
    data = request.json or {}

    return jsonify({
        "success": True,
        "customer_name": "Rakesh Rohan",
        "customer_id": "CUST123456",
        "mobile": data.get("mobile"),
        "account_number": data.get("account_number", "XXXX4567"),
        "status": "Verified"
    })


@app.route("/bank/account/balance", methods=["POST"])
def bank_balance():
    data = request.json or {}

    return jsonify({
        "success": True,
        "mobile": data.get("mobile"),
        "account_number": data.get("account_number"),
        "available_balance": 45678.50,
        "currency": "INR"
    })


@app.route("/bank/account/ministatement", methods=["POST"])
def bank_mini_statement():
    data = request.json or {}

    return jsonify({
        "success": True,
        "mobile": data.get("mobile"),
        "account_number": data.get("account_number"),
        "transactions": [
            {
                "date": "2026-06-01",
                "description": "UPI Payment",
                "amount": -500
            },
            {
                "date": "2026-05-31",
                "description": "Salary Credit",
                "amount": 50000
            },
            {
                "date": "2026-05-30",
                "description": "ATM Withdrawal",
                "amount": -2000
            },
            {
                "date": "2026-05-29",
                "description": "Electricity Bill",
                "amount": -1500
            },
            {
                "date": "2026-05-28",
                "description": "Amazon Purchase",
                "amount": -2500
            }
        ]
    })


@app.route("/bank/complaint/create", methods=["POST"])
def bank_create_complaint():
    data = request.json or {}

    return jsonify({
        "success": True,
        "complaint_id": str(uuid.uuid4()),
        "mobile": data.get("mobile"),
        "category": data.get("category"),
        "description": data.get("description"),
        "status": "Open",
        "created_at": datetime.utcnow().isoformat()
    })


@app.route("/bank/complaint/status", methods=["POST"])
def bank_complaint_status():
    data = request.json or {}

    return jsonify({
        "success": True,
        "complaint_id": data.get("complaint_id"),
        "status": "In Progress",
        "expected_resolution": "48 Hours"
    })


@app.route("/bank/card/block", methods=["POST"])
def bank_block_card():
    data = request.json or {}

    return jsonify({
        "success": True,
        "mobile": data.get("mobile"),
        "card_number": data.get("card_number"),
        "status": "Blocked"
    })


@app.route("/bank/card/lost", methods=["POST"])
def bank_lost_card():
    data = request.json or {}

    return jsonify({
        "success": True,
        "mobile": data.get("mobile"),
        "card_number": data.get("card_number"),
        "reference_id": str(uuid.uuid4()),
        "status": "Card Hotlisted",
        "replacement_card": "Requested"
    })


@app.route("/bank/creditcard/outstanding", methods=["POST"])
def bank_credit_card_outstanding():
    data = request.json or {}

    return jsonify({
        "success": True,
        "mobile": data.get("mobile"),
        "card_number": data.get("card_number"),
        "outstanding_amount": 12345.67,
        "due_date": "2026-06-15"
    })


@app.route("/bank/loan/details", methods=["POST"])
def bank_loan_details():
    data = request.json or {}

    return jsonify({
        "success": True,
        "loan_id": data.get("loan_id"),
        "loan_type": "Personal Loan",
        "outstanding_amount": 245000,
        "emi_amount": 8750,
        "next_emi_date": "2026-06-10"
    })


@app.route("/bank/loan/emi", methods=["POST"])
def bank_emi_details():
    data = request.json or {}

    return jsonify({
        "success": True,
        "loan_id": data.get("loan_id"),
        "emi_amount": 8750,
        "due_date": "2026-06-10",
        "status": "Upcoming"
    })


@app.route("/bank/fd/details", methods=["POST"])
def bank_fd_details():
    data = request.json or {}

    return jsonify({
        "success": True,
        "fd_number": data.get("fd_number"),
        "principal": 100000,
        "maturity_amount": 108500,
        "maturity_date": "2027-01-01"
    })


@app.route("/bank/service/chequebook", methods=["POST"])
def bank_chequebook():
    data = request.json or {}

    return jsonify({
        "success": True,
        "account_number": data.get("account_number"),
        "request_id": str(uuid.uuid4()),
        "status": "Requested",
        "delivery_time": "7 Working Days"
    })


@app.route("/bank/branch/nearest", methods=["POST"])
def bank_branch():
    data = request.json or {}

    return jsonify({
        "success": True,
        "mobile": data.get("mobile"),
        "branch_name": "Whitefield Branch",
        "address": "Whitefield Main Road, Bangalore",
        "distance": "2.3 KM"
    })


@app.route("/bank/atm/nearest", methods=["POST"])
def bank_atm():
    data = request.json or {}

    return jsonify({
        "success": True,
        "mobile": data.get("mobile"),
        "atm_name": "ABC Bank ATM",
        "address": "ITPL Road, Whitefield",
        "distance": "1.1 KM"
    })


@app.route("/bank/account/details", methods=["POST"])
def bank_account_details():
    data = request.json or {}

    return jsonify({
        "success": True,
        "mobile": data.get("mobile"),
        "account_number": data.get("account_number"),
        "customer_name": "Rakesh Rohan",
        "account_type": "Savings",
        "branch": "Whitefield Branch",
        "ifsc": "ABCD0001234",
        "status": "Active"
    })


@app.route("/bank/services", methods=["GET"])
def bank_services():
    return jsonify({
        "services": [
            "Verify Customer",
            "Balance Enquiry",
            "Mini Statement",
            "Account Details",
            "Cheque Book Request",
            "Block Debit Card",
            "Report Lost Card",
            "Credit Card Outstanding",
            "Loan Details",
            "EMI Details",
            "FD Details",
            "Complaint Registration",
            "Complaint Status",
            "Nearest Branch",
            "Nearest ATM"
        ]
    })


# --------------------------------------------------
# HEALTH CHECK
# --------------------------------------------------
@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "EFS MOCK API RUNNING",
        "time": datetime.utcnow().isoformat()
    })


# --------------------------------------------------
# OIDC MOCK IMPLEMENTATION
# --------------------------------------------------
import jwt
import time
import urllib.parse
from flask import redirect

MOCK_SECRET_KEY = "mock-secret-key-123"
AUTHORIZATION_CODES = {}

# Get BASE_URL from environment variable or use localhost as fallback
# For Ubuntu deployment, set this to your server IP, e.g., http://192.168.3.155:5000
BASE_URL = os.getenv("MOCK_API_BASE_URL", "http://localhost:5000")
# Remove any trailing whitespace that might cause URL construction issues
BASE_URL = BASE_URL.strip() if BASE_URL else "http://localhost:5000"
# Ensure no trailing slash (OIDC spec doesn't allow it in issuer)
BASE_URL = BASE_URL.rstrip('/')
print(f"🔗 Mock API BASE_URL set to: {BASE_URL}")


def random_str(length=16):
    """Cryptographically secure random string (PHP random_str equivalent)."""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def base64url_sha256(value):
    digest = hashlib.sha256(value.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest).decode("utf-8").rstrip("=")

@app.route("/.well-known/openid-configuration", methods=["GET"])
def openid_configuration():
    # Ensure BASE_URL is clean (no spaces, no trailing slash)
    # This prevents issues like "http://localhost:4444 /connect/authorize"
    clean_base_url = BASE_URL.strip().rstrip('/')
    
    # Construct endpoints - ensure no spaces in f-string
    authorization_endpoint = f"{clean_base_url}/connect/authorize"
    token_endpoint = f"{clean_base_url}/connect/token"
    end_session_endpoint = f"{clean_base_url}/connect/endsession"
    jwks_uri = f"{clean_base_url}/.well-known/jwks.json"
    userinfo_endpoint = f"{clean_base_url}/connect/userinfo"
    
    # Validate URLs don't have spaces (debugging)
    endpoints_to_check = {
        "authorization_endpoint": authorization_endpoint,
        "token_endpoint": token_endpoint,
        "end_session_endpoint": end_session_endpoint,
        "jwks_uri": jwks_uri,
        "userinfo_endpoint": userinfo_endpoint,
    }
    
    for name, url in endpoints_to_check.items():
        if ' ' in url:
            print(f"❌ ERROR: Space found in {name}: '{url}'")
            # Remove spaces
            url = url.replace(' ', '')
            endpoints_to_check[name] = url
            print(f"✅ Fixed: {name} = '{url}'")
    
    return jsonify({
        "issuer": clean_base_url,
        "authorization_endpoint": endpoints_to_check["authorization_endpoint"],
        "token_endpoint": endpoints_to_check["token_endpoint"],
        "end_session_endpoint": endpoints_to_check["end_session_endpoint"],
        "jwks_uri": endpoints_to_check["jwks_uri"],
        "userinfo_endpoint": endpoints_to_check["userinfo_endpoint"],
        "response_types_supported": ["code", "token", "id_token", "code id_token"],
        "subject_types_supported": ["public"],
        "id_token_signing_alg_values_supported": ["HS256"],
        "scopes_supported": ["openid", "profile", "email", "offline_access"],
        "token_endpoint_auth_methods_supported": ["client_secret_post", "client_secret_basic"]
    })

@app.route("/connect/authorize", methods=["GET", "POST"])
def authorize():
    # Read and validate incoming authorization parameters.
    client_id = request.args.get('client_id') or request.form.get('client_id')
    response_type = request.args.get('response_type') or request.form.get('response_type')
    scope = request.args.get('scope') or request.form.get('scope') or "openid offline_access"
    redirect_uri = request.args.get('redirect_uri') or request.form.get('redirect_uri')
    state = request.args.get('state') or request.form.get('state') or random_str(16)
    nonce = request.args.get('nonce') or request.form.get('nonce') or random_str(16)
    code_challenge = request.args.get('code_challenge') or request.form.get('code_challenge')
    code_challenge_method = request.args.get('code_challenge_method') or request.form.get('code_challenge_method')
    
    if not redirect_uri:
        return "Missing redirect_uri", 400
    if response_type != "code":
        return "Unsupported response_type (must be code)", 400
    if code_challenge and code_challenge_method and code_challenge_method != "S256":
        return "Unsupported code_challenge_method (must be S256)", 400

    # GET: Show Login Form
    if request.method == "GET":
        return f"""
        <html>
            <head>
                <title>Mock SSO Login</title>
                <style>
                    body {{ font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #f0f2f5; }}
                    .login-box {{ background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); width: 300px; }}
                    h2 {{ text-align: center; color: #333; }}
                    input {{ width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }}
                    button {{ width: 100%; padding: 10px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }}
                    button:hover {{ background: #0056b3; }}
                    .note {{ font-size: 12px; color: #666; text-align: center; margin-top: 15px; }}
                </style>
            </head>
            <body>
                <div class="login-box">
                    <h2>SSO Login</h2>
                    <form method="POST">
                        <input type="hidden" name="client_id" value="{client_id or ''}">
                        <input type="hidden" name="response_type" value="{response_type or ''}">
                        <input type="hidden" name="scope" value="{scope}">
                        <input type="hidden" name="redirect_uri" value="{redirect_uri}">
                        <input type="hidden" name="state" value="{state}">
                        <input type="hidden" name="nonce" value="{nonce}">
                        <input type="hidden" name="code_challenge" value="{code_challenge or ''}">
                        <input type="hidden" name="code_challenge_method" value="{code_challenge_method or ''}">
                        
                        <label>Email</label>
                        <input type="email" name="email" value="mock-user@haloocom.com" required>
                        
                        <label>Password</label>
                        <input type="password" name="password" value="password" required>
                        
                        <button type="submit">Sign In</button>
                    </form>
                    <div class="note">Mock Provider (Any password works)</div>
                </div>
            </body>
        </html>
        """

    # POST: Process Login
    # Generate one-time auth code and bind request context (incl. nonce/PKCE).
    code = secrets.token_urlsafe(32)
    AUTHORIZATION_CODES[code] = {
        "client_id": client_id or "external-haloocom",
        "redirect_uri": redirect_uri,
        "nonce": nonce,
        "scope": scope,
        "code_challenge": code_challenge,
        "code_challenge_method": code_challenge_method,
        "created_at": int(time.time()),
    }
    
    # Parse redirect_uri and append params
    url_parts = list(urllib.parse.urlparse(redirect_uri))
    query = dict(urllib.parse.parse_qsl(url_parts[4]))
    query.update({'code': code, 'state': state})
    url_parts[4] = urllib.parse.urlencode(query)
    callback_url = urllib.parse.urlunparse(url_parts)
    
    print(f"Login Successful. Redirecting to: {callback_url}")
    return redirect(callback_url)

@app.route("/connect/endsession", methods=["GET"])
def endsession():
    # OIDC Logout Endpoint
    post_logout_redirect_uri = request.args.get('post_logout_redirect_uri')
    
    if not post_logout_redirect_uri:
        return "Missing post_logout_redirect_uri", 400
        
    print(f"Logout called. Redirecting to: {post_logout_redirect_uri}")
    return redirect(post_logout_redirect_uri)

@app.route("/connect/token", methods=["POST"])
def token():
    # Grant Type Flow
    grant_type = request.form.get('grant_type')
    code = request.form.get('code')
    redirect_uri = request.form.get('redirect_uri')
    code_verifier = request.form.get('code_verifier')
    
    print(f"Token Request: grant_type={grant_type}, code={code}")

    if grant_type == 'authorization_code':
        if not code:
            return jsonify({"error": "invalid_grant", "error_description": "Missing authorization code"}), 400

        auth_context = AUTHORIZATION_CODES.pop(code, None)
        if not auth_context:
            return jsonify({"error": "invalid_grant", "error_description": "Invalid or expired authorization code"}), 400

        if redirect_uri and redirect_uri != auth_context.get("redirect_uri"):
            return jsonify({"error": "invalid_grant", "error_description": "redirect_uri mismatch"}), 400

        expected_challenge = auth_context.get("code_challenge")
        challenge_method = auth_context.get("code_challenge_method")
        if expected_challenge:
            if challenge_method != "S256":
                return jsonify({"error": "invalid_grant", "error_description": "Unsupported code_challenge_method"}), 400
            if not code_verifier:
                return jsonify({"error": "invalid_request", "error_description": "Missing code_verifier"}), 400
            calculated_challenge = base64url_sha256(code_verifier)
            if calculated_challenge != expected_challenge:
                return jsonify({"error": "invalid_grant", "error_description": "PKCE validation failed"}), 400

        # Generate Tokens
        now = int(time.time())
        
        # ID Token (User Identity)
        id_token_payload = {
            "iss": BASE_URL,
            "sub": "mock-user-id-001",
            "aud": auth_context.get("client_id", "external-haloocom"),
            "exp": now + 3600,
            "iat": now,
            "nonce": auth_context.get("nonce"),
            "name": "Mock User",
            "email": "mock-user@haloocom.com",
            "preferred_username": "mockuser"
        }
        id_token = jwt.encode(id_token_payload, MOCK_SECRET_KEY, algorithm="HS256")
        
        # Access Token (API Access)
        access_token_payload = {
            "iss": BASE_URL,
            "sub": "mock-user-id-001",
            "aud": auth_context.get("client_id", "external-haloocom"),
            "exp": now + 3600,
            "iat": now,
            "scope": auth_context.get("scope", "openid profile email offline_access")
        }
        access_token = jwt.encode(access_token_payload, MOCK_SECRET_KEY, algorithm="HS256")
        
        return jsonify({
            "access_token": access_token,
            "id_token": id_token,
            "refresh_token": f"mock_refresh_token_{uuid.uuid4()}",
            "token_type": "Bearer",
            "expires_in": 3600
        })
        
    elif grant_type == 'refresh_token':
        # Simple Refresh Mock
        now = int(time.time())
        access_token_payload = {
            "iss": BASE_URL,
            "sub": "mock-user-id-001",
            "aud": "external-haloocom",
            "exp": now + 3600,
            "iat": now,
            "scope": "openid profile email offline_access"
        }
        access_token = jwt.encode(access_token_payload, MOCK_SECRET_KEY, algorithm="HS256")
        
        return jsonify({
            "access_token": access_token,
            "id_token": "mock_id_token_refreshed", # simplified
            "refresh_token": f"mock_refresh_token_{uuid.uuid4()}", # new refresh token
            "token_type": "Bearer",
            "expires_in": 3600
        })

    return jsonify({"error": "invalid_grant"}), 400

@app.route("/connect/userinfo", methods=["GET", "POST"])
def userinfo():
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({"error": "missing_token"}), 401
    
    return jsonify({
        "sub": "mock-user-id-001",
        "name": "Mock User",
        "given_name": "Mock",
        "family_name": "User",
        "email": "mock-user@haloocom.com",
        "picture": "https://via.placeholder.com/150"
    })
# gpt
# @app.route("/api/auth/signup", methods=["POST", "OPTIONS"])
# def signup():
#     if request.method == "OPTIONS":
#         return "", 200

#     data = request.get_json()

#     return jsonify({
#         "access_token": "mock-access-token",
#         "token_type": "Bearer",
#         "user": {
#             "id": str(uuid.uuid4()),
#             "full_name": data["full_name"],
#             "email": data["email"],
#             "employee_id": "EMP001",
#             "department": "IT",
#             "role": "Employee",
#             "floor": "2",
#             "room": "201"
#         }
#     }), 200

#added fom GPT.
# JWT_SECRET = "mock-secret-key-123"
# JWT_ALGORITHM = "HS256"

# @app.route("/api/auth/login", methods=["POST", "OPTIONS"])
# def login():

#     # Handle CORS preflight
#     if request.method == "OPTIONS":
#         return "", 200

#     data = request.get_json() or {}

#     email = data.get("email")
#     password = data.get("password")

#     if not email or not password:
#         return jsonify({
#             "success": False,
#             "message": "Email and password are required"
#         }), 400

#     # Mock authentication
#     if email != "admin@haloocom.com" or password != "password":
#         return jsonify({
#             "success": False,
#             "message": "Invalid email or password"
#         }), 401

#     now = int(time.time())

#     payload = {
#         "sub": str(uuid.uuid4()),
#         "email": email,
#         "role": "Employee",
#         "iat": now,
#         "exp": now + 86400
#     }

#     access_token = jwt.encode(
#         payload,
#         JWT_SECRET,
#         algorithm=JWT_ALGORITHM
#     )

#     return jsonify({
#         "access_token": access_token,
#         "token_type": "Bearer",
#         "refresh_token": str(uuid.uuid4()),
#         "user": {
#             "id": payload["sub"],
#             "email": email,
#             "full_name": "Mock User",
#             "employee_id": "EMP001",
#             "department": "IT",
#             "role": "Employee",
#             "floor": "2",
#             "room": "201"
#         }
#     }), 200
# --------------------------------------------------
# MAIN EXECUTION
# --------------------------------------------------
if __name__ == "__main__":
    # Get port from environment variable or use default
    PORT = int(os.getenv("MOCK_API_PORT", "5000"))
    
    # Debug: Show where env vars are loaded from
    env_file_path = backend_dir / ".env"
    if env_file_path.exists():
        print(f"📄 Loading environment from: {env_file_path}")
    else:
        print(f"⚠️  .env file not found at: {env_file_path}")
        print(f"   Using environment variables from system/default")
    
    print(f"🔌 MOCK_API_PORT from environment: {os.getenv('MOCK_API_PORT', 'NOT SET (using default 5000)')}")
    print(f"🚀 Mock API Server running on {BASE_URL}")
    print(f"👉 OIDC Discovery: {BASE_URL}/.well-known/openid-configuration")
    print(f"📡 Listening on 0.0.0.0:{PORT} (accessible from network)")
    print(f"🔐 CORS enabled for all origins")
    
    app.run(host="0.0.0.0", port=PORT, debug=True)
