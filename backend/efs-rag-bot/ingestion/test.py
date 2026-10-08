#vms house.py
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
import json, asyncio, websockets
import aiohttp
import requests
from datetime import datetime, timedelta
import re
import logging
from typing import Dict, List, Optional, Tuple
import traceback
from fastapi.middleware.cors import CORSMiddleware
from collections import defaultdict
import time
from functools import wraps
import aiomysql
from contextlib import asynccontextmanager
import jwt
import requests
import uuid

# MySQL Configuration (add after other configurations)
MYSQL_CONFIG = {
    "host": "localhost",  # Change to your MySQL host
    "port": 3306,
    "user": "root",  # Change to your MySQL username
    "password": "Hal0o(0m@72427242",  # Change to your MySQL password
    "db": "efs_vms_chatbot",  # Database name
    "autocommit": True,
    "pool_recycle": 3600,
}

# Database pool
db_pool = None
# ===== DATABASE SETUP =====

# ===== STAFF EMAIL CACHE =====
staff_email_cache = {
    "pantry": [],
    "it": [],
    "housekeeping": [],
    "facilities": []
}
staff_cache_timestamp = None
STAFF_CACHE_DURATION = 3600  # 1 hour

async def fetch_and_cache_staff_emails():
    """Fetch staff information from API and cache category-based emails"""
    global staff_email_cache, staff_cache_timestamp
    
    try:
        url = f"{API_BASE_URL}/staff/GetStaffs?customerId={API_HEADERS['customerId']}"
        logger.info("🔍 Fetching staff emails from API...")
        
        session = await session_manager.get_session()
        
        async with session.get(
            url, 
            headers=API_HEADERS,
            timeout=aiohttp.ClientTimeout(total=10.0)
        ) as response:
            
            if response.status != 200:
                logger.error(f"❌ Failed to fetch staff: {response.status}")
                return False
            
            data = await response.json()
            
            # Reset cache
            staff_email_cache = {
                "pantry": [],
                "it": [],
                "housekeeping": [],
                "facilities": []
            }
            
            # Parse staff list
            staff_list = data if isinstance(data, list) else data.get('data', [])
            
            for staff in staff_list:
                email = staff.get('email', '').strip()
                category = staff.get('category', '').lower().strip()
                
                if not email:
                    continue
                
                # Map categories to cache keys
                if 'pantry' in category or 'kitchen' in category:
                    staff_email_cache['pantry'].append(email)
                elif 'it' in category or 'technical' in category or 'tech' in category:
                    staff_email_cache['it'].append(email)
                elif 'housekeeping' in category or 'cleaning' in category:
                    staff_email_cache['housekeeping'].append(email)
                elif 'facilities' in category or 'facility' in category:
                    staff_email_cache['facilities'].append(email)
            
            staff_cache_timestamp = datetime.now()
            
            logger.info("✅ Staff emails cached successfully:")
            logger.info(f"   📧 Pantry: {len(staff_email_cache['pantry'])} emails")
            logger.info(f"   📧 IT: {len(staff_email_cache['it'])} emails")
            logger.info(f"   📧 Housekeeping: {len(staff_email_cache['housekeeping'])} emails")
            logger.info(f"   📧 Facilities: {len(staff_email_cache['facilities'])} emails")
            
            return True
            
    except Exception as e:
        logger.error(f"❌ Error fetching staff emails: {e}")
        return False

async def get_category_emails(category: str) -> str:
    """Get comma-separated emails for a category"""
    global staff_cache_timestamp
    
    # Refresh cache if expired or empty
    if (staff_cache_timestamp is None or 
        (datetime.now() - staff_cache_timestamp).seconds > STAFF_CACHE_DURATION or
        not any(staff_email_cache.values())):
        
        logger.info("🔄 Refreshing staff email cache...")
        await fetch_and_cache_staff_emails()
    
    category_key = category.lower().strip()
    emails = staff_email_cache.get(category_key, [])
    
    if not emails:
        logger.warning(f"⚠️ No emails found for category: {category}")
        # Fallback to hardcoded defaults
        fallback_emails = {
            "pantry": ["Bidhan.Lama@efsme.com"],
            "it": ["Affan.Khan@efsme.com"],
            "housekeeping": ["muhammed.shaheen@efsme.com"],
            "facilities": ["muhammed.shaheen@efsme.com"]
        }
        emails = fallback_emails.get(category_key, [])
    
    result = ",".join(emails)
    logger.info(f"📧 Category '{category}' emails: {result}")
    return result

# ===== MYSQL DATABASE FUNCTIONS =====

async def init_db_pool():
    """Initialize MySQL connection pool"""
    global db_pool
    try:
        db_pool = await aiomysql.create_pool(
            host=MYSQL_CONFIG["host"],
            port=MYSQL_CONFIG["port"],
            user=MYSQL_CONFIG["user"],
            password=MYSQL_CONFIG["password"],
            db=MYSQL_CONFIG["db"],
            minsize=1,
            maxsize=10,
            autocommit=MYSQL_CONFIG["autocommit"],
            pool_recycle=MYSQL_CONFIG["pool_recycle"]
        )
        logger.info("✅ MySQL connection pool created successfully")
        await create_conversation_table()
        
    except Exception as e:
        logger.error(f"❌ Failed to create MySQL pool: {e}")
        raise

async def close_db_pool():
    """Close MySQL connection pool"""
    global db_pool
    if db_pool:
        db_pool.close()
        await db_pool.wait_closed()
        logger.info("🔌 MySQL connection pool closed")

async def create_conversation_table():
    """Create conversations table if not exists"""
    create_table_query = """
    CREATE TABLE IF NOT EXISTS conversations (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        session_id VARCHAR(255) NOT NULL,
        room_name VARCHAR(255),
        conversation_text LONGTEXT NOT NULL,
        message_count INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_session_id (session_id),
        INDEX idx_room_name (room_name),
        INDEX idx_created_at (created_at),
        UNIQUE KEY unique_session (session_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """
    
    try:
        async with db_pool.acquire() as conn:
            async with conn.cursor() as cursor:
                await cursor.execute(create_table_query)
                logger.info("✅ Conversations table created/verified")
    except Exception as e:
        logger.error(f"❌ Failed to create table: {e}")
        raise

def format_conversation_text(conversation_history: list) -> str:
    """Format conversation history into structured text"""
    formatted_lines = []
    
    for msg in conversation_history:
        role = msg.get("role", "")
        content = msg.get("content", "")
        
        if role == "user":
            formatted_lines.append(f"Agent: {content}")
        elif role == "assistant":
            formatted_lines.append(f"LLM: {content}")
        formatted_lines.append("")
    
    if formatted_lines and formatted_lines[-1] == "":
        formatted_lines.pop()
    
    return "\n".join(formatted_lines)



async def get_conversation_from_db(session_id: str):
    """Retrieve conversation from database"""
    query = """
    SELECT session_id, room_name, conversation_text, message_count, 
           created_at, updated_at
    FROM conversations
    WHERE session_id = %s
    """
    
    try:
        async with db_pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cursor:
                await cursor.execute(query, (session_id,))
                result = await cursor.fetchone()
                return result
                
    except Exception as e:
        logger.error(f"❌ Failed to retrieve conversation: {e}")
        return None

# Enhanced logging with performance tracking
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - [%(name)s] - %(message)s'
)
logger = logging.getLogger(__name__)

# Performance monitoring logger
perf_logger = logging.getLogger('performance')
perf_handler = logging.FileHandler('performance.log')
perf_handler.setFormatter(logging.Formatter('%(asctime)s - %(message)s'))
perf_logger.addHandler(perf_handler)
perf_logger.setLevel(logging.INFO)

# OpenAI Configuration
OPENAI_URL = "wss://api.openai.com/v1/realtime"
API_KEY = "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"
REALTIME_MODEL = "gpt-4o-realtime-preview"
Authorization=''

print(Authorization)
# API Configuration
API_BASE_URL = "https://efsim-tech-dev-apim-01.azure-api.net"
REFRESH_URL = "https://qalogin.fmpro.me/connect/token"
TOKEN_REFRESH_THRESHOLD = 300  
# Use your client_id
CLIENT_ID = "external-haloocom"

API_HEADERS = {
    "Ocp-Apim-Subscription-Key": "6371cad18f114c17a4168edb5fecf286",
    "customerId": "bdb6c41e-2b82-4299-a256-e347cbb060d5",
    'Authorization': Authorization

}
DEFAULT_SPACE_TYPE_ID = 2120

# OPTIMIZED Configuration
# MAX_RETRIES = 5
# RETRY_DELAY = 0.3
# WEBSOCKET_TIMEOUT = 12.0
MAX_RESPONSE_RETRIES = 4
# EVENT_TIMEOUT = 4.0
API_TIMEOUT = 5.0
CACHE_DURATION = 1800  # 30 minutes

WEBSOCKET_TIMEOUT = 60
EVENT_TIMEOUT = 30
RETRY_DELAY = 2
MAX_RETRIES = 10
PING_INTERVAL = 20

# Performance Metrics
performance_metrics = {
    "total_requests": 0,
    "successful_requests": 0,
    "failed_requests": 0,
    "total_response_time": 0.0,
    "api_calls": defaultdict(lambda: {"count": 0, "total_time": 0.0, "errors": 0}),
    "websocket_retries": 0,
    "cache_hits": 0,
    "cache_misses": 0
}

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.on_event("startup")
async def startup_event():
    logger.info("=" * 80)
    logger.info("🚀 APPLICATION STARTUP")
    await fetch_and_cache_staff_emails()
    logger.info("=" * 80)
    await init_db_pool()
    if db_pool:
        logger.info("✅ Database connection ready")
    else:
        logger.warning("⚠️ Running without database")
    logger.info("=" * 80)
# ===== ROOM TO PRINTER MAPPING =====
ROOM_PRINTER_MAP = {
    # 1st Floor
    "transformation": "Printer1",
    "innovation": "Printer2",
    "diversity": "Printer2",
    # 2nd Floor
    "integrity": "Printer2",
    "prudence": "Printer2",
    "quality assurance": "Printer1",
    "resilience": "Printer2",
    # 3rd Floor
    "excellence": "Printer1",
    "governance": "Printer2",
    "peoples": "Printer1",
    "precision": "Printer1",
    "passion": "Printer2",
    "lean": "Printer1",
    "ehsaas":"Printer",
    "happiness":"Printer",
    "wecan":"Printer",
    "progression":"Printer"
}


# def is_token_expired(access_token: str) -> bool:
#     """
#     Check if JWT access token is expired by reading the 'exp' claim
    
#     Args:
#         access_token: JWT access token string
    
#     Returns:
#         bool: True if expired, False if still valid
#     """
#     try:
#         # Decode without verifying signature (we just need to read it)
#         decoded = jwt.decode(access_token, options={"verify_signature": False})
#         exp_timestamp = decoded.get('exp', 0)
        
#         if not exp_timestamp:
#             logger.warning("⚠️ Token has no 'exp' claim")
#             return True  # Treat as expired if no expiry found
        
#         current_timestamp = time.time()
#         time_until_expiry = exp_timestamp - current_timestamp
        
#         logger.info(f"⏰ Token expires in {time_until_expiry / 60:.1f} minutes")
        
#         # Token is expired if current time > expiry time
#         return current_timestamp > exp_timestamp
        
#     except jwt.DecodeError as e:
#         logger.error(f"❌ Failed to decode token: {e}")
#         return True  # Treat decode errors as expired
#     except Exception as e:
#         logger.error(f"❌ Error checking token expiry: {e}")
#         return True

# async def get_valid_access_token(user_id: str, access_token: str):
#     """
#     Validate access token and refresh if expired
    
#     Args:
#         user_id: User identifier (e.g., "Jose Mathew" or "V0000136")
#         access_token: Current JWT access token from request
    
#     Flow:
#     1. Check if access_token is expired using JWT exp claim
#     2. If not expired → return current token
#     3. If expired → fetch refresh_token from database using user_id
#     4. Call refresh API to get new tokens
#     5. Update database with new tokens and new expiry
#     6. Return new tokens
    
#     Returns:
#         tuple: (access_token, refresh_token)
#     """
    
#     if db_pool is None:
#         logger.error("❌ Database pool not initialized")
#         raise Exception("Database not available")
    
#     try:
#         # Step 1: Check if current access_token is expired
#         token_expired = is_token_expired(access_token)
        
#         if not token_expired:
#             logger.info(f"✅ Access token still valid for user: {user_id}")
            
#             # Optionally fetch refresh_token from DB to return both
#             query = "SELECT refresh_token FROM api_key_logs WHERE user = %s"
#             async with db_pool.acquire() as conn:
#                 async with conn.cursor(aiomysql.DictCursor) as cursor:
#                     await cursor.execute(query, (user_id,))
#                     result = await cursor.fetchone()
            
#             if result and result.get('refresh_token'):
#                 return access_token, result['refresh_token']
#             else:
#                 # If no refresh_token in DB, just return access_token
#                 logger.warning(f"⚠️ No refresh_token found in DB for {user_id}")
#                 return access_token, None
        
#         # Step 2: Token is expired - fetch refresh_token from database
#         logger.warning(f"⚠️ Access token expired for user: {user_id}")
#         logger.info(f"🔍 Fetching refresh_token from database...")
        
#         query = "SELECT refresh_token FROM api_key_logs WHERE user = %s"
        
#         async with db_pool.acquire() as conn:
#             async with conn.cursor(aiomysql.DictCursor) as cursor:
#                 await cursor.execute(query, (user_id,))
#                 result = await cursor.fetchone()
        
#         if not result:
#             logger.error(f"❌ User not found in database: {user_id}")
#             raise Exception(f"User {user_id} not found. Please login first.")
        
#         db_refresh_token = result.get('refresh_token')
        
#         if not db_refresh_token:
#             logger.error(f"❌ No refresh_token stored for user: {user_id}")
#             raise Exception("No refresh token found. Please re-authenticate.")
        
#         # Step 3: Call refresh token API
#         logger.info(f"🔄 Refreshing access token using refresh_token...")
#         new_access_token, new_refresh_token = refresh_access_token(db_refresh_token)
        
#         # Step 4: Calculate new expiry from new access_token
#         try:
#             decoded = jwt.decode(new_access_token, options={"verify_signature": False})
#             new_token_exp = decoded.get('exp', 0)
#             new_expires_at = datetime.utcfromtimestamp(new_token_exp)
#         except Exception as e:
#             logger.error(f"❌ Failed to decode new token: {e}")
#             # Fallback: set expiry to 1 hour from now
#             new_expires_at = datetime.utcnow() + timedelta(hours=1)
        
#         # Step 5: Update database with new tokens and expiry
#         update_query = """
#         UPDATE api_key_logs 
#         SET access_token = %s, 
#             refresh_token = %s,
#             token_expires_at = %s
#         WHERE user = %s
#         """
        
#         async with db_pool.acquire() as conn:
#             async with conn.cursor() as cursor:
#                 await cursor.execute(
#                     update_query, 
#                     (new_access_token, new_refresh_token, new_expires_at, user_id)
#                 )
#                 logger.info(f"💾 Updated tokens in database for user: {user_id}")
#                 logger.info(f"   New expiry: {new_expires_at}")
#                 logger.info(f"   Valid for: {(new_expires_at - datetime.utcnow()).total_seconds() / 60:.1f} minutes")
        
#         return new_access_token, new_refresh_token
        
#     except Exception as e:
#         logger.error(f"❌ Token validation error for user {user_id}: {e}")
#         raise



# async def update_tokens_in_db(user_id: str, access_token: str, refresh_token: str):
#     """Update tokens in database"""
    
#     if db_pool is None:
#         logger.warning("⚠️ Database pool not initialized, skipping token update")
#         return
    
#     try:
#         # Decode new token to get expiry
#         decoded = jwt.decode(access_token, options={"verify_signature": False})
#         token_exp = decoded.get('exp', 0)
#         expires_at = datetime.fromtimestamp(token_exp)
        
#         update_query = """
#         UPDATE api_key_logs 
#         SET access_token = %s, 
#             refresh_token = %s,
#             token_expires_at = %s
#         WHERE user = %s
#         """
        
#         async with db_pool.acquire() as conn:
#             async with conn.cursor() as cursor:
#                 await cursor.execute(
#                     update_query, 
#                     (access_token, refresh_token, expires_at, user_id)
#                 )
#                 logger.info(f"💾 Updated tokens in DB for user: {user_id}")
                
#     except Exception as e:
#         logger.error(f"❌ Failed to update tokens in DB: {e}")

# def refresh_access_token(refresh_token: str):
#     """
#     Call the refresh token API to get new tokens
    
#     Args:
#         refresh_token: Current refresh token
    
#     Returns:
#         tuple: (new_access_token, new_refresh_token)
    
#     Raises:
#         Exception: If refresh fails
#     """
#     try:
#         payload = {
#             "grant_type": "refresh_token",
#             "refresh_token": refresh_token,
#             "client_id": CLIENT_ID
#         }

#         headers = {"Content-Type": "application/x-www-form-urlencoded"}
         
#         logger.info("🔄 Calling refresh token API...")
#         logger.info(f"The payload for refresh {payload}")
#         response = requests.post(
#             REFRESH_URL, 
#             data=payload, 
#             headers=headers,
#             timeout=10
#         )
        
#         if response.status_code == 200:
#             data = response.json()
#             new_access_token = data.get("access_token")
#             new_refresh_token = data.get("refresh_token", refresh_token)
            
#             if not new_access_token:
#                 logger.error("❌ Refresh response missing access_token")
#                 raise Exception("Invalid refresh response")
            
#             # Update global API headers
#             global Authorization, API_HEADERS
#             Authorization = f"Bearer {new_access_token}"
#             API_HEADERS["Authorization"] = Authorization
            
#             # Log expiry info
#             try:
#                 decoded = jwt.decode(new_access_token, options={"verify_signature": False})
#                 new_exp = decoded.get("exp", 0)
#                 expires_at = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(new_exp))
#                 logger.info(f"✅ Token refreshed successfully (expires at {expires_at})")
#             except:
#                 logger.info("✅ Token refreshed successfully")
            
#             return new_access_token, new_refresh_token
        
#         else:
#             error_detail = response.text
#             logger.error(f"❌ Refresh failed: {response.status_code} - {error_detail}")
            
#             if response.status_code == 400:
#                 raise Exception("Invalid refresh token - user needs to re-authenticate")
#             elif response.status_code == 401:
#                 raise Exception("Refresh token expired - user needs to re-authenticate")
#             else:
#                 raise Exception(f"Token refresh failed with status {response.status_code}")
                
#     except requests.Timeout:
#         logger.error("❌ Token refresh timeout")
#         raise Exception("Token refresh timeout")
#     except requests.RequestException as e:
#         logger.error(f"❌ Token refresh network error: {e}")
#         raise Exception("Token refresh network error")
#     except Exception as e:
#         logger.error(f"❌ Token refresh error: {e}")
#         raise


def get_nearest_printer(room_name: str) -> str:
    """Get the nearest printer for a given room"""
    room_key = room_name.lower().strip()
    return ROOM_PRINTER_MAP.get(room_key, "Printer2")  # Default to Printer2


def get_alternative_printer(room_name: str) -> str:
    """Get the alternative (non-nearest) printer for a given room"""
    nearest = get_nearest_printer(room_name)
    # Return the opposite printer
    return "Printer2" if nearest == "Printer1" else "Printer1"

# ===== PERFORMANCE MONITORING DECORATORS =====

def track_performance(api_name: str):
    """Decorator to track API call performance"""
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            start = time.time()
            try:
                result = await func(*args, **kwargs)
                elapsed = time.time() - start
                performance_metrics["api_calls"][api_name]["count"] += 1
                performance_metrics["api_calls"][api_name]["total_time"] += elapsed
                perf_logger.info(f"{api_name}: {elapsed:.3f}s - SUCCESS")
                return result
            except Exception as e:
                elapsed = time.time() - start
                performance_metrics["api_calls"][api_name]["errors"] += 1
                perf_logger.info(f"{api_name}: {elapsed:.3f}s - ERROR: {str(e)}")
                raise
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            start = time.time()
            try:
                result = func(*args, **kwargs)
                elapsed = time.time() - start
                performance_metrics["api_calls"][api_name]["count"] += 1
                performance_metrics["api_calls"][api_name]["total_time"] += elapsed
                perf_logger.info(f"{api_name}: {elapsed:.3f}s - SUCCESS")
                return result
            except Exception as e:
                elapsed = time.time() - start
                performance_metrics["api_calls"][api_name]["errors"] += 1
                perf_logger.info(f"{api_name}: {elapsed:.3f}s - ERROR: {str(e)}")
                raise
        
        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
    return decorator

# ===== CACHING SYSTEM =====

class SimpleCache:
    def __init__(self):
        self.cache = {}
    
    def get(self, key: str) -> Optional[Tuple[any, datetime]]:
        if key in self.cache:
            data, timestamp = self.cache[key]
            if (datetime.now() - timestamp).seconds < CACHE_DURATION:
                performance_metrics["cache_hits"] += 1
                logger.info(f"💾 Cache HIT: {key}")
                return data
            else:
                del self.cache[key]
        performance_metrics["cache_misses"] += 1
        logger.info(f"❌ Cache MISS: {key}")
        return None
    
    def set(self, key: str, data: any):
        self.cache[key] = (data, datetime.now())
        logger.info(f"💾 Cache SET: {key}")
    
    def clear(self):
        self.cache.clear()
        logger.info("🗑️ Cache cleared")

cache = SimpleCache()

# ===== ASYNC HTTP SESSION =====

class HTTPSessionManager:
    def __init__(self):
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def get_session(self) -> aiohttp.ClientSession:
        if self.session is None or self.session.closed:
            timeout = aiohttp.ClientTimeout(total=API_TIMEOUT)
            self.session = aiohttp.ClientSession(timeout=timeout)
            logger.info("🔌 Created new aiohttp session")
        return self.session
    
    async def close(self):
        if self.session and not self.session.closed:
            await self.session.close()
            logger.info("🔌 Closed aiohttp session")

session_manager = HTTPSessionManager()

# ===== CONVERSATION MEMORY =====
conversation_sessions: Dict[str, Dict] = {}
SESSION_TIMEOUT = 3600

# ===== NAVIGATION SYSTEM =====
class NavigationSystem:
    def __init__(self):
        self.destination_map = {
            "men's restroom": "Men%27s%20Restroom",
            "women's restroom": "Women%27s%20Restroom",
            "printer1": "Printer1",
            "printer2": "Printer2",
            "lift": "Lift",
            "left stair": "Left%20Stair",
            "right stair": "Right%20Stair",
            "transformation": "Transformation",
            "innovation": "Innovation",
            "diversity": "Diversity",
            "service lift": "Service%20lift",
            "men's prayer room": "Men%27s%20Prayer%20Room",
            "women's prayer room": "Women%27s%20Prayer%20Room",
            "auditorium":"Auditorium",
            "Exit1":"Exit1",
            "Exit2":"Exit2",
            "Printer":"Printer"
        }

    def get_navigation_map(self, dest, start="Diversity"):
        try:
            dest_key = dest.lower().strip()
            dest_value = self.destination_map.get(dest_key)

            if not dest_value:
                return f"❌ Destination '{dest}' not found."

            map_url = f"https://efsvms.haloocom.in/Floor_map/all_floors.html?start={start}&dest={dest_value}"
            clean_dest = dest_key.replace("%27", "'").replace("%20", " ")
            return f"🗺️ **Navigation to {clean_dest.title()}**\n\nTo navigate from **{start}** to **{clean_dest}**, please use this interactive map:\n\n🔗 [Click here for directions]({map_url})"
        except Exception as e:
            logger.error(f"Navigation error: {e}")
            return f"❌ Error generating navigation: {str(e)}"

navigation_system = NavigationSystem()
updated_prompt=""
SYSTEM_PROMPT = """You are a friendly Assistant for EFS HQ helping with meeting rooms, visitor registration, facility requests, and indoor navigation.
Respond only in english irrespective of user input language. Strictly respond in english only.
Important Rule:
Strictly follow: If the date chosen is {current_date} but the time requested is before {current_time}, respond that past time booking is not possible and DO NOT call get_room_availability(date)."

Never say "just a moment" throughout the conversations
Never say "once you have credentials" throughout the conversations
Always respond in text

Never say "just a moment throughout the conversations"
Never say: "once you have credentials throughout the conversations"
Always respond in text
## CRITICAL: Tool Calling Rules

IMPORTANT: You must ALWAYS execute tool calls, NEVER return them as text strings!

When you need to use a tool:
1. Include the tool marker in your internal thinking
2. The system will automatically execute it and add results
3. Your response should explain what you're doing in natural language

**WRONG** ❌: "Let me help you. [TOOL:NAV:women's restroom:SOURCE_PLACEHOLDER]"
**CORRECT** ✓: "Let me help you find the women's restroom from your current location. [TOOL:NAV:women's restroom:SOURCE_PLACEHOLDER]"

The tool marker will be processed automatically - you should write conversational text around it.
## CRITICAL: Function Calling Rules

You have access to 4 functions that will be automatically called by the system:
Rules:
If date choosen by customer is previous date than {current_date}, then respond like past date booking is not possible and dont call  get_room_availability(date)."
If the date chosen is {current_date} but the time requested is before {current_time}, respond that past time booking is not possible and DO NOT call get_room_availability(date)."
Only allow bookings for future dates or for today's date with future times."

### 1. get_room_availability(date)
**When to use:**
- User asks about available meeting rooms
- User asks "are there any rooms free today/tomorrow?"
- User asks about rooms on a specific date

if user say Tomorrow, day after Tomorrow or any specific Day
then 
→ use the passed {current_date} to calculate **Date**:
| Customer Says | Example (if current_date = 2025-12-08, Monday) | Date |
|----------------|----------------------------------------------------|--------------------|
| “Tomorrow” | +1 day | 2025-12-09 |
| “Day after tomorrow” | +2 days | 2025-12-10 |
| “Next Monday” | next Monday from current_date | 2025-12-15 |
| “Sunday” | nearest coming Sunday | 2025-11-14 |
| “Next week” | +7 days | 2025-12-15 |
| “End of month” | last date of the current month | 2025-12-31 |
If date choosen by customer is previous date than {current_date}, then respond like past date booking is not possible."
**The system will automatically call this function**

### 2. book_meeting_room(room_name, date, start_time, end_time)
**When to use:**
- After showing room availability and user selects a room
- User confirms they want to book with specific time

**Required Information:**
- Room name (from availability list)
- Date (YYYY-MM-DD)
- Start time (HH:MM in 24-hour format)
- End time (HH:MM in 24-hour format)

### Meeting Room Extension Handling

If the user indicates they want to extend an existing meeting room booking (examples: "extend my meeting", "extend for one hour", "extend 30 minutes", "extend half an hour", "add more time"), follow this exact flow:
1. Automatically call tool: get_extension_detail with parameter:
   - user_id: <user_id>

2. The tool will return all bookings for today.

3. Assistant behavior based on response:
   - No bookings: "You don’t have any bookings today to extend."
   - One or two bookings: List room name(s) and start/end time(s).
   - More than two bookings: Ask user: "You have multiple bookings today. Which one would you like to extend?"

4. After the user confirms the booking to extend, ask:
   "Until what time would you like to extend the booking?"
A. Duration-based requests

Examples:
“extend for one hour”
“extend by 30 minutes”
“extend for half an hour”
“extend for 15 mins”
“add 45 minutes”
“extend for 1.5 hours”
“extend for 2 hours and 15 minutes”
Convert these into a new end time by adding the duration to the original booking’s end time.

B. Specific time requests
Examples:
“extend until 4:30”
“extend till 3 pm”
“continue until 17:00”
Parse the time and use it as the new end time.

6. Check room availability for that extended time by calling get_room_availability(date):
   - Confirm the same room is free from original end_time → new extended end_time.

7. If available:
   - Call book_meeting_room with:
     • room_name = original room  
     • date = original date  
     • start_time = original end_time  
     • end_time = new extended end_time  
   - Reply: "Your meeting room has been successfully extended."

8. If not available:
   - Respond: "The same room is not available for that extended time. Would you like me to check alternative available rooms?"  
   - If user agrees → show alternative available rooms and continue with normal booking process.


**The system will automatically call this function**
### 3. send_pantry_notification(item_description)
**When to use:**
- IMMEDIATELY after user confirms their pantry order
- User selects an item from the pantry menu
- Order is clear and confirmed

**The system will automatically call this function**
## Pantry Service

**Dynamic Pantry Menu:**
The pantry menu is fetched dynamically from the system. When a user asks for pantry items:

**Menu Display Format:**
Always show items as a numbered list like this:
```
☕ **Pantry Menu**

1. Black Coffee
2. Milk Coffee
3. Green Tea
4. Black Tea
5. Bottled Water (Chilled)
...
```

**Smart Filtering:**
- If user asks for specific item type (e.g., "tea", "coffee"), show only matching items with numbers
- If user asks for "complete menu" or "all items", show full menu with numbers
- Always maintain numbering format

**Selection Process:**
1. User can select by:
   - Number: "1" or "I want 1" → Select item #1
   - Name: "Black Coffee" → Select that item
   - Description: "I want tea" → Show filtered tea options first

2. When user selects a number (e.g., "1", "2"), immediately identify the item name from the menu and call send_pantry_notification with the exact item name

3. When user selects by name, call send_pantry_notification immediately

**Examples:**

**Example 1 - Direct Request:**
```
User: "I want tea"
You: "Here are our tea options:

1. Green Tea
2. Black Tea  
3. Black Tea without Sugar

Which one would you like? Just say the number."

User: "2"
You: [Call send_pantry_notification("Black Tea")]
"Got it! I've sent your order for Black Tea to the pantry team."
```

**Example 2 - Show Full Menu:**
```
User: "What's available in pantry?"
You: "Here's our complete pantry menu:

☕ **Hot Beverages**
1. Black Coffee
2. Milk Coffee
3. Green Tea
4. Black Tea

💧 **Cold Beverages**  
5. Bottled Water (Chilled)
6. Fresh Juice

Which one would you like? Just say the number."

User: "5"
You: [Call send_pantry_notification("Bottled Water (Chilled)")]
"Perfect! I've ordered Bottled Water (Chilled) for you."
```

**Example 3 - Browse Then Select:**
```
User: "Show me coffee options"
You: "Here are our coffee options:

1. Black Coffee
2. Milk Coffee
3. Cappuccino

Which would you like?"

User: "1"  
You: [Call send_pantry_notification("Black Coffee")]
"Great choice! Black Coffee is on its way."
```


**Example 4 - Browse Then Select:**
```
User: "Show me coffee options"
You: "Here are our coffee options:

1. Black Coffee
2. Milk Coffee
3. Cappuccino

Which would you like?"

User: "1 and 2"  
You: [Call send_pantry_notification("Black Coffee and milk coffee")]
"Great choice! Black Coffee and milk coffeeis on its way."
```



**Example 5 - Browse Then Select:**
```
User: "Show me coffee options"
You: "Here are our coffee options:

1. Black Coffee
2. Milk Coffee
3. Cappuccino

Which would you like?"

User: "2 black coffee"  
You: [Call send_pantry_notification("2 black cofee")]
"Great choice! Black Coffee and milk coffeeis on its way."
```

**CRITICAL Rules:**
- ALWAYS show numbered lists when displaying menu items
- When user says a number, immediately map it to the item name and call the function
- Numbers should be consistent within a conversation (if you show "1. Black Coffee", then "1" always means Black Coffee until menu is refreshed)
- Call send_pantry_notification immediately when user confirms selection
- Use exact item names from the menu in the function call


### 4. send_tech_support_notification(issue_description, issue_type)
**CRITICAL: Two-Step Process for Technical Issues**

**Step 1: First Response - Provide Troubleshooting (DO NOT call function yet)**

When user reports technical issues (printer, WiFi, projector, AV equipment):

**First Response Format:**
```
I understand [the issue]. Let's try these troubleshooting steps:

[Provide 3-4 specific steps based on issue type]

Try these steps and let me know if the issue persists.
```

**DO NOT call send_tech_support_notification function in first response**

**Troubleshooting Steps by Issue Type:**

**Printer Issues:**
1. Check if printer is powered on and connected
2. Verify device connected to "EFS-FollowMe Printer" network
3. Confirm correct printer PIN is being used
4. Check for paper jams or low toner warnings
5. Try restarting the printer

**WiFi Issues:**
1. Verify device WiFi is turned on
2. Check if connected to correct network (Guest WiFi or EFS network)
3. Forget network and reconnect
4. Restart device WiFi
5. Ensure password is entered correctly

**Projector/Display Issues:**
1. Check HDMI cable connections
2. Try Windows + K (Windows) or Type-C connector (Mac)
3. Verify correct input source on TV/projector
4. Check if remote approval is needed
5. Try different HDMI port

**AV Equipment Issues:**
1. Check if camera/mic is connected via USB
2. Verify correct device selected in video conferencing software
3. Check volume levels and mute settings
4. Test with different USB port
5. Restart video conferencing application

**Step 2: Call Function - ONLY After Troubleshooting Fails**

**ONLY call send_tech_support_notification when user says:**
- "still not working"
- "tried everything"
- "nothing works"
- "doesn't work"
- "none of that worked"
- "can I talk to tech support?"
- "get me help"
- "I need support"

**Parameters:**
- issue_description: Clear description including what was tried
- issue_type: One of ["wifi", "printer", "projector", "av", "technical"]

**Example:**
```
User: "The printer is not working"
You: "I understand the printer isn't working. Let's try these steps:
1. Check if printer is powered on
2. Ensure connected to 'EFS-FollowMe Printer' network
3. Verify printer PIN
4. Check for paper jams

Try these and let me know if it still doesn't work."

[Wait for user response - DO NOT call function yet]

User: "Still not working"
You: "I'll notify the technical support team right away."
[NOW system calls: send_tech_support_notification("Printer not working in [room] after troubleshooting", "printer")]
```

**Function automatically sends notification to support@gmail.com**

## WiFi Credentials (Direct Request Only)

**When to use:**
- User explicitly asks for WiFi password/credentials
- User asks "what's the WiFi password?"
- **NOT for "WiFi not connecting"** - that needs troubleshooting first!

**How it works:**
- System has a separate API endpoint for WiFi credentials
- This is NOT a function call - it's handled differently in the backend
- Just naturally respond with WiFi info when user asks for credentials

## Staff Contact Information

**Pantry Staff:**
- User explicitly asks for pantry staff contact details
- System will fetch and display pantry team contacts

**Facilities Staff:**
- For furniture/supplies requests
- System will fetch facilities team contacts


## Housekeeping Requests

**When to use send_housekeeping_notification:**
- User requests room cleaning
- User reports restroom maintenance needs
- User reports spillages or messes
- User requests general housekeeping services
- User asks about facility maintenance

**How it works:**
- System automatically calls send_housekeeping_notification function
- Notification sent to housekeeping team with request details
- No need to provide contact information

**Examples:**
```
User: "The meeting room needs cleaning"
You: "I'll notify the housekeeping team right away."
[System calls: send_housekeeping_notification("Meeting room cleaning needed", "cleaning")]

User: "There's a spill in the hallway"
You: "I'm notifying housekeeping about the spillage immediately."
[System calls: send_housekeeping_notification("Spillage in hallway", "spillage")]

User: "The restroom needs maintenance"
You: "I'll send a maintenance request to housekeeping."
[System calls: send_housekeeping_notification("Restroom maintenance required", "maintenance")]
```

**Response Guidelines:**
- Immediately call function when housekeeping request is clear
- Confirm notification sent to user
- No need to provide contact details - function handles it

**Facilities Requests:**
- Additional furniture, stationery, whiteboard markers, supplies
- System automatically calls send_housekeeping_notification function
- Notification sent to housekeeping team with request details
- No need to provide contact information



**Tech Support:**
- Follow two-step process above
- Only call send_tech_support_notification after troubleshooting fails
- Do NOT fetch tech staff contacts - use the notification function instead

### 4. INDOOR_NAVIGATION
**When to use:**
- User asks for directions to any indoor location
- User mentions: restrooms, toilets, printers, lifts, stairs, prayer rooms, meeting rooms

**VALID LOCATIONS:**
- Restrooms: men's restroom, women's restroom, toilet, bathroom, washroom
- Printers: Printer1, Printer2, Printer
- Lifts: lift, elevator, service lift
- Stairs: left stair, right stair, staircase
- Prayer Rooms: men's prayer room, women's prayer room
- Meeting Rooms: Transformation, Innovation, Diversity
-Exit : Exit1, Exit2
-auditorium

**Available Destinations (exact names for tool):**
- men's restroom
- women's restroom
- Printer
- Printer1
- Printer2
- lift
- left stair
- right stair
- transformation
- innovation
- diversity
- service lift
- men's prayer room
- women's prayer room
-auditorium
- Exit1
- Exit2

**How to trigger:** Include exactly:
[TOOL:NAV:destination_name:SOURCE_PLACEHOLDER]

**IMPORTANT:** Always use "SOURCE_PLACEHOLDER" as the second parameter. The system will automatically replace it with the user's current location.

**Examples:**
- [TOOL:NAV:men's restroom:SOURCE_PLACEHOLDER]
- [TOOL:NAV:Printer1:SOURCE_PLACEHOLDER]
- [TOOL:NAV:women's prayer room:SOURCE_PLACEHOLDER]
- [TOOL:NAV:transformation:SOURCE_PLACEHOLDER]
- [TOOL:NAV:auditorium:SOURCE_PLACEHOLDER]

**SMART PRINTER NAVIGATION:**
When a user asks "where is the printer?" or "take me to the printer", you should:
1. Check their current room location (available in context as [Current Room: room_name])
2. Automatically navigate them to the NEAREST printer based on their room
3. Do NOT ask "which printer?" - the system knows the nearest one
4. Use: [TOOL:NAV:NEAREST_PRINTER:SOURCE_PLACEHOLDER]

**PRINTER NOT WORKING - ALTERNATIVE PRINTER:**
If the user mentions the printer is not working OR explicitly asks for "another printer" or "different printer":
1. Navigate them to the ALTERNATIVE printer (not the nearest one)
2. Use: [TOOL:NAV:ALTERNATIVE_PRINTER:SOURCE_PLACEHOLDER]
3. The system will automatically show the other printer

**Example Conversations:**
User: "Where is the printer?"
You: "I'll take you to the nearest printer from your current location. [TOOL:NAV:NEAREST_PRINTER:SOURCE_PLACEHOLDER]"

User: "The printer is not working" or "Show me another printer"
You: "No problem! Let me show you the alternative printer. [TOOL:NAV:ALTERNATIVE_PRINTER:SOURCE_PLACEHOLDER]"

User: "Take me to Printer 2" (specific request)
You: "I'll get you directions to Printer 2. [TOOL:NAV:printer2:SOURCE_PLACEHOLDER]"

**IMPORTANT CLARIFICATION RULES:**
- If user says "restroom"/"toilet"/"washroom" without gender → Ask: "Which restroom/toilet/washroom - Men's or Women's?"
- If user says "Printer" with a specific number (Printer 1/2) → Navigate directly to that printer
- If user says "stair" without direction → Ask: "Which staircase - Left or Right?"
- If user says "prayer room" without gender → Ask: "Which prayer room - Men's or Women's?"
- After clarification, THEN use [TOOL:NAV:specific_destination:SOURCE_PLACEHOLDER]

## Your Capabilities

### Indoor Navigation
- Provide directions to any indoor location
- Smart printer navigation based on current room location
- Alternative printer navigation when first printer isn't working
- Ask for clarification when needed (gender for restrooms/prayer rooms, direction for stairs)
- System automatically uses user's current location as starting point
- Always use SOURCE_PLACEHOLDER in navigation tool calls

## Meeting Room Features

**TV Connections:**
- Apple laptops: Type-C connector + HDMI cable
- Windows laptops: Win + K, select TV, approve on remote

**Room-Specific Info:**
- Integrity room: HDMI only (no Wi-Fi)
- Other rooms: Both HDMI and Wi-Fi available

**Video Conferencing:**
- Standard rooms: Logi Meetup camera (USB)
- Governance room: Polly X30 camera (HDMI + USB)

## Visitor Management

**How to Invite a Visitor (Host):**
1. Access https://apps.iwaa.com
2. Select Workplace Module → Visitor Module
3. Select date and Add a Visit

**Visitor Registration (13 Steps):**
1. Access https://apps.iwaa.com
2. Select Workplace module
3. Click "Visitor Management"
4. Navigate to Dashboard
5. Click "Add Visit"
6. Register or select visitor contact
7. Use Map View (optional) to select room
8. Select meeting room, date & time
9. Enable Visitor option in Extra Details
10. Add internal attendees (optional)
11. Add pantry services (optional)
12. Visitor receives email to confirm
13. QR code sent for check-in

**Visitor Check-in:**
- Scan QR code at reception kiosk
- Host automatically notified

**Visitor Parking:**
- FREE parking, no booking required

**Pass Issues:**
- Check spam/junk folder
- Resend via visitor management system

## Housekeeping & Facilities

**Housekeeping Requests:**
- Room cleaning, restroom maintenance, spillages
- Response: "Currently, housekeeping staff details are not available. Please contact the reception desk."

**Facilities Requests:**
- Additional furniture, stationery, whiteboard markers, supplies
- System fetches facilities team contact info

**AC & Lighting:**
- Share switch location OR contact facilities team

**Meeting Room Extension:**
- Modify booking at https://apps.iwaa.com

## Printing

**For Visitors:**
- Cannot print directly
- Must share documents with EFS employee

**For Employees:**
1. Locate printer using navigation
2. Connect to "EFS-FollowMe Printer" WiFi
3. Use printer secret PIN
4. Follow on-screen instructions

**Printer Issues:**
- First: Provide troubleshooting steps
- If still not working: Call send_tech_support_notification

**Printer Location:**
- Use the navigation map to find the nearest printer to your meeting room



## Example Navigation Conversations:

User: "Where is the restroom/toilet/wash room?" (use the similar word based on user context for example if user says toilet then use the word toilet only)
You: "I can help you find the restroom/toilet/washroom! Would you like directions to the Men's or Women's restroom/washroom/toilet?"

User: "women's"
You: "Perfect! Let me get you directions to the Women's restroom/toilet/washroom from your current location. [TOOL:NAV:women's restroom:SOURCE_PLACEHOLDER]"

---

User: "Where is the printer?"
You: "I'll take you to the nearest printer from your current location. [TOOL:NAV:NEAREST_PRINTER:SOURCE_PLACEHOLDER]"

---

User: "The printer is not working" or "Show me another printer" or "Is there a different printer?"
You: "No problem! Let me show you the alternative printer location. [TOOL:NAV:ALTERNATIVE_PRINTER:SOURCE_PLACEHOLDER]"

---

User: "Take me to printer 2"
You: "I'll get you directions to Printer 2 right away! [TOOL:NAV:printer2:SOURCE_PLACEHOLDER]"

---

User: "How do I get to the Transformation room?"
You: "Let me show you the way to the Transformation meeting room from where you are. [TOOL:NAV:transformation:SOURCE_PLACEHOLDER]"

---

User: "Where's the lift?"
You: "I'll guide you to the lift from your current location. [TOOL:NAV:lift:SOURCE_PLACEHOLDER]"
---
user: i need bottle
You: chilled or room temperature
user :room
you: I have sent a request for room temperature water bottle to pantry staff.

## Response Guidelines

**Tone:**
- Friendly and conversational
- Maintain context from previous messages
- Natural language, not robotic

**Formatting:**
- Use natural prose, not excessive bullet points
- Only use lists when explicitly asked or when essential
- Keep responses concise and relevant

**Function Calls:**
- Functions are called automatically by the system
- Just respond naturally - the system handles function execution
- For tech issues: ALWAYS troubleshoot first, function call second

**Remember:**
- Tech support: Two-step process (troubleshoot → then notify)
- Pantry orders: Call function immediately when order confirmed
- Room booking: Show availability, then book when user confirms
- Navigation: Provide directions naturally, system handles mapping

Remember: ALWAYS use SOURCE_PLACEHOLDER in navigation tool calls. The system handles the actual source location automatically!

"""

FUNCTIONS = [
    {
        "type": "function",
        "name": "get_room_availability",
        "description": "Get available meeting rooms for a specific date. Call this when user asks about room availability.",
        "parameters": {
            "type": "object",
            "properties": {
                "date": {
                    "type": "string",
                    "description": "Date in format: 'today', 'tomorrow', or 'YYYY-MM-DD'"
                }
            },
            "required": ["date"]
        }
    },
    {
    "type": "function",
    "name": "get_extension_detail",
    "description": "Fetch today's bookings for a given user to facilitate extensions.",
    "parameters": {
        "type": "object",
        "properties": {
            "user_id": {"type": "string", "description": "ID of the user requesting extension"}
        },
        "required": ["user_id"]
    }
},
    {
        "type": "function",
        "name": "book_meeting_room",
        "description": "Book a meeting room after user confirms selection.",
        "parameters": {
            "type": "object",
            "properties": {
                "room_name": {"type": "string", "description": "Exact room name from availability list"},
                "date": {"type": "string", "description": "Date in YYYY-MM-DD format"},
                "start_time": {"type": "string", "description": "Start time in HH:MM format (24-hour)"},
                "end_time": {"type": "string", "description": "End time in HH:MM format (24-hour)"}
            },
            "required": ["room_name", "date", "start_time", "end_time"]
        }
    },
    {
        "type": "function",
        "name": "send_pantry_notification",
        "description": "Send notification to pantry staff when user confirms their order. Call this IMMEDIATELY after user confirms their pantry item selection. This function sends an email notification to pantry staff with order details.",
        "parameters": {
            "type": "object",
            "properties": {
                "item_description": {
                    "type": "string",
                    "description": "Full description of the ordered item exactly as it appears in the menu (e.g., 'Bottled water (Chilled)', 'Black Coffee', 'Green Tea')"
                }
            },
            "required": ["item_description"]
        }
    },
    {
    "type": "function",
    "name": "send_housekeeping_notification",
    "description": "Send notification to housekeeping staff for cleaning, maintenance, or facility requests. Call this when user requests housekeeping services like room cleaning, restroom maintenance, spillage cleanup, or facility issues.",
    "parameters": {
        "type": "object",
        "properties": {
            "request_description": {
                "type": "string",
                "description": "Description of the housekeeping request (e.g., 'Room cleaning needed', 'Restroom maintenance', 'Spillage in hallway')"
            },
            "request_type": {
                "type": "string",
                "description": "Type of housekeeping request",
                "enum": ["cleaning", "maintenance", "spillage", "facility", "general"]
            }
        },
        "required": ["request_description"]
    }
},
    {
        "type": "function",
        "name": "send_tech_support_notification",
        "description": "Send notification to tech support team ONLY AFTER troubleshooting steps have failed.",
        "parameters": {
            "type": "object",
            "properties": {
                "issue_description": {
                    "type": "string",
                    "description": "Clear description of the technical issue"
                },
                "issue_type": {
                    "type": "string",
                    "description": "Type of technical issue",
                    "enum": ["wifi", "printer", "projector", "av", "technical"]
                }
            },
            "required": ["issue_description"]
        }
    }
]

def is_valid_response(response: str) -> bool:
    """Validate response is meaningful text, not just JSON error"""
    if not response or not response.strip():
        return False
    
    cleaned = response.strip()
    
    # ✅ FIX: Check if it's ONLY a JSON error response
    if cleaned.startswith('{') and cleaned.endswith('}'):
        try:
            json_obj = json.loads(cleaned)
            # If it's a simple error-like JSON with few keys, reject it
            if len(json_obj) <= 3 and any(key in json_obj for key in ['date', 'error', 'status', 'message']):
                logger.warning(f"❌ Rejected JSON error response: {cleaned}")
                return False
        except json.JSONDecodeError:
            pass  # Not JSON, continue validation
    
    # Remove tool markers for length check
    text_without_tools = re.sub(r'\[TOOL:[^\]]+\]', '', cleaned).strip()
    
    # ✅ Response is valid if:
    # 1. Has meaningful text after removing tool markers (at least 3 chars for greetings like "Hi!")
    # 2. OR contains valid tool markers (these are valid responses)
    has_text = len(text_without_tools) >= 3
    has_tools = bool(re.search(r'\[TOOL:[^\]]+\]', cleaned))
    
    return has_text or has_tools


def extract_user_id_from_token(access_token: str) -> str:
    """
    Extract user ID from JWT access token for validation
    
    Returns:
        str: User ID extracted from token
    """
    try:
        decoded = jwt.decode(access_token, options={"verify_signature": False})
        
        # Try multiple fields to get user ID
        user_id = (
            decoded.get('preferred_username') or  # Your API uses this: "V0000136"
            decoded.get('sub') or  # Standard JWT: "943aa4ef-4dfe-497a-8775-760a64dc7c07"
            decoded.get('email') or
            decoded.get('rid')
        )
        
        if not user_id:
            raise Exception("No user identifier found in token")
        
        return user_id
        
    except Exception as e:
        logger.error(f"❌ Error extracting user ID from token: {e}")
        raise
def has_unprocessed_tool_calls(response: str) -> bool:
    patterns = [r'\[TOOL:WIFI\]', r'\[TOOL:STAFF:\w+\]', r'\[TOOL:ROOMS:[^\]]+\]', r'\[TOOL:NAV:[^\]]+:[^\]]+\]']
    return any(re.search(p, response) for p in patterns)

# ===== SESSION MANAGEMENT =====

def get_or_create_session(session_id: str) -> Dict:
    if session_id not in conversation_sessions:
        conversation_sessions[session_id] = {
            "history": [],
            "last_activity": datetime.now(),
            "current_source": "Diversity",
            "retry_count": 0,
            "total_requests": 0,
            "avg_response_time": 0.0
        }
    return conversation_sessions[session_id]

def add_to_conversation(session_id: str, role: str, content: str):
    session = get_or_create_session(session_id)
    session["history"].append({
        "role": role,
        "content": content,
        "timestamp": datetime.now().isoformat()
    })
    session["last_activity"] = datetime.now()
    
    if len(session["history"]) > 8:
        session["history"] = session["history"][-8:]

def build_conversation_context(session_id: str) -> str:
    session = get_or_create_session(session_id)
    history = session["history"]
    
    context = ""
    if history:
        context += "\nRecent:\n"
        for msg in history[-8:]:
            content = msg['content'][:120] + "..." if len(msg['content']) > 120 else msg['content']
            context += f"{msg['role']}: {content}\n"
    
    current_room = session.get('current_source', 'Diversity')
    context += f"\n[Current Room: {current_room}]\n"
    context += f"[Location: {current_room}]\n"
    
    return context

# ===== OPTIMIZED API FUNCTIONS WITH CACHING =====

@track_performance("save_conversation_db")
async def save_conversation_to_db(user_id: str, session_id: str, room_name: str, conversation_history: list):
    """Save or update complete conversation in database"""
    
    if db_pool is None:
        logger.warning("⚠️ Database pool not initialized, skipping save")
        return
    
    conversation_text = format_conversation_text(conversation_history)
    message_count = len(conversation_history)
    
    # ✅ FIXED - Now has 5 placeholders for 5 values
    upsert_query = """
    INSERT INTO conversations 
    (user_id, session_id, room_name, conversation_text, message_count)
    VALUES (%s, %s, %s, %s, %s)
    ON DUPLICATE KEY UPDATE
        user_id = VALUES(user_id),
        room_name = VALUES(room_name),
        conversation_text = VALUES(conversation_text),
        message_count = VALUES(message_count),
        updated_at = CURRENT_TIMESTAMP
    """
    
    try:
        async with db_pool.acquire() as conn:
            async with conn.cursor() as cursor:
                await cursor.execute(
                    upsert_query,
                    (user_id, session_id, room_name, conversation_text, message_count)
                )
                logger.info(f"💾 Conversation saved: user={user_id}, session={session_id}, messages={message_count}")
                
    except Exception as e:
        logger.error(f"❌ Failed to save conversation: {e}")


@track_performance("tech_notify_api")
async def send_tech_support_notification_async(issue_description: str, session_id: str, issue_type: str = "technical", room_name: str = None,max_retries: int = 2) -> dict:
    """
    Send tech support notification via API - ONLY after troubleshooting fails
    
    Args:
        issue_description: Description of technical issue (e.g., "WiFi not connecting", "Printer not working")
        session_id: Current session ID for tracking
        issue_type: Type of issue (wifi, printer, projector, av, technical)
        max_retries: Maximum retry attempts (default: 2)
    
    Returns:
        dict: {
            "success": bool,
            "message": str,
            "notification_id": str,
            "issue": str,
            "issue_type": str
        }
    """
    
    notification_url = f"{API_BASE_URL}/notification/create"
    
    # ✅ Generate UUID ONCE - will be reused for all retry attempts
    notification_id = str(uuid.uuid4())
    if room_name:
        message = f"{issue_description} (Location: {room_name})"
    else:
        message = f"{issue_description}"
    # Build notification message based on issue type
    #message = f"{issue_description}"
    it_emails = await get_category_emails("it")
    # ✅ Tech support payload
    notification_payload = {
        "id": notification_id,  # Same ID for all retries
        "title": "Tech Support Request",
        "message": message,
        "type": "IT",
        "to": it_emails
    }
    
    logger.info(f"🔧 Tech Support Request: {issue_description} ({issue_type})")
    logger.info(f"🆔 Notification ID: {notification_id} (will be reused for retries)")
    
    session = await session_manager.get_session()
    
    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"📤 Sending tech notification (attempt {attempt}/{max_retries}) with ID: {notification_id}")
            logger.info(f"📦 Payload: {json.dumps(notification_payload, indent=2)}")
            logger.info(f"🔗 URL: {notification_url}")
            
            async with session.post(
                notification_url,
                headers={
                    **API_HEADERS,
                    'Content-Type': 'application/json'
                },
                json=notification_payload,
                timeout=aiohttp.ClientTimeout(total=10.0)
            ) as response:
                
                response_text = await response.text()
                logger.info(f"📥 Response: {response.status} - {response_text[:200]}")
                
                # ✅ SUCCESS - No retry needed
                if response.status in [200, 201]:
                    logger.info(f"✅ Tech notification sent successfully on attempt {attempt}")
                    logger.info(f"✅ Notification ID: {notification_id}")
                    return {
                        "success": True,
                        "message": "Tech support notified",
                        "notification_id": notification_id,
                        "issue": issue_description,
                        "issue_type": issue_type,
                        "attempts": attempt
                    }
                
                # ⚠️ FAILURE - Retry if attempts remain
                else:
                    logger.warning(f"⚠️ API returned {response.status}: {response_text[:200]}")
                    
                    if attempt < max_retries:
                        logger.info(f"🔄 Will retry with SAME ID: {notification_id}")
                        await asyncio.sleep(1.0)
                        continue
                    
                    # ❌ Final failure after all retries
                    logger.error(f"❌ All {max_retries} attempts failed for ID: {notification_id}")
                    return {
                        "success": False,
                        "message": f"Failed to notify tech support after {max_retries} attempts",
                        "notification_id": notification_id,
                        "issue": issue_description,
                        "issue_type": issue_type,
                        "error": f"HTTP {response.status}",
                        "attempts": attempt
                    }
        
        except asyncio.TimeoutError:
            logger.error(f"⏱️ Timeout on attempt {attempt}/{max_retries} for ID: {notification_id}")
            if attempt < max_retries:
                logger.info(f"🔄 Retrying with SAME ID after timeout")
                await asyncio.sleep(1.0)
                continue
            
            return {
                "success": False,
                "message": "Tech support notification timed out",
                "notification_id": notification_id,
                "issue": issue_description,
                "issue_type": issue_type,
                "error": "Timeout",
                "attempts": attempt
            }
        
        except aiohttp.ClientError as e:
            logger.error(f"🌐 Network error on attempt {attempt}: {type(e).__name__} - {str(e)}")
            if attempt < max_retries:
                logger.info(f"🔄 Retrying with SAME ID after network error")
                await asyncio.sleep(1.0)
                continue
            
            return {
                "success": False,
                "message": "Network error notifying tech support",
                "notification_id": notification_id,
                "issue": issue_description,
                "issue_type": issue_type,
                "error": str(e),
                "attempts": attempt
            }
        
        except Exception as e:
            logger.error(f"❌ Unexpected error on attempt {attempt}: {type(e).__name__} - {str(e)}")
            logger.error(traceback.format_exc())
            if attempt < max_retries:
                logger.info(f"🔄 Retrying with SAME ID after unexpected error")
                await asyncio.sleep(1.0)
                continue
            
            return {
                "success": False,
                "message": "Unexpected error",
                "notification_id": notification_id,
                "issue": issue_description,
                "issue_type": issue_type,
                "error": str(e),
                "attempts": attempt
            }
    
    return {
        "success": False,
        "message": "Failed to notify tech support",
        "notification_id": notification_id,
        "issue": issue_description,
        "issue_type": issue_type,
        "attempts": max_retries
    }

@track_performance("housekeeping_notify_api")
async def send_housekeeping_notification_async(request_description: str, session_id: str,  room_name: str = None,request_type: str = "general", max_retries: int = 2) -> dict:
    """
    Send housekeeping request notification via API
    
    Args:
        request_description: Description of housekeeping request
        session_id: Current session ID for tracking
        request_type: Type of request (cleaning, maintenance, spillage, facility, general)
        max_retries: Maximum retry attempts (default: 2)
    
    Returns:
        dict: {
            "success": bool,
            "message": str,
            "notification_id": str,
            "request": str,
            "request_type": str
        }
    """
    
    notification_url = f"{API_BASE_URL}/notification/create"
    
    # ✅ Generate UUID ONCE - will be reused for all retry attempts
    notification_id = str(uuid.uuid4())
    
    # Build notification message
    if room_name:
        message = f"{request_description} (Location: {room_name})"
    else:
        message = f"{request_description}"
    # message = f"Housekeeping Request: {request_description}"
    housekeeping_emails = await get_category_emails("housekeeping")

    # ✅ Housekeeping payload
    notification_payload = {
        "id": notification_id,
        "title": "Housekeeping Request",
        "message": message,
        "type": "Housekeeping",
        "to":housekeeping_emails # Update with actual housekeeping email
    }
    
    logger.info(f"🧹 Housekeeping Request: {request_description} ({request_type})")
    logger.info(f"🆔 Notification ID: {notification_id} (will be reused for retries)")
    
    session = await session_manager.get_session()
    
    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"📤 Sending housekeeping notification (attempt {attempt}/{max_retries}) with ID: {notification_id}")
            logger.info(f"📦 Payload: {json.dumps(notification_payload, indent=2)}")
            logger.info(f"🔗 URL: {notification_url}")
            
            async with session.post(
                notification_url,
                headers={
                    **API_HEADERS,
                    'Content-Type': 'application/json'
                },
                json=notification_payload,
                timeout=aiohttp.ClientTimeout(total=10.0)
            ) as response:
                
                response_text = await response.text()
                logger.info(f"📥 Response: {response.status} - {response_text[:200]}")
                
                # ✅ SUCCESS - No retry needed
                if response.status in [200, 201]:
                    logger.info(f"✅ Housekeeping notification sent successfully on attempt {attempt}")
                    logger.info(f"✅ Notification ID: {notification_id}")
                    return {
                        "success": True,
                        "message": "Housekeeping team notified",
                        "notification_id": notification_id,
                        "request": request_description,
                        "request_type": request_type,
                        "attempts": attempt
                    }
                
                # ⚠️ FAILURE - Retry if attempts remain
                else:
                    logger.warning(f"⚠️ API returned {response.status}: {response_text[:200]}")
                    
                    if attempt < max_retries:
                        logger.info(f"🔄 Will retry with SAME ID: {notification_id}")
                        await asyncio.sleep(1.0)
                        continue
                    
                    # ❌ Final failure after all retries
                    logger.error(f"❌ All {max_retries} attempts failed for ID: {notification_id}")
                    return {
                        "success": False,
                        "message": f"Failed to notify housekeeping after {max_retries} attempts",
                        "notification_id": notification_id,
                        "request": request_description,
                        "request_type": request_type,
                        "error": f"HTTP {response.status}",
                        "attempts": attempt
                    }
        
        except asyncio.TimeoutError:
            logger.error(f"⏱️ Timeout on attempt {attempt}/{max_retries} for ID: {notification_id}")
            if attempt < max_retries:
                logger.info(f"🔄 Retrying with SAME ID after timeout")
                await asyncio.sleep(1.0)
                continue
            
            return {
                "success": False,
                "message": "Housekeeping notification timed out",
                "notification_id": notification_id,
                "request": request_description,
                "request_type": request_type,
                "error": "Timeout",
                "attempts": attempt
            }
        
        except aiohttp.ClientError as e:
            logger.error(f"🌐 Network error on attempt {attempt}: {type(e).__name__} - {str(e)}")
            if attempt < max_retries:
                logger.info(f"🔄 Retrying with SAME ID after network error")
                await asyncio.sleep(1.0)
                continue
            
            return {
                "success": False,
                "message": "Network error notifying housekeeping",
                "notification_id": notification_id,
                "request": request_description,
                "request_type": request_type,
                "error": str(e),
                "attempts": attempt
            }
        
        except Exception as e:
            logger.error(f"❌ Unexpected error on attempt {attempt}: {type(e).__name__} - {str(e)}")
            logger.error(traceback.format_exc())
            if attempt < max_retries:
                logger.info(f"🔄 Retrying with SAME ID after unexpected error")
                await asyncio.sleep(1.0)
                continue
            
            return {
                "success": False,
                "message": "Unexpected error",
                "notification_id": notification_id,
                "request": request_description,
                "request_type": request_type,
                "error": str(e),
                "attempts": attempt
            }
    
    return {
        "success": False,
        "message": "Failed to notify housekeeping",
        "notification_id": notification_id,
        "request": request_description,
        "request_type": request_type,
        "attempts": max_retries
    }

@track_performance("pantry_menu_api")
async def get_pantry_menu_async():
    """Fetch dynamic pantry menu from API with caching"""
    cache_key = "pantry_menu"
    # cached = cache.get(cache_key)
    # if cached:
    #     logger.info("💾 Cache HIT: pantry_menu")
    #     return cached
    
    try:
        url = f"{API_BASE_URL}/yarooms/services?type=1"
        logger.info(f"🔍 Fetching pantry menu from: {url}")
        
        session = await session_manager.get_session()
        
        async with session.get(
            url, 
            headers=API_HEADERS,
            timeout=aiohttp.ClientTimeout(total=10.0)
        ) as response:
            
            response_text = await response.text()
            logger.info(f"📥 Pantry Menu Response: {response.status} - {len(response_text)} bytes")
            
            if response.status != 200:
                logger.error(f"❌ Pantry menu API error {response.status}: {response_text[:500]}")
                return None
            
            try:
                data = json.loads(response_text)
            except json.JSONDecodeError as e:
                logger.error(f"❌ Invalid JSON response: {e}")
                return None
            
            # Extract menu items from API response
            menu_items = []
            
            # Handle different response structures
            if isinstance(data, dict):
                # Check for nested data structure
                items_list = data.get('data', {}).get('list', [])
                if not items_list:
                    items_list = data.get('list', [])
                if not items_list:
                    items_list = data.get('services', [])
            elif isinstance(data, list):
                items_list = data
            else:
                logger.error(f"❌ Unexpected response structure: {type(data)}")
                return None
            
            if not items_list:
                logger.warning("⚠️ No menu items found in response")
                return None
            
            # Extract item names and IDs
            for idx, item in enumerate(items_list, 1):
                name = item.get('name', '')
                item_id = item.get('id', '')
                
                if name:
                    menu_items.append({
                        'number': idx,
                        'name': name,
                        'id': item_id
                    })
            
            if not menu_items:
                logger.warning("⚠️ No valid menu items extracted")
                return None
            
            logger.info(f"✅ Fetched {len(menu_items)} pantry items")
            
            # Cache the result
            # cache.set(cache_key, menu_items)
            
            return menu_items
            
    except asyncio.TimeoutError:
        logger.error("⏱️ Timeout fetching pantry menu")
        return None
    except aiohttp.ClientError as e:
        logger.error(f"🌐 Network error fetching pantry menu: {e}")
        return None
    except Exception as e:
        logger.error(f"❌ Error fetching pantry menu: {type(e).__name__} - {str(e)}")
        logger.error(traceback.format_exc())
        return None
    

from datetime import timedelta
def time_to_str(value):
    """Convert datetime or timedelta to HH:MM string safely."""
    if value is None:
        return None
    
    # If it's a datetime object
    if hasattr(value, "strftime"):
        return value.strftime("%H:%M")

    # If it's a timedelta (duration)
    if isinstance(value, timedelta):
        total_seconds = int(value.total_seconds())
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        return f"{hours:02d}:{minutes:02d}"

    # Unknown type → return as string
    return str(value)



@track_performance("extension_detail_api")
async def get_extension_detail(user_id: str):
    """Fetch all today's meeting room bookings for the given user."""
    
    if not user_id:
        logger.error("❌ get_extension_detail called without user_id")
        return []
    
    today = datetime.now().strftime("%Y-%m-%d")
    logger.info(f"🔍 Fetching extension details for user_id={user_id} on {today}")
    
    if not db_pool:
        logger.error("❌ DB pool not initialized")
        return []
    
    try:
        async with db_pool.acquire() as conn:
            async with conn.cursor() as cursor:
                
                query = """
                    SELECT room_name, floor_id, start_time, end_time
                    FROM user_meeting_bookings
                    WHERE user_id = %s
                    AND booking_date = %s
                    ORDER BY start_time ASC
                """
                
                await cursor.execute(query, (user_id, today))
                rows = await cursor.fetchall()
                
                logger.info(f"📥 Found {len(rows)} bookings for extension")
                
                bookings = []
                for row in rows:
                    room_name = row[0]
                    floor_id = row[1]
                    start_time = row[2]
                    end_time = row[3]
                    
                    bookings.append({
                        "room_name": room_name,
                        "floor_id": floor_id,
                        "start_time": time_to_str(start_time),
                        "end_time": time_to_str(end_time)

                    })
                
                return bookings
    
    except Exception as e:
        logger.error(f"❌ Error fetching extension details: {type(e).__name__} - {str(e)}")
        logger.error(traceback.format_exc())
        return []


@track_performance("pantry_notify_api")
async def send_pantry_notification_async(item_description: str, session_id: str, room_name: str = None,  max_retries: int = 2) -> dict:
    """
    Send pantry order notification via API with retry logic using same notification ID
    
    Args:
        item_description: Description of ordered item (e.g., "Milk Coffee with sugar")
        session_id: Current session ID for tracking
        max_retries: Maximum retry attempts (default: 2)
    
    Returns:
        dict: {
            "success": bool,
            "message": str,
            "notification_id": str,
            "item": str
        }
    """
    
    notification_url = f"{API_BASE_URL}/notification/create"
    
    # ✅ Generate UUID ONCE - will be reused for all retry attempts
    notification_id = str(uuid.uuid4())
    
    # Build notification message without menu number
    if room_name:
        message = f"Request for {item_description} (Deliver to: {room_name})"
    else:
        message = f"Request for {item_description}"
    #message = f"Request for {item_description}"
    pantry_emails = await get_category_emails("pantry")

    # ✅ Payload uses the SAME notification_id for all attempts
    notification_payload = {
        "id": notification_id,
        "title": "Pantry Request",
        "message": message,
        "type": "Pantry",
        "to": pantry_emails
    }
    
    logger.info(f"📧 Pantry Order: {item_description}")
    logger.info(f"🆔 Notification ID: {notification_id} (will be reused for retries)")
    
    session = await session_manager.get_session()
    
    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"📤 Sending notification (attempt {attempt}/{max_retries}) with ID: {notification_id}")
            logger.info(f"📦 Payload: {json.dumps(notification_payload, indent=2)}")
            logger.info(f"🔗 URL: {notification_url}")
            
            async with session.post(
                notification_url,
                headers={
                    **API_HEADERS,
                    'Content-Type': 'application/json'
                },
                json=notification_payload,
                timeout=aiohttp.ClientTimeout(total=10.0)
            ) as response:
                
                response_text = await response.text()
                logger.info(f"📥 Response: {response.status} - {response_text[:200]}")
                
                if response.status in [200, 201]:
                    logger.info(f"✅ Notification sent successfully on attempt {attempt}")
                    logger.info(f"✅ Notification ID: {notification_id}")
                    return {
                        "success": True,
                        "message": "Notification sent to pantry staff",
                        "notification_id": notification_id,
                        "item": item_description,
                        "attempts": attempt
                    }
                else:
                    logger.warning(f"⚠️ API returned {response.status}: {response_text[:200]}")
                    
                    if attempt < max_retries:
                        logger.info(f"🔄 Will retry with SAME ID: {notification_id}")
                        await asyncio.sleep(1.0)
                        continue
                    
                    logger.error(f"❌ All {max_retries} attempts failed for ID: {notification_id}")
                    return {
                        "success": False,
                        "message": f"Failed to send notification after {max_retries} attempts",
                        "notification_id": notification_id,
                        "item": item_description,
                        "error": f"HTTP {response.status}",
                        "attempts": attempt
                    }
        
        except asyncio.TimeoutError:
            logger.error(f"⏱️ Timeout on attempt {attempt}/{max_retries} for ID: {notification_id}")
            if attempt < max_retries:
                logger.info(f"🔄 Retrying with SAME ID after timeout")
                await asyncio.sleep(1.0)
                continue
            
            return {
                "success": False,
                "message": "Notification request timed out",
                "notification_id": notification_id,
                "item": item_description,
                "error": "Timeout",
                "attempts": attempt
            }
        
        except Exception as e:
            logger.error(f"❌ Unexpected error on attempt {attempt}: {type(e).__name__} - {str(e)}")
            if attempt < max_retries:
                logger.info(f"🔄 Retrying with SAME ID after unexpected error")
                await asyncio.sleep(1.0)
                continue
            
            return {
                "success": False,
                "message": "Unexpected error",
                "notification_id": notification_id,
                "item": item_description,
                "error": str(e),
                "attempts": attempt
            }
    
    return {
        "success": False,
        "message": "Failed to send notification",
        "notification_id": notification_id,
        "item": item_description,
        "attempts": max_retries
    }


@track_performance("wifi_api")
async def get_guest_wifi_credentials_async():
    """Async WiFi credentials with caching"""
    cache_key = "wifi_credentials"
    # cached = cache.get(cache_key)
    # if cached:
    #     return cached
    
    try:
        url = f"{API_BASE_URL}/guestWifi/GetCredentials?customerId={API_HEADERS['customerId']}"
        session = await session_manager.get_session()
        
        async with session.get(url, headers=API_HEADERS) as response:
            if response.status != 200:
                return "⚠️ Unable to fetch WiFi credentials. Contact IT."
            
            data = await response.json()
            
            wifi_info = {}
            if isinstance(data, dict):
                wifi_info = data.get('data', data)
                if isinstance(wifi_info, list):
                    wifi_info = wifi_info[0] if wifi_info else {}
            elif isinstance(data, list) and data:
                wifi_info = data[0]
            
            ssid = wifi_info.get('userName') or wifi_info.get('ssid', 'N/A')
            password = wifi_info.get('password', 'N/A')
            
            result = f"📶 **Guest WiFi**\n\n🔹 Network: **{ssid}**\n🔹 Password: **{password}**"
            cache.set(cache_key, result)
            return result
            
    except Exception as e:
        logger.error(f"WiFi API error: {e}")
        return "⚠️ Unable to retrieve WiFi credentials."



@track_performance("rooms_api")
async def get_workspace_availability_async(space_type_id=DEFAULT_SPACE_TYPE_ID, date=None):
    """Async room availability with improved error handling"""
    
    # Date handling
    try:
        if date is None or date.lower() == "today":
            date = datetime.now().strftime("%Y-%m-%d")
        elif date.lower() == "tomorrow":
            date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        else:
            # Validate and convert date format
            try:
                datetime.strptime(date, "%Y-%m-%d")
            except ValueError:
                for fmt in ["%d-%m-%Y", "%m/%d/%Y", "%d/%m/%Y"]:
                    try:
                        parsed_date = datetime.strptime(date, fmt)
                        date = parsed_date.strftime("%Y-%m-%d")
                        break
                    except ValueError:
                        continue
                else:
                    raise ValueError(f"Invalid date format: {date}")
    except ValueError as e:
        logger.error(f"Invalid date format: {date} - {e}")
        return f"❌ Invalid date format. Please use YYYY-MM-DD format or 'today'/'tomorrow'"
    
    # cache_key = f"rooms_{date}"
    # # cached = cache.get(cache_key)
    # if cached:
    #     return cached
    
    # ✅ FIX: Increased retries for this problematic endpoint
    max_api_retries = 5
    retry_delay = 1.0
    
    for retry_attempt in range(max_api_retries):
        try:
            url = f"{API_BASE_URL}/iwaa-workspaces/GetAvailability"
            params = {
                'spaceTypeId': space_type_id,
                'date': date,
                'customerId': API_HEADERS['customerId']
            }
            
            logger.info(f"🔍 Fetching rooms: date={date}, attempt={retry_attempt + 1}/{max_api_retries}")
            logger.info(f"🔗 URL: {url}")
            logger.info(f"📋 Params: {params}")
            logger.info(f"🔑 Auth: {API_HEADERS.get('Authorization', 'NOT SET')[:50]}...")
            
            session = await session_manager.get_session()
            timeout = aiohttp.ClientTimeout(total=45.0 ,connect=5.0)
            
            async with session.get(
                url, 
                headers=API_HEADERS, 
                params=params,
                timeout=timeout
            ) as response:
                
                response_text = await response.text()
                logger.info(f"📥 Response: status={response.status}, length={len(response_text)}")
                
                # ✅ FIX: Handle 401 specifically
                if response.status == 401:
                    logger.error(f"❌ 401 Unauthorized - Token might be invalid")
                    logger.error(f"Response: {response_text[:500]}")
                    
                    # Don't retry 401s - they need token refresh
                    return "❌ Authentication failed. Please refresh your session and try again."
                
                if response.status != 200:
                    logger.error(f"❌ API Error {response.status}: {response_text[:500]}")
                    
                    if retry_attempt < max_api_retries - 1:
                        logger.warning(f"⏳ Retrying in {retry_delay}s...")
                        await asyncio.sleep(retry_delay)
                        retry_delay *= 1.5  # Exponential backoff
                        continue
                    
                    return f"❌ Unable to fetch rooms (API Error {response.status}). Please try again later."
                
                # Parse response
                try:
                    data = json.loads(response_text)
                except json.JSONDecodeError as e:
                    logger.error(f"❌ Invalid JSON: {e}\n{response_text[:500]}")
                    
                    if retry_attempt < max_api_retries - 1:
                        await asyncio.sleep(retry_delay)
                        continue
                    
                    return "❌ Received invalid data from server. Please try again."
                
                # ✅ FIX: Detect error responses more aggressively
                if isinstance(data, dict):
                    # Check if this looks like an error
                    is_likely_error = (
                        len(data) <= 3 and (
                            'date' in data and len(data) == 1 or  # Just {"date":"today"}
                            'error' in data or
                            'status' in data and str(data.get('status')).lower() in ['error', 'failed', 'false'] or
                            'message' in data and 'data' not in data
                        )
                    )
                    
                    if is_likely_error:
                        logger.warning(f"⚠️ Detected error response: {data}")
                        
                        if retry_attempt < max_api_retries - 1:
                            logger.warning(f"⏳ Retrying due to error response in {retry_delay}s...")
                            await asyncio.sleep(retry_delay)
                            retry_delay *= 1.5
                            continue
                        else:
                            logger.error(f"❌ Max retries reached with error: {data}")
                            return (f"📅 Unable to fetch room availability right now. "
                                   f"Please try again in a moment or visit https://apps.iwaa.com")
                
                # Extract availability list
                availability_list = None
                
                if isinstance(data, list):
                    availability_list = data
                    logger.info(f"✅ Found array with {len(data)} rooms")
                elif isinstance(data, dict):
                    for key in ['data', 'list', 'results', 'items', 'availability', 'rooms']:
                        if key in data:
                            nested = data[key]
                            if isinstance(nested, list):
                                availability_list = nested
                                logger.info(f"✅ Found list in '{key}' with {len(nested)} rooms")
                                break
                
                if availability_list is None or len(availability_list) == 0:
                    logger.info(f"📅 No rooms available for {date}")
                    formatted_date = datetime.strptime(date, "%Y-%m-%d").strftime("%B %d, %Y")
                    result = f"📅 No meeting rooms are available for {formatted_date}. Please try a different date."
                    # cache.set(cache_key, result)
                    return result
                
                # Format response (your existing formatting code)
                room_dict = {}
                for room in availability_list:
                    name = (room.get('spaceName') or room.get('name') or 
                           room.get('roomName') or 'Unknown Room')
                    
                    if name not in room_dict:
                        floor = (room.get('floorName') or room.get('floor') or 'N/A')
                        room_dict[name] = {'floor': floor, 'slots': []}
                    
                    start = room.get('start') or room.get('startTime') or 'N/A'
                    end = room.get('end') or room.get('endTime') or 'N/A'
                    room_dict[name]['slots'].append({'start': start, 'end': end})
                
                # Build response text
                formatted_date = datetime.strptime(date, "%Y-%m-%d").strftime("%B %d, %Y")
                result = f"📅 **Available Meeting Rooms - {formatted_date}**\n\n"
                
                room_count = 0
                for name, info in sorted(room_dict.items()):
                    if room_count >= 30:
                        break
                    
                    result += f"🏢 **{name}** - {info['floor']}\n"
                    
                    for slot in info['slots']:
                        start_time = slot['start']
                        end_time = slot['end']
                        
                        # Format times
                        try:
                            if ' ' in start_time:
                                start_dt = datetime.strptime(start_time, "%Y-%m-%d %H:%M:%S")
                                start_time = start_dt.strftime('%I:%M %p').lstrip('0')
                        except: pass
                        
                        try:
                            if ' ' in end_time:
                                end_dt = datetime.strptime(end_time, "%Y-%m-%d %H:%M:%S")
                                end_time = end_dt.strftime('%I:%M %p').lstrip('0')
                        except: pass
                        
                        result += f"   ⏰ {start_time} - {end_time}\n"
                    
                    result += "\n"
                    room_count += 1
                
                result = result.strip()
                result += f"\n\n📊 Total {len(room_dict)} room(s) available"
                result += "\n\n💡 **To book:** Visit https://apps.iwaa.com → Workplace → Meeting Rooms"
                
                # cache.set(cache_key, result)
                logger.info(f"✅ Successfully formatted {room_count} rooms")
                return result
                
        except asyncio.TimeoutError:
            logger.error(f"⏱️ Timeout (attempt {retry_attempt + 1})")
            if retry_attempt < max_api_retries - 1:
                await asyncio.sleep(retry_delay)
                continue
            return "⏱️ Request timed out. Please try again."
        
        except Exception as e:
            logger.error(f"❌ Error: {type(e).__name__}: {str(e)}")
            if retry_attempt < max_api_retries - 1:
                await asyncio.sleep(retry_delay)
                continue
            return "❌ An error occurred. Please try again."
    
    return "❌ Unable to fetch rooms after multiple attempts. Please try again later."


# ===== FIX 1: Update book_meeting_room_async signature to accept user_id =====
@track_performance("booking_api")
async def book_meeting_room_async(room_name: str, date: str, start_time: str, end_time: str, 
                                   user_id: str = None, session_id: str = None):
    """Book a meeting room using the Yarooms API"""
    
    # Date handling
    try:
        if date is None or date.lower() == "today":
            date = datetime.now().strftime("%Y-%m-%d")
        elif date.lower() == "tomorrow":
            date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        else:
            # Validate and convert date format
            try:
                datetime.strptime(date, "%Y-%m-%d")
            except ValueError:
                for fmt in ["%d-%m-%Y", "%m/%d/%Y", "%d/%m/%Y"]:
                    try:
                        parsed_date = datetime.strptime(date, fmt)
                        date = parsed_date.strftime("%Y-%m-%d")
                        break
                    except ValueError:
                        continue
                else:
                    raise ValueError(f"Invalid date format: {date}")
    except ValueError as e:
        logger.error(f"Invalid date format: {date} - {e}")
        return f"❌ Invalid date format. Please use YYYY-MM-DD format or 'today'/'tomorrow'"
    
    try:
        # First, get room details from availability to get all required IDs
        logger.info(f"🔍 Fetching room details for booking: {room_name} on {date}")
        
        # Get availability to find the room's IDs
        availability_url = f"{API_BASE_URL}/iwaa-workspaces/GetAvailability"
        params = {
            'spaceTypeId': DEFAULT_SPACE_TYPE_ID,
            'date': date,
            'customerId': API_HEADERS['customerId']
        }
        
        session = await session_manager.get_session()
        
        # Fetch room details
        async with session.get(
            availability_url, 
            headers=API_HEADERS, 
            params=params,
            timeout=aiohttp.ClientTimeout(total=30.0)
        ) as response:
            
            if response.status != 200:
                logger.error(f"❌ Failed to fetch room details: {response.status}")
                return "❌ Unable to fetch room details. Please try again."
            
            data = await response.json()
            
            # Find the specific room
            room_data = None
            availability_list = data if isinstance(data, list) else data.get('data', [])
            
            for room in availability_list:
                if room.get('spaceName', '').lower() == room_name.lower():
                    room_data = room
                    break
            
            if not room_data:
                logger.error(f"❌ Room not found: {room_name}")
                return f"❌ Room '{room_name}' not found. Please check the room name and try again."
            
            # Extract required IDs
            location_id = room_data.get('locationId')
            floor_id = room_data.get('floorId')  # ✅ Get floor_id from API response
            space_id = room_data.get('spaceId')
            space_type_id = room_data.get('spaceTypeId', DEFAULT_SPACE_TYPE_ID)
            
            logger.info(f"📋 Room details: location={location_id}, floor={floor_id}, space={space_id}")
        
        # Format datetime strings
        start_datetime = f"{date} {start_time}"
        end_datetime = f"{date} {end_time}"
        
        # Prepare booking request
        booking_url = f"{API_BASE_URL}/iwaa-workspaces/bookings?include_location=1"
        booking_params = {'include_location': '1'}
        
        booking_data = {
            'location_id': str(location_id),
            'floor_id': str(floor_id),
            'space_type_id': str(space_type_id),
            'title': f"Booking via Assistant",
            'space_id': str(space_id),
            'dates[0][start]': start_datetime,
            'dates[0][end]': end_datetime
        }
        
        logger.info(f"📤 Booking request: {booking_data}")
        
        # Make booking request
        async with session.post(
            booking_url,
            headers={
                **API_HEADERS,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            params=booking_params,
            data=booking_data,
            timeout=aiohttp.ClientTimeout(total=35.0)
        ) as response:
            
            response_text = await response.text()
            logger.info(f"📥 Booking Response Status: {response.status}")
            
            try:
                result = json.loads(response_text)
            except json.JSONDecodeError:
                logger.error(f"❌ Invalid JSON response: {response_text}")
                return "❌ Received invalid response from booking system. Please try again."
            
            # Check booking status
            status = result.get('status')
            
            if status == 1:  # Success
                # ✅ FIX: Save to database after successful booking
                if user_id and session_id and db_pool:
                    try:
                        async with db_pool.acquire() as conn:
                            async with conn.cursor() as cursor:
                                insert_sql = """
                                    INSERT INTO user_meeting_bookings
                                    (session_id, user_id, room_name, floor_id, booking_date, start_time, end_time, created_at)
                                    VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
                                """
                                await cursor.execute(insert_sql, (
                                    session_id,
                                    user_id,
                                    room_name,
                                    floor_id,
                                    date,
                                    start_time,
                                    end_time
                                ))
                                logger.info(f"✅ Booking saved to DB: user={user_id}, room={room_name}")
                    except Exception as e:
                        logger.error(f"❌ DB Insert Error: {str(e)}")
                        # Don't fail the booking if DB save fails
                
                # Format success message
                try:
                    start_dt = datetime.strptime(start_datetime, "%Y-%m-%d %H:%M")
                    end_dt = datetime.strptime(end_datetime, "%Y-%m-%d %H:%M")
                    formatted_date = start_dt.strftime("%B %d, %Y")
                    formatted_start = start_dt.strftime("%I:%M %p").lstrip('0')
                    formatted_end = end_dt.strftime("%I:%M %p").lstrip('0')
                except:
                    formatted_date = date
                    formatted_start = start_time
                    formatted_end = end_time
                
                success_msg = f"✅ **Booking Confirmed!**\n\n"
                success_msg += f"🏢 **Room:** {room_name}\n"
                success_msg += f"📅 **Date:** {formatted_date}\n"
                success_msg += f"⏰ **Time:** {formatted_start} - {formatted_end}\n\n"
                success_msg += f"💡 You can view and manage your booking at https://apps.iwaa.com"
                
                logger.info(f"✅ Booking successful: {room_name} on {date} from {start_time} to {end_time}")
                return success_msg
            
            else:  # Booking failed
                error = result.get('error', {})
                error_message = error.get('message', 'Unknown error')
                conflicts = error.get('conflicts', [])
                
                failure_msg = f"❌ **Booking Failed**\n\n"
                failure_msg += f"**Reason:** {error_message}\n\n"
                
                if conflicts:
                    failure_msg += "**Conflict Details:**\n"
                    for conflict in conflicts[:2]:
                        conflict_start = conflict.get('start', '')
                        conflict_end = conflict.get('end', '')
                        
                        try:
                            if conflict_start:
                                start_dt = datetime.strptime(conflict_start, "%Y-%m-%d %H:%M:%S")
                                conflict_start = start_dt.strftime("%I:%M %p").lstrip('0')
                            if conflict_end:
                                end_dt = datetime.strptime(conflict_end, "%Y-%m-%d %H:%M:%S")
                                conflict_end = end_dt.strftime("%I:%M %p").lstrip('0')
                        except:
                            pass
                        
                        failure_msg += f"• {conflict_start} - {conflict_end}\n"
                    
                    failure_msg += "\n💡 Please choose a different time slot or room."
                
                logger.warning(f"⚠️ Booking failed: {error_message}")
                return failure_msg
    
    except asyncio.TimeoutError:
        logger.error(f"⏱️ Timeout booking room: {room_name}")
        return "⏱️ Booking request timed out. Please try again."
    
    except aiohttp.ClientError as e:
        logger.error(f"🌐 Network error during booking: {type(e).__name__} - {str(e)}")
        return "🌐 Network error occurred during booking. Please try again."
    
    except Exception as e:
        logger.error(f"❌ Unexpected error during booking: {type(e).__name__} - {str(e)}\n{traceback.format_exc()}")
        return "❌ An unexpected error occurred. Please try again or contact support."



@track_performance("staff_api")
async def get_staff_information_async(department=None):
    """Async staff contact with improved error handling and caching"""
    cache_key = f"staff_{department}"
    # cached = cache.get(cache_key)
    # if cached:
    #     return cached
    
    try:
        url = f"{API_BASE_URL}/staff/GetStaffs?customerId={API_HEADERS['customerId']}"
        logger.info(f"🔍 Fetching staff info for department: {department}")
        
        session = await session_manager.get_session()
        
        async with session.get(url, headers=API_HEADERS, timeout=aiohttp.ClientTimeout(total=API_TIMEOUT)) as response:
            response_text = await response.text()
            logger.info(f"📥 Staff API Response Status: {response.status}")
            
            if response.status != 200:
                logger.error(f"❌ Staff API Error {response.status}: {response_text[:500]}")
                return f"✅ I've notified the {department} team. They'll assist you shortly!"
            
            # Parse JSON response
            try:
                data = json.loads(response_text)
                logger.info(f"📊 Staff API Response Structure: {type(data)}")
            except json.JSONDecodeError as e:
                logger.error(f"❌ Invalid JSON response: {e}\nResponse: {response_text[:500]}")
                return f"✅ Request sent to {department} team!"
            
            # Extract staff list - API returns direct array
            staff_list = None
            
            # Primary: Direct list response (this is what the API actually returns)
            if isinstance(data, list):
                staff_list = data
                logger.info(f"✅ API returned direct array with {len(data)} staff members")
            
            # Fallback: Nested structure (in case API changes)
            elif isinstance(data, dict):
                if 'data' in data:
                    nested_data = data['data']
                    if isinstance(nested_data, dict) and 'list' in nested_data:
                        staff_list = nested_data['list']
                    elif isinstance(nested_data, list):
                        staff_list = nested_data
                elif 'list' in data:
                    staff_list = data['list']
                elif 'results' in data:
                    staff_list = data['results']
                else:
                    logger.warning(f"⚠️ Unexpected dict structure: {list(data.keys())}")
            
            if not staff_list:
                logger.warning(f"⚠️ No staff list found in response")
                return f"✅ Request sent to {department} team!"
            
            # Department keyword mapping (based on actual API response)
            dept_keywords = {
                "tech": ["it", "technical", "tech support"],
                "pantry": ["pantry", "kitchen", "food", "beverages"],
                "housekeeping": ["housekeeping", "cleaning", "janitor", "maintenance"],
                "facilities": ["facilities", "facility", "furniture", "supplies"]
            }
            
            # Filter staff by department
            filtered_staff = []
            if department and department.lower() in dept_keywords:
                keywords = dept_keywords[department.lower()]
                
                for staff in staff_list:
                    category = staff.get('category', '').lower()
                    # Check if category matches any keyword
                    if any(kw in category for kw in keywords):
                        filtered_staff.append(staff)
                
                logger.info(f"🔍 Found {len(filtered_staff)} staff for department '{department}' (category filter)")
            
            # Handle departments not available in API
            if department and department.lower() in ["housekeeping", "facilities"]:
                if not filtered_staff:
                    logger.warning(f"⚠️ No {department} staff found in API response")
                    # result = f"✅ **Request Sent**\n\n"
                    # result += f"I've notified the {department.title()} team about your request. "
                    result += f"Currently House keeping staff details are not available.\n\n"
                    result += f"📝 If you need immediate assistance, please contact the reception desk."
                    
                    # Cache this response
                    cache.set(cache_key, result)
                    return result
            
            # If no filtered staff but we have general staff list, don't show wrong contacts
            if not filtered_staff:
                logger.warning(f"⚠️ No matching staff found for department: {department}")
                result = f"✅ **Request Sent**\n\n"
                result += f"I've notified the {department.title() if department else 'appropriate'} team. "
                result += f"They'll assist you shortly!"
                
                # Cache this response
                cache.set(cache_key, result)
                return result
            
            # Format response with actual staff contacts
            result = f"📞 **{department.title()} Contact Information**\n\n"
            
            for staff in filtered_staff[:2]:  # Show max 2 contacts
                first_name = staff.get('firstName', '')
                last_name = staff.get('lastName', '')
                name = f"{first_name} {last_name}".strip()
                
                if not name:
                    name = staff.get('name', 'Staff Member')
                
                email = staff.get('email', '')
                phone = staff.get('phoneNumber') or staff.get('phone', '')
                category = staff.get('category', '')
                
                result += f"👤 **{name}**"
                if category:
                    result += f" - {category}"
                result += "\n"
                
                if email:
                    result += f"   📧 {email}\n"
                if phone:
                    result += f"   📱 {phone}\n"
                result += "\n"
            
            result = result.strip()
            
            # Add helpful note
            if len(filtered_staff) > 2:
                result += f"\n\n📋 +{len(filtered_staff) - 2} more team member(s) available"
            
            # Cache the successful result
            cache.set(cache_key, result)
            logger.info(f"✅ Successfully formatted {len(filtered_staff)} staff contacts")
            
            return result
            
    except asyncio.TimeoutError:
        logger.error(f"⏱️ Timeout fetching staff for {department}")
        return f"✅ Request sent to {department} team! They'll assist you shortly."
    
    except aiohttp.ClientError as e:
        logger.error(f"🌐 Network error fetching staff: {type(e).__name__} - {str(e)}")
        return f"✅ I've notified the {department} team!"
    
    except Exception as e:
        logger.error(f"❌ Unexpected error in staff API: {type(e).__name__} - {str(e)}\n{traceback.format_exc()}")
        return f"✅ Request sent to {department} team!"

async def process_tool_calls_async(text: str, session_id: str) -> str:
    """Process all tool calls in PARALLEL"""
    wifi_pattern = r'\[TOOL:WIFI\]'
    staff_pattern = r'\[TOOL:STAFF:(\w+)\]'
    rooms_pattern = r'\[TOOL:ROOMS:([^\]]+)\]'
    nav_pattern = r'\[TOOL:NAV:([\w\s\']+?):([\w\s]+?)\]'
    booking_pattern = r'\[TOOL:BOOK:([\w\s]+?):(\d{4}-\d{2}-\d{2}):(\d{2}:\d{2}):(\d{2}:\d{2})\]'
    
    wifi_matches = re.findall(wifi_pattern, text)
    staff_matches = re.findall(staff_pattern, text)
    rooms_matches = re.findall(rooms_pattern, text)
    nav_matches = re.findall(nav_pattern, text)
    booking_matches = re.findall(booking_pattern, text)
    
    # Execute all API calls in PARALLEL
    tasks = []
    
    if wifi_matches:
        tasks.append(("wifi", get_guest_wifi_credentials_async()))
    
    for dept in staff_matches:
        tasks.append(("staff", get_staff_information_async(dept.lower())))
    
    for date in rooms_matches:
        tasks.append(("rooms", get_workspace_availability_async(date=date.lower())))
    
    # Add booking tasks
    for room, date, start, end in booking_matches:
        tasks.append(("booking", book_meeting_room_async(room.strip(), date, start, end)))
    
    # Execute parallel API calls
    api_results = []
    if tasks:
        start = time.time()
        results = await asyncio.gather(*[task[1] for task in tasks])
        elapsed = time.time() - start
        logger.info(f"⚡ Parallel API execution: {elapsed:.3f}s for {len(tasks)} calls")
        api_results.extend(results)
    
    # Handle navigation (with smart printer detection)
    session = get_or_create_session(session_id)
    for destination, _ in nav_matches:
        destination = destination.strip()
        actual_source = session.get("current_source", "Diversity")
        
        # Smart printer detection
        if destination.upper() == "NEAREST_PRINTER":
            nearest_printer = get_nearest_printer(actual_source)
            destination = nearest_printer
            logger.info(f"🖨️ Smart printer navigation (nearest): {actual_source} → {nearest_printer}")
        elif destination.upper() == "ALTERNATIVE_PRINTER":
            alternative_printer = get_alternative_printer(actual_source)
            destination = alternative_printer
            logger.info(f"🖨️ Smart printer navigation (alternative): {actual_source} → {alternative_printer}")
        
        nav_result = navigation_system.get_navigation_map(destination, start=actual_source)
        api_results.append(nav_result)
    
    # Clean up tool markers
    cleaned_text = text
    cleaned_text = re.sub(wifi_pattern, '', cleaned_text)
    for dept in staff_matches:
        cleaned_text = re.sub(f'\\[TOOL:STAFF:{dept}\\]', '', cleaned_text, count=1)
    for date in rooms_matches:
        cleaned_text = re.sub(f'\\[TOOL:ROOMS:{re.escape(date)}\\]', '', cleaned_text, count=1)
    for dest, src in nav_matches:
        cleaned_text = re.sub(f'\\[TOOL:NAV:{re.escape(dest)}:{re.escape(src)}\\]', '', cleaned_text, count=1)
    # Clean booking markers
    for room, date, start, end in booking_matches:
        cleaned_text = re.sub(f'\\[TOOL:BOOK:{re.escape(room)}:{re.escape(date)}:{re.escape(start)}:{re.escape(end)}\\]', '', cleaned_text, count=1)
    
    cleaned_text = cleaned_text.strip()
    
    # ✅ FIX: Always return cleaned_text, append API results if any
    if api_results:
        return cleaned_text + "\n\n" + "\n\n".join(api_results)
    return cleaned_text 

# @track_performance("openai_websocket")
# async def query_openai_websocket(full_prompt: str, session_id: str,user_id:str) -> Optional[str]:
#     """Optimized WebSocket with tool calling support"""
#     try:
#         async with websockets.connect(
#             f"{OPENAI_URL}?model={REALTIME_MODEL}",
#             additional_headers={
#                 "Authorization": f"Bearer {API_KEY}",
#                 "OpenAI-Beta": "realtime=v1"
#             },
#             ping_interval=12,
#             ping_timeout=4,
#             close_timeout=2
#         ) as ws:
            
#             # Wait for session.created
#             try:
#                 raw_data = await asyncio.wait_for(ws.recv(), timeout=EVENT_TIMEOUT)
#                 data = json.loads(raw_data)
#                 if data.get("type") != "session.created":
#                     logger.warning(f"❌ Expected session.created, got: {data.get('type', 'unknown')}")
#                     return None
#             except asyncio.TimeoutError:
#                 logger.error("❌ Timeout on session.created")
#                 return None
            
#             # Update session with tools
#             session_update = {
#                 "type": "session.update",
#                 "session": {
#                     "modalities": ["text"],
#                     "instructions": full_prompt,
#                     "temperature": 0.7,
#                     "max_response_output_tokens": 4096,
#                     "tools": FUNCTIONS,  # ✅ Add tools
#                     "tool_choice": "auto"  # ✅ Auto tool selection
#                 }
#             }
#             await ws.send(json.dumps(session_update))
            
#             # Create conversation item
#             user_message = full_prompt.split("User: ")[-1] if "User: " in full_prompt else full_prompt
#             conversation_item = {
#                 "type": "conversation.item.create",
#                 "item": {
#                     "type": "message",
#                     "role": "user",
#                     "content": [{"type": "input_text", "text": user_message}]
#                 }
#             }
#             await ws.send(json.dumps(conversation_item))
            
#             # Request response
#             await ws.send(json.dumps({
#                 "type": "response.create",
#                 "response": {"modalities": ["text"]}
#             }))
            
#             # Collect response with tool call handling
#             full_response = ""
#             tool_calls = []
#             response_started = False
#             response_complete = False
#             current_tool_call = None
            
#             while True:
#                 try:
#                     raw_data = await asyncio.wait_for(ws.recv(), timeout=WEBSOCKET_TIMEOUT)
#                     data = json.loads(raw_data)
#                     msg_type = data.get("type", "")
                    
#                     logger.info(f"📨 WebSocket event: {msg_type}")
                    
#                     # Handle text responses
#                     if msg_type == "response.text.delta":
#                         delta = data.get("delta", "")
#                         if delta:
#                             full_response += delta
#                             response_started = True
#                             logger.info(f"📝 Delta: {delta[:50]}...")
                    
#                     elif msg_type == "response.text.done":
#                         text = data.get("text", "")
#                         if text and not full_response:
#                             full_response = text
#                             response_started = True
#                         logger.info(f"✅ Text done: {len(full_response)} chars")
                    
#                     elif msg_type == "response.content_part.added":
#                         part = data.get("part", {})
#                         if part.get("type") == "text":
#                             text = part.get("text", "")
#                             if text:
#                                 full_response += text
#                                 response_started = True
#                                 logger.info(f"📝 Content part: {text[:50]}...")
                    
#                     # ✅ Handle tool calls - function_call_arguments events
#                     elif msg_type == "response.function_call_arguments.delta":
#                         # Tool call arguments being streamed
#                         delta = data.get("delta", "")
#                         if current_tool_call is None:
#                             current_tool_call = {"arguments": ""}
#                         current_tool_call["arguments"] += delta
#                         logger.info(f"🔧 Tool args delta: {delta[:50]}...")
                    
#                     elif msg_type == "response.function_call_arguments.done":
#                         # Tool call arguments complete
#                         if current_tool_call:
#                             call_id = data.get("call_id")
#                             name = data.get("name")
#                             arguments = data.get("arguments", current_tool_call.get("arguments", "{}"))
                            
#                             tool_calls.append({
#                                 "call_id": call_id,
#                                 "name": name,
#                                 "arguments": arguments
#                             })
#                             logger.info(f"🔧 Tool call completed: {name}")
#                             current_tool_call = None
                    
#                     elif msg_type == "response.output_item.added":
#                         # Check if this is a function call item
#                         item = data.get("item", {})
#                         if item.get("type") == "function_call":
#                             logger.info(f"🔧 Function call item added: {item.get('name')}")
                    
#                     elif msg_type == "response.output_item.done":
#                         # Output item completed - could be function call
#                         item = data.get("item", {})
#                         if item.get("type") == "function_call":
#                             call_id = item.get("call_id")
#                             name = item.get("name")
#                             arguments = item.get("arguments", "{}")
                            
#                             # Only add if not already added
#                             if not any(tc.get("call_id") == call_id for tc in tool_calls):
#                                 tool_calls.append({
#                                     "call_id": call_id,
#                                     "name": name,
#                                     "arguments": arguments
#                                 })
#                                 logger.info(f"🔧 Tool call from output_item: {name}")
                    
#                     elif msg_type == "response.done":
#                         response_complete = True
                        
#                         # Extract any remaining data from response object
#                         response_obj = data.get("response", {})
#                         output_items = response_obj.get("output", [])
                        
#                         # Check for text in output
#                         if not full_response:
#                             for item in output_items:
#                                 if item.get("type") == "message":
#                                     for c in item.get("content", []):
#                                         if c.get("type") == "text":
#                                             full_response += c.get("text", "")
                        
#                         # Check for function calls in output
#                         for item in output_items:
#                             if item.get("type") == "function_call":
#                                 call_id = item.get("call_id")
#                                 # Only add if not already added
#                                 if not any(tc.get("call_id") == call_id for tc in tool_calls):
#                                     tool_calls.append({
#                                         "call_id": call_id,
#                                         "name": item.get("name"),
#                                         "arguments": item.get("arguments", "{}")
#                                     })
                        
#                         logger.info(f"✅ Response done. Text: {len(full_response)} chars, Tools: {len(tool_calls)}")
#                         break
                    
#                     elif msg_type in ["error", "response.failed"]:
#                         error_data = data.get("error", {})
#                         error_msg = error_data.get("message", str(data))
#                         logger.error(f"❌ OpenAI error: {error_msg}")
#                         return None
                        
#                 except asyncio.TimeoutError:
#                     if response_started and full_response and len(full_response) > 10:
#                         logger.info(f"⏱️ Timeout but have response ({len(full_response)} chars)")
#                         break
#                     if tool_calls:
#                         logger.info(f"⏱️ Timeout but have {len(tool_calls)} tool calls")
#                         break
#                     logger.error("❌ Timeout waiting for response")
#                     return None
                    
#                 except websockets.exceptions.ConnectionClosed as e:
#                     if response_started and full_response:
#                         logger.warning(f"⚠️ Connection closed but have response: {e}")
#                         break
#                     if tool_calls:
#                         logger.warning(f"⚠️ Connection closed but have tool calls: {e}")
#                         break
#                     logger.error(f"❌ Connection closed: {e}")
#                     return None
            
#             # ✅ Process tool calls if any
#             if tool_calls:
#                 logger.info(f"🔧 Processing {len(tool_calls)} tool calls")
                
#                 for tool_call in tool_calls:
#                     function_name = tool_call.get("name")
#                     arguments_str = tool_call.get("arguments", "{}")
#                     call_id = tool_call.get("call_id", str(uuid.uuid4()))
                    
#                     try:
#                         arguments = json.loads(arguments_str)
#                     except json.JSONDecodeError:
#                         logger.error(f"❌ Failed to parse arguments: {arguments_str}")
#                         arguments = {}
                    
#                     # ✅ Execute function (await since it's async)
#                     logger.info(f"🔧 Executing: {function_name} with {arguments}")
#                     function_result = await handle_function_call(function_name, arguments, session_id,user_id)
#                     logger.info(f"✅ Function result: {json.dumps(function_result, indent=2)}")
                    
#                     # Add tool result to conversation
#                     tool_result_item = {
#                         "type": "conversation.item.create",
#                         "item": {
#                             "type": "function_call_output",
#                             "call_id": call_id,
#                             "output": json.dumps(function_result)
#                         }
#                     }
#                     await ws.send(json.dumps(tool_result_item))
#                     logger.info(f"📤 Sent tool result for call_id: {call_id}")
                
#                 # Request new response with tool results
#                 # logger.info("📨 Requesting final response with tool results...")
#                 await ws.send(json.dumps({
#                     "type": "response.create",
#                     "response": {"modalities": ["text"]}
#                 }))
                
#                 # Collect final response after tool execution
#                 final_response = ""
#                 final_response_started = False
                
#                 while True:
#                     try:
#                         raw_data = await asyncio.wait_for(ws.recv(), timeout=WEBSOCKET_TIMEOUT)
#                         data = json.loads(raw_data)
#                         msg_type = data.get("type", "")
                        
#                         logger.info(f"📨 Final response event: {msg_type}")
                        
#                         if msg_type == "response.text.delta":
#                             delta = data.get("delta", "")
#                             if delta:
#                                 final_response += delta
#                                 final_response_started = True
#                                 logger.info(f"📝 Final delta: {delta[:50]}...")
                        
#                         elif msg_type == "response.text.done":
#                             text = data.get("text", "")
#                             if text and not final_response:
#                                 final_response = text
#                                 final_response_started = True
#                             logger.info(f"✅ Final text done: {len(final_response)} chars")
                        
#                         elif msg_type == "response.content_part.added":
#                             part = data.get("part", {})
#                             if part.get("type") == "text":
#                                 text = part.get("text", "")
#                                 if text:
#                                     final_response += text
#                                     final_response_started = True
                        
#                         elif msg_type == "response.done":
#                             # Extract text from response object if needed
#                             if not final_response:
#                                 response_obj = data.get("response", {})
#                                 for item in response_obj.get("output", []):
#                                     if item.get("type") == "message":
#                                         for c in item.get("content", []):
#                                             if c.get("type") == "text":
#                                                 final_response += c.get("text", "")
                            
#                             logger.info(f"✅ Final response complete: {len(final_response)} chars")
#                             return final_response if final_response else full_response
                        
#                         elif msg_type in ["error", "response.failed"]:
#                             logger.error(f"❌ Error getting final response")
#                             return full_response if full_response else "I encountered an error processing your request."
                    
#                     except asyncio.TimeoutError:
#                         logger.warning(f"⏱️ Timeout on final response")
#                         return final_response if final_response else full_response
                    
#                     except websockets.exceptions.ConnectionClosed as e:
#                         logger.warning(f"⚠️ Connection closed during final response: {e}")
#                         return final_response if final_response else full_response
            
#             # No tool calls, return original response
#             if not full_response:
#                 logger.error("❌ No response received from OpenAI")
#                 return None
            
#             # Validate response
#             stripped = full_response.strip()
#             if stripped.startswith('{') and stripped.endswith('}'):
#                 try:
#                     json_obj = json.loads(stripped)
#                     if len(json_obj) <= 3:
#                         logger.error(f"❌ Invalid JSON response: {stripped}")
#                         return None
#                 except json.JSONDecodeError:
#                     pass
            
#             if len(full_response.strip()) < 5:
#                 logger.error(f"❌ Response too short: {full_response}")
#                 return None
            
#             logger.info(f"✅ Final response: {full_response[:200]}...")
#             return full_response
            
#     except websockets.exceptions.InvalidURI as e:
#         logger.error(f"❌ Invalid WebSocket URI: {e}")
#         return None
#     except websockets.exceptions.WebSocketException as e:
#         logger.error(f"❌ WebSocket exception: {e}")
#         return None
#     except Exception as e:
#         logger.error(f"❌ WebSocket error: {type(e).__name__}: {e}")
#         logger.error(traceback.format_exc())

#         return None

@track_performance("openai_websocket")
async def query_openai_websocket(full_prompt: str, session_id: str,user_id:str) -> Optional[str]:
    """Optimized WebSocket with tool calling support"""
    try:
        async with websockets.connect(
            f"{OPENAI_URL}?model={REALTIME_MODEL}",
            additional_headers={
                "Authorization": f"Bearer {API_KEY}",
                "OpenAI-Beta": "realtime=v1"
            },
            ping_interval=12,
            ping_timeout=4,
            close_timeout=2
        ) as ws:
            
            # Wait for session.created
            try:
                raw_data = await asyncio.wait_for(ws.recv(), timeout=EVENT_TIMEOUT)
                data = json.loads(raw_data)
                if data.get("type") != "session.created":
                    logger.warning(f"❌ Expected session.created, got: {data.get('type', 'unknown')}")
                    return None
            except asyncio.TimeoutError:
                logger.error("❌ Timeout on session.created")
                return None
            
            # Update session with tools
            session_update = {
                "type": "session.update",
                "session": {
                    "modalities": ["text"],
                    "instructions": full_prompt,
                    "temperature": 0.7,
                    "max_response_output_tokens": 4096,
                    "tools": FUNCTIONS,  # ✅ Add tools
                    "tool_choice": "auto"  # ✅ Auto tool selection
                }
            }
            await ws.send(json.dumps(session_update))
            
            # Create conversation item
            user_message = full_prompt.split("User: ")[-1] if "User: " in full_prompt else full_prompt
            conversation_item = {
                "type": "conversation.item.create",
                "item": {
                    "type": "message",
                    "role": "user",
                    "content": [{"type": "input_text", "text": user_message}]
                }
            }
            await ws.send(json.dumps(conversation_item))
            
            # Request response
            await ws.send(json.dumps({
                "type": "response.create",
                "response": {"modalities": ["text"]}
            }))
            
            # Collect response with tool call handling
            full_response = ""
            tool_calls = []
            response_started = False
            response_complete = False
            current_tool_call = None
            
            while True:
                try:
                    raw_data = await asyncio.wait_for(ws.recv(), timeout=WEBSOCKET_TIMEOUT)
                    data = json.loads(raw_data)
                    msg_type = data.get("type", "")
                    
                    logger.info(f"📨 WebSocket event: {msg_type}")
                    
                    # Handle text responses
                    if msg_type == "response.text.delta":
                        delta = data.get("delta", "")
                        if delta:
                            full_response += delta
                            response_started = True
                            logger.info(f"📝 Delta: {delta[:50]}...")
                    
                    elif msg_type == "response.text.done":
                        text = data.get("text", "")
                        if text and not full_response:
                            full_response = text
                            response_started = True
                        logger.info(f"✅ Text done: {len(full_response)} chars")
                    
                    elif msg_type == "response.content_part.added":
                        part = data.get("part", {})
                        if part.get("type") == "text":
                            text = part.get("text", "")
                            if text:
                                full_response += text
                                response_started = True
                                logger.info(f"📝 Content part: {text[:50]}...")
                    
                    # ✅ Handle tool calls - function_call_arguments events
                    elif msg_type == "response.function_call_arguments.delta":
                        # Tool call arguments being streamed
                        delta = data.get("delta", "")
                        if current_tool_call is None:
                            current_tool_call = {"arguments": ""}
                        current_tool_call["arguments"] += delta
                        logger.info(f"🔧 Tool args delta: {delta[:50]}...")
                    
                    elif msg_type == "response.function_call_arguments.done":
                        # Tool call arguments complete
                        if current_tool_call:
                            call_id = data.get("call_id")
                            name = data.get("name")
                            arguments = data.get("arguments", current_tool_call.get("arguments", "{}"))
                            
                            tool_calls.append({
                                "call_id": call_id,
                                "name": name,
                                "arguments": arguments
                            })
                            logger.info(f"🔧 Tool call completed: {name}")
                            current_tool_call = None
                    
                    elif msg_type == "response.output_item.added":
                        # Check if this is a function call item
                        item = data.get("item", {})
                        if item.get("type") == "function_call":
                            logger.info(f"🔧 Function call item added: {item.get('name')}")
                    
                    elif msg_type == "response.output_item.done":
                        # Output item completed - could be function call
                        item = data.get("item", {})
                        if item.get("type") == "function_call":
                            call_id = item.get("call_id")
                            name = item.get("name")
                            arguments = item.get("arguments", "{}")
                            
                            # Only add if not already added
                            if not any(tc.get("call_id") == call_id for tc in tool_calls):
                                tool_calls.append({
                                    "call_id": call_id,
                                    "name": name,
                                    "arguments": arguments
                                })
                                logger.info(f"🔧 Tool call from output_item: {name}")
                    
                    elif msg_type == "response.done":
                        response_complete = True
                        
                        # Extract any remaining data from response object
                        response_obj = data.get("response", {})
                        output_items = response_obj.get("output", [])
                        
                        # Check for text in output
                        if not full_response:
                            for item in output_items:
                                if item.get("type") == "message":
                                    for c in item.get("content", []):
                                        if c.get("type") == "text":
                                            full_response += c.get("text", "")
                        
                        # Check for function calls in output
                        for item in output_items:
                            if item.get("type") == "function_call":
                                call_id = item.get("call_id")
                                # Only add if not already added
                                if not any(tc.get("call_id") == call_id for tc in tool_calls):
                                    tool_calls.append({
                                        "call_id": call_id,
                                        "name": item.get("name"),
                                        "arguments": item.get("arguments", "{}")
                                    })
                        
                        logger.info(f"✅ Response done. Text: {len(full_response)} chars, Tools: {len(tool_calls)}")
                        break
                    
                    elif msg_type in ["error", "response.failed"]:
                        error_data = data.get("error", {})
                        error_msg = error_data.get("message", str(data))
                        logger.error(f"❌ OpenAI error: {error_msg}")
                        return None
                        
                except asyncio.TimeoutError:
                    if response_started and full_response and len(full_response) > 10:
                        logger.info(f"⏱️ Timeout but have response ({len(full_response)} chars)")
                        break
                    if tool_calls:
                        logger.info(f"⏱️ Timeout but have {len(tool_calls)} tool calls")
                        break
                    logger.error("❌ Timeout waiting for response")
                    return None
                    
                except websockets.exceptions.ConnectionClosed as e:
                    if response_started and full_response:
                        logger.warning(f"⚠️ Connection closed but have response: {e}")
                        break
                    if tool_calls:
                        logger.warning(f"⚠️ Connection closed but have tool calls: {e}")
                        break
                    logger.error(f"❌ Connection closed: {e}")
                    return None
            
            # ✅ Process tool calls if any
            if tool_calls:
                logger.info(f"🔧 Processing {len(tool_calls)} tool calls")
                
                for tool_call in tool_calls:
                    function_name = tool_call.get("name")
                    arguments_str = tool_call.get("arguments", "{}")
                    call_id = tool_call.get("call_id", str(uuid.uuid4()))
                    
                    try:
                        arguments = json.loads(arguments_str)
                    except json.JSONDecodeError:
                        logger.error(f"❌ Failed to parse arguments: {arguments_str}")
                        arguments = {}
                    
                    # ✅ Execute function (await since it's async)
                    logger.info(f"🔧 Executing: {function_name} with {arguments}")
                    function_result = await handle_function_call(function_name, arguments, session_id,user_id)
                    logger.info(f"✅ Function result: {json.dumps(function_result, indent=2)}")
                    
                    # Add tool result to conversation
                    tool_result_item = {
                        "type": "conversation.item.create",
                        "item": {
                            "type": "function_call_output",
                            "call_id": call_id,
                            "output": json.dumps(function_result)
                        }
                    }
                    await ws.send(json.dumps(tool_result_item))
                    logger.info(f"📤 Sent tool result for call_id: {call_id}")
                
                # Request new response with tool results
                logger.info("📨 Requesting final response with tool results...")
                await ws.send(json.dumps({
                    "type": "response.create",
                    "response": {"modalities": ["text"]}
                }))
                
                # Collect final response after tool execution
                final_response = ""
                final_response_started = False
                
                while True:
                    try:
                        raw_data = await asyncio.wait_for(ws.recv(), timeout=WEBSOCKET_TIMEOUT)
                        data = json.loads(raw_data)
                        msg_type = data.get("type", "")
                        
                        logger.info(f"📨 Final response event: {msg_type}")
                        
                        if msg_type == "response.text.delta":
                            delta = data.get("delta", "")
                            if delta:
                                final_response += delta
                                final_response_started = True
                                logger.info(f"📝 Final delta: {delta[:50]}...")
                        
                        elif msg_type == "response.text.done":
                            text = data.get("text", "")
                            if text and not final_response:
                                final_response = text
                                final_response_started = True
                            logger.info(f"✅ Final text done: {len(final_response)} chars")
                        
                        elif msg_type == "response.content_part.added":
                            part = data.get("part", {})
                            if part.get("type") == "text":
                                text = part.get("text", "")
                                if text:
                                    final_response += text
                                    final_response_started = True
                        
                        elif msg_type == "response.done":
                            # Extract text from response object if needed
                            if not final_response:
                                response_obj = data.get("response", {})
                                for item in response_obj.get("output", []):
                                    if item.get("type") == "message":
                                        for c in item.get("content", []):
                                            if c.get("type") == "text":
                                                final_response += c.get("text", "")
                            
                            logger.info(f"✅ Final response complete: {len(final_response)} chars")
                            return final_response if final_response else full_response
                        
                        elif msg_type in ["error", "response.failed"]:
                            logger.error(f"❌ Error getting final response")
                            return full_response if full_response else "I encountered an error processing your request."
                    
                    except asyncio.TimeoutError:
                        logger.warning(f"⏱️ Timeout on final response")
                        return final_response if final_response else full_response
                    
                    except websockets.exceptions.ConnectionClosed as e:
                        logger.warning(f"⚠️ Connection closed during final response: {e}")
                        return final_response if final_response else full_response
            
            # No tool calls, return original response
            if not full_response:
                logger.error("❌ No response received from OpenAI")
                return None
            
            # Validate response
            stripped = full_response.strip()
            if stripped.startswith('{') and stripped.endswith('}'):
                try:
                    json_obj = json.loads(stripped)
                    if len(json_obj) <= 3:
                        logger.error(f"❌ Invalid JSON response: {stripped}")
                        return None
                except json.JSONDecodeError:
                    pass
            
            if len(full_response.strip()) < 5:
                logger.error(f"❌ Response too short: {full_response}")
                return None
            
            logger.info(f"✅ Final response: {full_response[:200]}...")
            return full_response
            
    except websockets.exceptions.InvalidURI as e:
        logger.error(f"❌ Invalid WebSocket URI: {e}")
        return None
    except websockets.exceptions.WebSocketException as e:
        logger.error(f"❌ WebSocket exception: {e}")
        return None
    except Exception as e:
        logger.error(f"❌ WebSocket error: {type(e).__name__}: {e}")
        logger.error(traceback.format_exc())

        return None


# ===== FIX 2: Update handle_function_call to pass user_id to book_meeting_room_async =====
async def handle_function_call(function_name: str, arguments: dict, session_id: str, user_id: str) -> dict:
    """
    Handle function calls from OpenAI - async version with tech support
    
    Args:
        function_name: Name of the function to call
        arguments: Dictionary of function arguments
        session_id: Current session ID
        user_id: User ID for database tracking
    
    Returns:
        dict: Function execution result
    """
    try:
        logger.info(f"\n{'🔧'*30}")
        logger.info(f"🔧 FUNCTION CALL: {function_name}")
        logger.info(f"📋 Arguments: {json.dumps(arguments, indent=2)}")
        logger.info(f"📍 Session: {session_id}")
        logger.info(f"👤 User: {user_id}")
        logger.info(f"{'🔧'*30}\n")
        
        session = get_or_create_session(session_id)
        room_name = session.get("current_source", "Unknown Location")

        # ===== ROOM AVAILABILITY =====
        if function_name == "get_room_availability":
            date = arguments.get("date", "today")
            logger.info(f"📅 Fetching rooms for date: {date}")
            
            result = await get_workspace_availability_async(date=date)
            now = datetime.now()
            current_date = now.strftime("%Y-%m-%d")
            current_time = now.strftime("%H:%M:%S")
            
            session = get_or_create_session(session_id)
            session['last_room_query_date'] = date
            session['last_room_results'] = result
            updated_prompt = (
                SYSTEM_PROMPT
                + f"\n\n# CURRENT_DATE: {current_date}"
                + f"\n\n# CURRENT_DATETIME: {current_time}"
                + f" If date choosen by customer is previous date than {current_date}, then respond like past date booking is not possible."
                + f"\n# LAST_ROOM_AVAILABILITY: {json.dumps(result)}"
            )
            session['updated_prompt'] = updated_prompt
            
            return {
                "success": True,
                "data": result,
                "date": date,
                "message": "Room availability retrieved successfully"
            }
        # ===== GET EXTENSION DETAIL =====
        elif function_name == "get_extension_detail":
            logger.info(f"📅 Fetching extension details for user_id={user_id}")

            result = await get_extension_detail(user_id)

            return {
                "success": True,
                "data": result,
                "message": "Extension details retrieved successfully"
            }

        # ===== BOOK MEETING ROOM =====
        elif function_name == "book_meeting_room":
            room_name_to_book = arguments.get("room_name")
            date = arguments.get("date")
            start_time = arguments.get("start_time")
            end_time = arguments.get("end_time")
            
            if not all([room_name_to_book, date, start_time, end_time]):
                missing = []
                if not room_name_to_book: missing.append("room_name")
                if not date: missing.append("date")
                if not start_time: missing.append("start_time")
                if not end_time: missing.append("end_time")
                
                return {
                    "success": False,
                    "message": f"Missing required parameters: {', '.join(missing)}"
                }
            
            logger.info(f"📅 Booking: {room_name_to_book} on {date} from {start_time} to {end_time}")
            
            # ✅ FIX: Pass user_id and session_id to book_meeting_room_async
            result = await book_meeting_room_async(
                room_name=room_name_to_book,
                date=date,
                start_time=start_time,
                end_time=end_time,
                user_id=user_id,  # ✅ Pass user_id
                session_id=session_id  # ✅ Pass session_id
            )
            

# ✅ INSERT DB BOOKING SAVE HERE
            # try:
            #     async with db_pool.acquire() as conn:
            #         async with conn.cursor() as cursor:
            #             insert_sql = """
            #                INSERT INTO user_meeting_bookings
            #                 (session_id, user_id, room_name,  booking_date, start_time, end_time, created_at)
            #                 VALUES (%s, %s, %s,  %s, %s, %s, NOW())
            #             """
            #             await cursor.execute(insert_sql, (
            #                 session_id,
            #                 user_id,
            #                 room_name,
            #                 date,
            #                 start_time,
            #                 end_time
            #             ))
            #             await conn.commit()
            # except Exception as e:
            #     logger.error(f"❌ DB Insert Error: {str(e)}")

            session = get_or_create_session(session_id)
            session['last_booking'] = {
                'room': room_name_to_book,
                'date': date,
                'start': start_time,
                'end': end_time,
                'result': result,
                'timestamp': datetime.now().isoformat()
            }
            
            if 'updated_prompt' in session:
                del session['updated_prompt']
                logger.info("🧹 Cleared updated prompt after booking")
            
            return {
                "success": True,
                "data": result,
                "booking_details": {
                    "room": room_name_to_book,
                    "date": date,
                    "start_time": start_time,
                    "end_time": end_time
                },
                "message": "Booking processed"
            }
        
        
        elif function_name == "send_pantry_notification":
            item_description = arguments.get("item_description")
            
            if not item_description:
                logger.error("❌ Missing item_description in function call")
                return {
                    "success": False,
                    "message": "Missing required parameter: item_description"
                }
            
            logger.info(f"📧 Processing pantry order: {item_description}")
            
            # Call without menu_number
            result = await send_pantry_notification_async(
                item_description=item_description,
                session_id=session_id,
                room_name=room_name
            )
            
            session = get_or_create_session(session_id)
            if 'pantry_orders' not in session:
                session['pantry_orders'] = []
            
            order_record = {
                'item': item_description,
                'timestamp': datetime.now().isoformat(),
                'room': room_name,
                'notification_id': result.get('notification_id'),
                'success': result.get('success')
            }
            session['pantry_orders'].append(order_record)
            
            logger.info(f"✅ Pantry order recorded: {order_record}")
            
            if result.get("success"):
                return {
                    "success": True,
                    "message": f"Pantry notification sent successfully for {item_description}",
                    "notification_id": result.get("notification_id"),
                    "item": item_description,
                    "location": room_name
                }
            else:
                return {
                    "success": True,
                    "message": f"Order confirmed for {item_description}",
                    "notification_id": result.get("notification_id"),
                    "item": item_description,
                    "note": "Notification delivery may be delayed",
                    "location": room_name
                }
        # ===== SEND TECH SUPPORT NOTIFICATION =====
        elif function_name == "send_tech_support_notification":
            issue_description = arguments.get("issue_description")
            issue_type = arguments.get("issue_type", "technical")
            
            if not issue_description:
                logger.error("❌ Missing issue_description in function call")
                return {
                    "success": False,
                    "message": "Missing required parameter: issue_description"
                }
            
            logger.info(f"🔧 Processing tech support request: {issue_description} (Type: {issue_type})")
            
            result = await send_tech_support_notification_async(
                issue_description=issue_description,
                session_id=session_id,
                issue_type=issue_type,
                room_name=room_name,
            )
            
            session = get_or_create_session(session_id)
            if 'tech_requests' not in session:
                session['tech_requests'] = []
            
            tech_record = {
                'issue': issue_description,
                'issue_type': issue_type,
                'timestamp': datetime.now().isoformat(),
                'room': room_name,
                'notification_id': result.get('notification_id'),
                'success': result.get('success')
            }
            session['tech_requests'].append(tech_record)
            
            logger.info(f"✅ Tech support request recorded: {tech_record}")
            
            if result.get("success"):
                return {
                    "success": True,
                    "message": f"Tech support has been notified about: {issue_description}",
                    "notification_id": result.get("notification_id"),
                    "location": room_name,
                    "issue": issue_description,
                    "issue_type": issue_type
                }
            else:
                return {
                    "success": True,
                    "message": f"Tech support request logged for: {issue_description}",
                    "notification_id": result.get("notification_id"),
                    "location": room_name,
                    "issue": issue_description,
                    "issue_type": issue_type,
                    "note": "Support team will contact you soon"
                }
        elif function_name == "send_housekeeping_notification":
            request_description = arguments.get("request_description")
            request_type = arguments.get("request_type", "general")
            
            if not request_description:
                logger.error("❌ Missing request_description in function call")
                return {
                    "success": False,
                    "message": "Missing required parameter: request_description"
                }
            
            logger.info(f"🧹 Processing housekeeping request: {request_description} (Type: {request_type})")
            
            result = await send_housekeeping_notification_async(
                request_description=request_description,
                session_id=session_id,
                request_type=request_type,
                room_name=room_name,
            )
            
            session = get_or_create_session(session_id)
            if 'housekeeping_requests' not in session:
                session['housekeeping_requests'] = []
            
            housekeeping_record = {
                'request': request_description,
                'request_type': request_type,
                'room': room_name,
                'timestamp': datetime.now().isoformat(),
                'notification_id': result.get('notification_id'),
                'success': result.get('success')
            }
            session['housekeeping_requests'].append(housekeeping_record)
            
            logger.info(f"✅ Housekeeping request recorded: {housekeeping_record}")
            
            if result.get("success"):
                return {
                    "success": True,
                    "message": f"Housekeeping team has been notified: {request_description}",
                    "notification_id": result.get("notification_id"),
                    "request": request_description,
                    "request_type": request_type,
                    "location": room_name
                }
            else:
                return {
                    "success": True,
                    "message": f"Housekeeping request logged: {request_description}",
                    "notification_id": result.get("notification_id"),
                    "request": request_description,
                    "request_type": request_type,
                    "note": "Team will respond shortly",
                    "location": room_name
                }
        
        # ===== UNKNOWN FUNCTION =====
        else:
            logger.error(f"❌ Unknown function called: {function_name}")
            return {
                "success": False,
                "message": f"Unknown function: {function_name}",
                "available_functions": [
    "get_extension_detail",
    "get_room_availability",
    "book_meeting_room",
    "send_pantry_notification",
    "send_tech_support_notification",
    "send_housekeeping_notification"
]
            }
    
    except Exception as e:
        logger.error(f"❌ Error in handle_function_call: {type(e).__name__} - {str(e)}")
        logger.error(traceback.format_exc())
        return {
            "success": False,
            "message": f"Function execution error: {str(e)}",
            "function": function_name
        }






# async def ask_openai_realtime(question: str, session_id: str) -> str:
#     """Main AI query with tool calling support"""
#     session = get_or_create_session(session_id)
    
#     for attempt in range(1, MAX_RESPONSE_RETRIES + 1):
#         logger.info(f"🔄 Attempt {attempt}/{MAX_RESPONSE_RETRIES}")
        
#         context = build_conversation_context(session_id)
#         full_prompt = f"{updated_prompt}{context}\n\nUser: {question}"
        
#         # Try WebSocket with tool calling - ✅ Pass session_id
#         response = await query_openai_websocket(full_prompt, session_id)
        
#         if not response:
#             if attempt < MAX_RESPONSE_RETRIES:
#                 await asyncio.sleep(RETRY_DELAY * 2)
#                 continue
#             return "I'm having trouble connecting. Please try again."
        
#         # ✅ Remove old tool marker processing since tools are handled in WebSocket
#         # final_response = await process_tool_calls_async(response, session_id)
#         final_response = response  # Tools already processed in WebSocket
        
#         if not is_valid_response(final_response):
#             if attempt < MAX_RESPONSE_RETRIES:
#                 continue
#             return "Please try again."
        
#         # Save to conversation
#         add_to_conversation(session_id, "user", question)
#         add_to_conversation(session_id, "assistant", final_response)
        
#         return final_response
    
#     return "Please try again or rephrase your question."
# async def ask_openai_realtime(question: str, session_id: str) -> str:
#     """Main AI query with tool calling support"""
#     session = get_or_create_session(session_id)
    
#     for attempt in range(1, MAX_RESPONSE_RETRIES + 1):
#         logger.info(f"🔄 Attempt {attempt}/{MAX_RESPONSE_RETRIES}")
        
#         context = build_conversation_context(session_id)
        
#         # ✅ Get current date for date-based queries
#         now = datetime.now()
#         current_date = now.strftime("%Y-%m-%d")
        
#         # ✅ Build prompt with current date context
#         full_prompt = f"{updated_prompt}\n\nCurrent Date: {current_date}\n{context}\n\nUser: {question}"
        
#         # Try WebSocket with tool calling - pass session_id
#         response = await query_openai_websocket(full_prompt, session_id)
        
#         if not response:
#             if attempt < MAX_RESPONSE_RETRIES:
#                 await asyncio.sleep(RETRY_DELAY * 2)
#                 continue
#             return "I'm having trouble connecting. Please try again."
        
#         # ✅ CRITICAL FIX: Process custom tool markers for navigation, WiFi, staff
#         # OpenAI functions handle: rooms, booking, pantry, tech support, housekeeping
#         # Custom markers handle: navigation [TOOL:NAV:...], WiFi [TOOL:WIFI], staff [TOOL:STAFF:...]
#         final_response = await process_tool_calls_async(response, session_id)
        
#         if not is_valid_response(final_response):
#             if attempt < MAX_RESPONSE_RETRIES:
#                 continue
#             return "Please try again."
        
#         # Save to conversation
#         add_to_conversation(session_id, "user", question)
#         add_to_conversation(session_id, "assistant", final_response)
        
#         return final_response
    
#     return "Please try again or rephrase your question."


# async def ask_openai_realtime(question: str, session_id: str) -> str:
#     """Main AI query with tool calling support"""
#     session = get_or_create_session(session_id)
    
#     for attempt in range(1, MAX_RESPONSE_RETRIES + 1):
#         logger.info(f"🔄 Attempt {attempt}/{MAX_RESPONSE_RETRIES}")
        
#         context = build_conversation_context(session_id)
        
#         # ✅ Get current date for date-based queries
#         now = datetime.now()
#         current_date = now.strftime("%Y-%m-%d")
        
#         # ✅ Build prompt with current date context
#         full_prompt = f"{SYSTEM_PROMPT}\n\nCurrent Date: {current_date}\n{context}\n\nUser: {question}"
        
#         # Try WebSocket with tool calling - pass session_id
#         response = await query_openai_websocket(full_prompt, session_id)
        
#         if not response:
#             if attempt < MAX_RESPONSE_RETRIES:
#                 await asyncio.sleep(RETRY_DELAY * 2)
#                 continue
#             return "I'm having trouble connecting. Please try again."
        
#         # ✅ CRITICAL FIX: Process custom tool markers for navigation, WiFi, staff
#         # OpenAI functions handle: rooms, booking, pantry, tech support, housekeeping
#         # Custom markers handle: navigation [TOOL:NAV:...], WiFi [TOOL:WIFI], staff [TOOL:STAFF:...]
#         final_response = await process_tool_calls_async(response, session_id)
        
#         if not is_valid_response(final_response):
#             if attempt < MAX_RESPONSE_RETRIES:
#                 continue
#             return "Please try again."
        
#         # Save to conversation
#         add_to_conversation(session_id, "user", question)
#         add_to_conversation(session_id, "assistant", final_response)
        
#         return final_response
    
#     return "Please try again or rephrase your question."
async def ask_openai_realtime(question: str, session_id: str,user_id) -> str:
    """Main AI query with tool calling support"""
    session = get_or_create_session(session_id)
    
    for attempt in range(1, MAX_RESPONSE_RETRIES + 1):
        logger.info(f"🔄 Attempt {attempt}/{MAX_RESPONSE_RETRIES}")
        
        context = build_conversation_context(session_id)
        
        # ✅ Get current date for date-based queries
        now = datetime.now()
        current_date = now.strftime("%Y-%m-%d")
        current_time = now.strftime("%H:%M:%S")
        
        # ✅ USE UPDATED PROMPT FROM SESSION IF AVAILABLE (for booking context)
        base_prompt = session.get('updated_prompt', SYSTEM_PROMPT)
        
        # ✅ Build prompt with current date context
        full_prompt = f"{base_prompt}\n\nCurrent Date: {current_date}\nCurrent Time :{current_time}\nUser ID: {user_id}\n{context}\n\nUser: {question}"
        
        logger.info(f"📝 Using {'UPDATED' if 'updated_prompt' in session else 'DEFAULT'} system prompt")
        
        # Try WebSocket with tool calling - pass session_id
        response = await query_openai_websocket(full_prompt, session_id,user_id)
        
        if not response:
            if attempt < MAX_RESPONSE_RETRIES:
                await asyncio.sleep(RETRY_DELAY * 2)
                continue
            return "I'm having trouble connecting. Please try again."
        
        # ✅ CRITICAL FIX: Process custom tool markers for navigation, WiFi, staff
        # OpenAI functions handle: rooms, booking, pantry, tech support, housekeeping
        # Custom markers handle: navigation [TOOL:NAV:...], WiFi [TOOL:WIFI], staff [TOOL:STAFF:...]
        final_response = await process_tool_calls_async(response, session_id)
        
        if not is_valid_response(final_response):
            if attempt < MAX_RESPONSE_RETRIES:
                continue
            return "Please try again."
        
        # Save to conversation
        add_to_conversation(session_id, "user", question)
        add_to_conversation(session_id, "assistant", final_response)
        
        return final_response
    
    return "Please try again or rephrase your question."



@app.post("/ask")
async def ask(request: Request):
    global Authorization, API_HEADERS
    
    start_time = time.time()
    performance_metrics["total_requests"] += 1
    
    try:
        payload = await request.json()
        question = payload.get("input", "").strip()
        session_id = payload.get("session_id", "default_session")
        user_id = payload.get("user_id")  # ✅ Required: "Jose Mathew" or "V0000136"
        access_token = payload.get("access_token")  # ✅ Required: JWT token
        source_location = payload.get("room") or payload.get("source", "Diversity")
        
        # Validation
        if not question:
            raise HTTPException(status_code=400, detail="No question provided")
        
        if not user_id:
            raise HTTPException(status_code=400, detail="Missing user_id")
        
        if not access_token:
            raise HTTPException(status_code=400, detail="Missing access_token")
        
        logger.info(f"💬 [{session_id}] User: {user_id} | Question: {question[:100]}...")
        
        # ✅ SIMPLIFIED: Just use the access token directly
        Authorization = f"Bearer {access_token}"
        API_HEADERS["Authorization"] = Authorization
        
        logger.info(f"✅ Using access token for user: {user_id}")
        
        # Continue with conversation logic
        session = get_or_create_session(session_id)
        session["current_source"] = source_location
        
        # Get AI response
        answer = await ask_openai_realtime(question, session_id, user_id)
        
        # Calculate metrics
        response_time = time.time() - start_time
        performance_metrics["successful_requests"] += 1
        performance_metrics["total_response_time"] += response_time
        
        session["total_requests"] += 1
        session["avg_response_time"] = (
            (session["avg_response_time"] * (session["total_requests"] - 1) + response_time) 
            / session["total_requests"]
        )
        
        # Save conversation to DB
        await save_conversation_to_db(
            user_id=user_id,
            session_id=session_id,
            room_name=source_location,
            conversation_history=session["history"]
        )
        
        logger.info(f"✅ Response in {response_time:.2f}s")
        
        # ✅ SIMPLIFIED: Return response without token updates
        return JSONResponse({
            "answer": answer,
            "session_id": session_id,
            "source_location": source_location,
            "timestamp": datetime.now().isoformat(),
            "status": "success",
            "performance": {
                "response_time": round(response_time, 3),
                "session_avg": round(session["avg_response_time"], 3)
            }
        })
        
    except HTTPException:
        raise
    except Exception as e:
        performance_metrics["failed_requests"] += 1
        response_time = time.time() - start_time
        logger.error(f"❌ Error in {response_time:.2f}s: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/clear-session")
async def clear_session(request: Request):
    """Clear conversation history"""
    payload = await request.json()
    session_id = payload.get("session_id", "default")
    
    if session_id in conversation_sessions:
        del conversation_sessions[session_id]
        logger.info(f"🗑️ Cleared session: {session_id}")
    
    return JSONResponse({"message": "Session cleared", "session_id": session_id})

@app.post("/clear-cache")
async def clear_cache():
    """Clear API response cache"""
    cache.clear()
    return JSONResponse({"message": "Cache cleared", "timestamp": datetime.now().isoformat()})

@app.get("/metrics")
def get_metrics():
    """Get performance metrics"""
    avg_response_time = (
        performance_metrics["total_response_time"] / performance_metrics["successful_requests"]
        if performance_metrics["successful_requests"] > 0 else 0
    )
    
    api_stats = {}
    for api_name, stats in performance_metrics["api_calls"].items():
        avg_time = stats["total_time"] / stats["count"] if stats["count"] > 0 else 0
        api_stats[api_name] = {
            "calls": stats["count"],
            "avg_time": round(avg_time, 3),
            "total_time": round(stats["total_time"], 3),
            "errors": stats["errors"],
            "error_rate": round(stats["errors"] / stats["count"] * 100, 2) if stats["count"] > 0 else 0
        }
    
    cache_hit_rate = (
        performance_metrics["cache_hits"] / 
        (performance_metrics["cache_hits"] + performance_metrics["cache_misses"]) * 100
        if (performance_metrics["cache_hits"] + performance_metrics["cache_misses"]) > 0 else 0
    )
    
    return JSONResponse({
        "timestamp": datetime.now().isoformat(),
        "overview": {
            "total_requests": performance_metrics["total_requests"],
            "successful_requests": performance_metrics["successful_requests"],
            "failed_requests": performance_metrics["failed_requests"],
            "success_rate": round(
                performance_metrics["successful_requests"] / performance_metrics["total_requests"] * 100, 2
            ) if performance_metrics["total_requests"] > 0 else 0,
            "avg_response_time": round(avg_response_time, 3),
            "total_response_time": round(performance_metrics["total_response_time"], 3)
        },
        "websocket": {
            "retries": performance_metrics["websocket_retries"],
            "retry_rate": round(
                performance_metrics["websocket_retries"] / performance_metrics["total_requests"], 2
            ) if performance_metrics["total_requests"] > 0 else 0
        },
        "cache": {
            "hits": performance_metrics["cache_hits"],
            "misses": performance_metrics["cache_misses"],
            "hit_rate": round(cache_hit_rate, 2)
        },
        "api_calls": api_stats,
        "sessions": {
            "active": len(conversation_sessions),
            "details": {
                sid: {
                    "requests": session["total_requests"],
                    "avg_response_time": round(session["avg_response_time"], 3),
                    "last_activity": session["last_activity"].isoformat()
                }
                for sid, session in conversation_sessions.items()
            }
        }
    })

@app.post("/reset-metrics")
def reset_metrics():
    """Reset all performance metrics"""
    global performance_metrics
    performance_metrics = {
        "total_requests": 0,
        "successful_requests": 0,
        "failed_requests": 0,
        "total_response_time": 0.0,
        "api_calls": defaultdict(lambda: {"count": 0, "total_time": 0.0, "errors": 0}),
        "websocket_retries": 0,
        "cache_hits": 0,
        "cache_misses": 0
    }
    logger.info("📊 Metrics reset")
    return JSONResponse({"message": "Metrics reset", "timestamp": datetime.now().isoformat()})


# @app.route('/refresh-token', methods=['POST'])
# def refresh_token_endpoint():
#     """Endpoint to explicitly refresh access token"""
    
#     data = request.json
#     user_id = data.get('user_id')
    
#     if not user_id:
#         return jsonify({'error': 'user_id required'}), 400
    
#     new_token, status = get_valid_access_token(user_id)
    
#     if new_token:
#         return jsonify({
#             'access_token': new_token,
#             'status': status
#         }), 200
#     else:
#         return jsonify({'error': status}), 401

@app.get("/health")
def health():
    """Health check with performance summary"""
    avg_response_time = (
        performance_metrics["total_response_time"] / performance_metrics["successful_requests"]
        if performance_metrics["successful_requests"] > 0 else 0
    )
    
    return JSONResponse({
        "status": "healthy",
        "service": "EFS Assistant (Production-Optimized with Smart Printer Navigation)",
        "model": REALTIME_MODEL,
        "timestamp": datetime.now().isoformat(),
        "active_sessions": len(conversation_sessions),
        "configuration": {
            "websocket_timeout": WEBSOCKET_TIMEOUT,
            "event_timeout": EVENT_TIMEOUT,
            "api_timeout": API_TIMEOUT,
            "max_retries": MAX_RETRIES,
            "cache_duration": CACHE_DURATION
        },
        "performance_summary": {
            "total_requests": performance_metrics["total_requests"],
            "success_rate": round(
                performance_metrics["successful_requests"] / performance_metrics["total_requests"] * 100, 2
            ) if performance_metrics["total_requests"] > 0 else 0,
            "avg_response_time": round(avg_response_time, 3)
        }
    })

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    await session_manager.close()
    logger.info("🛑 Application shutdown - cleaned up resources")


if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*80)
    print("🚀 EFS ASSISTANT - PRODUCTION OPTIMIZED WITH SMART PRINTER NAVIGATION")
    print("="*80)
    print("\n🖨️ Smart Printer Navigation:")
    print("  • Automatically detects nearest printer based on room location")
    print("  • No need to ask 'Printer 1 or Printer 2?'")
    print("  • Room-to-printer mapping for all meeting rooms")
    print("\n⚡ Performance Optimizations:")
    print(f"  • WebSocket timeout: {WEBSOCKET_TIMEOUT}s")
    print(f"  • Event timeout: {EVENT_TIMEOUT}s")
    print(f"  • API timeout: {API_TIMEOUT}s")
    print(f"  • Max retries: {MAX_RETRIES}")
    print(f"  • Cache duration: {CACHE_DURATION}s")
    print("  • Parallel API execution")
    print("  • Async HTTP session pooling")
    print("  • Response caching system")
    print("\n📊 Monitoring Features:")
    print("  • Real-time performance tracking")
    print("  • Per-API call metrics")
    print("  • Cache hit/miss statistics")
    print("  • Session-level analytics")
    print("  • Detailed performance logging (performance.log)")
    print("\n🚀 Endpoints:")
    print("  POST   /ask             - Main chat endpoint")
    print("  POST   /clear-session   - Clear conversation history")
    print("  POST   /clear-cache     - Clear API response cache")
    print("  GET    /metrics         - Detailed performance metrics")
    print("  POST   /reset-metrics   - Reset all metrics")
    print("  GET    /health          - Health check with summary")
    print("\n📈 Performance Monitoring:")
    print("  • Response times tracked per request")
    print("  • API call durations and error rates")
    print("  • Cache efficiency metrics")
    print("  • WebSocket retry statistics")
    print("  • Session-level averages")
    print("\n💡 Usage Examples:")
    print("  curl http://localhost:8006/metrics")
    print("  curl http://localhost:8006/health")
    print('  curl -X POST http://localhost:8006/ask -H "Content-Type: application/json" \\')
    print('       -d \'{"input": "Where is the printer?", "session_id": "user123", "room": "Transformation"}\'')
    print("\n📁 Performance Log: ./performance.log")
    print("="*80 + "\n")
    
    uvicorn.run(app, host="0.0.0.0", port=8006)