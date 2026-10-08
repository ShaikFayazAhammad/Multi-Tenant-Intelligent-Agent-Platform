# EFS VMS Multi-Agent System with LangGraph
# File: langgraph_agents.py

from typing import TypedDict, Annotated, Sequence, Literal
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, ToolMessage
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
import operator
import aiohttp
import asyncio
from datetime import datetime, timedelta
import json
import logging
import uuid
from functools import lru_cache

# ===== LOGGING SETUP =====
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ===== CONFIGURATION =====
API_BASE_URL = "https://efsim-tech-dev-apim-01.azure-api.net"
API_HEADERS = {
    "Ocp-Apim-Subscription-Key": "6371cad18f114c17a4168edb5fecf286",
    "customerId": "bdb6c41e-2b82-4299-a256-e347cbb060d5",
    'Authorization': ''  # Set dynamically per request
}
DEFAULT_SPACE_TYPE_ID = 2120

# ===== STATE DEFINITION =====
class AgentState(TypedDict):
    """The state of the agent system"""
    messages: Annotated[Sequence[BaseMessage], operator.add]
    user_id: str
    session_id: str
    access_token: str
    room_name: str
    next_agent: str
    intent: str
    requires_api: bool
    requires_rag: bool
    validation_needed: bool
    api_results: dict
    rag_results: dict

# ===== HTTP SESSION MANAGER =====
class AsyncHTTPSession:
    _instance = None
    _session = None
    
    @classmethod
    async def get_session(cls):
        if cls._session is None or cls._session.closed:
            timeout = aiohttp.ClientTimeout(total=30.0)
            cls._session = aiohttp.ClientSession(timeout=timeout)
            logger.info("✅ Created new aiohttp session")
        return cls._session
    
    @classmethod
    async def close(cls):
        if cls._session and not cls._session.closed:
            await cls._session.close()
            logger.info("🔌 Closed aiohttp session")

# ===== EMAIL CACHE FOR STAFF =====
staff_email_cache = {
    "pantry": [],
    "it": [],
    "housekeeping": [],
    "facilities": []
}
staff_cache_timestamp = None
STAFF_CACHE_DURATION = 3600

async def get_category_emails(category: str) -> str:
    """Get comma-separated emails for a category"""
    global staff_cache_timestamp
    
    # Refresh cache if expired
    if (staff_cache_timestamp is None or 
        (datetime.now() - staff_cache_timestamp).seconds > STAFF_CACHE_DURATION or
        not any(staff_email_cache.values())):
        await fetch_and_cache_staff_emails()
    
    category_key = category.lower().strip()
    emails = staff_email_cache.get(category_key, [])
    
    if not emails:
        fallback_emails = {
            "pantry": ["Bidhan.Lama@efsme.com"],
            "it": ["Affan.Khan@efsme.com"],
            "housekeeping": ["muhammed.shaheen@efsme.com"],
            "facilities": ["muhammed.shaheen@efsme.com"]
        }
        emails = fallback_emails.get(category_key, [])
    
    return ",".join(emails)

async def fetch_and_cache_staff_emails():
    """Fetch and cache staff emails from API"""
    global staff_email_cache, staff_cache_timestamp
    
    try:
        url = f"{API_BASE_URL}/staff/GetStaffs?customerId={API_HEADERS['customerId']}"
        session = await AsyncHTTPSession.get_session()
        
        async with session.get(url, headers=API_HEADERS) as response:
            if response.status != 200:
                logger.error(f"❌ Staff API error: {response.status}")
                return False
            
            data = await response.json()
            staff_list = data if isinstance(data, list) else data.get('data', [])
            
            # Reset cache
            staff_email_cache = {
                "pantry": [],
                "it": [],
                "housekeeping": [],
                "facilities": []
            }
            
            for staff in staff_list:
                email = staff.get('email', '').strip()
                category = staff.get('category', '').lower().strip()
                
                if not email:
                    continue
                
                if 'pantry' in category or 'kitchen' in category:
                    staff_email_cache['pantry'].append(email)
                elif 'it' in category or 'technical' in category:
                    staff_email_cache['it'].append(email)
                elif 'housekeeping' in category or 'cleaning' in category:
                    staff_email_cache['housekeeping'].append(email)
                elif 'facilities' in category or 'facility' in category:
                    staff_email_cache['facilities'].append(email)
            
            staff_cache_timestamp = datetime.now()
            logger.info("✅ Staff emails cached")
            return True
            
    except Exception as e:
        logger.error(f"❌ Error caching staff emails: {e}")
        return False

# ===== API TOOLS =====

@tool
async def get_wifi_credentials(state: dict) -> dict:
    """
    Get Guest WiFi credentials for visitors.
    
    Args:
        state: Agent state containing auth headers
    
    Returns:
        dict: WiFi SSID and password
    """
    try:
        url = f"{API_BASE_URL}/guestWifi/GetCredentials?customerId={API_HEADERS['customerId']}"
        headers = {**API_HEADERS, "Authorization": state.get("access_token", "")}
        
        session = await AsyncHTTPSession.get_session()
        async with session.get(url, headers=headers) as response:
            if response.status != 200:
                return {"error": "Unable to fetch WiFi credentials", "status": "failed"}
            
            data = await response.json()
            wifi_info = data.get('data', data) if isinstance(data, dict) else data[0] if data else {}
            
            return {
                "ssid": wifi_info.get('userName') or wifi_info.get('ssid', 'N/A'),
                "password": wifi_info.get('password', 'N/A'),
                "status": "success"
            }
    except Exception as e:
        logger.error(f"WiFi API error: {e}")
        return {"error": str(e), "status": "failed"}

@tool
async def get_staff_contacts(department: str, state: dict) -> dict:
    """
    Get staff contact information for a specific department.
    
    Args:
        department: Department name (pantry, it, housekeeping, facilities)
        state: Agent state containing auth headers
    
    Returns:
        dict: Staff contact details
    """
    try:
        url = f"{API_BASE_URL}/staff/GetStaffs?customerId={API_HEADERS['customerId']}"
        headers = {**API_HEADERS, "Authorization": state.get("access_token", "")}
        
        session = await AsyncHTTPSession.get_session()
        async with session.get(url, headers=headers) as response:
            if response.status != 200:
                return {"error": f"Unable to fetch {department} staff", "status": "failed"}
            
            data = await response.json()
            staff_list = data if isinstance(data, list) else data.get('data', [])
            
            dept_keywords = {
                "tech": ["it", "technical", "tech support"],
                "pantry": ["pantry", "kitchen"],
                "housekeeping": ["housekeeping", "cleaning"],
                "facilities": ["facilities", "facility"]
            }
            
            keywords = dept_keywords.get(department.lower(), [department.lower()])
            filtered_staff = []
            
            for staff in staff_list:
                category = staff.get('category', '').lower()
                if any(kw in category for kw in keywords):
                    filtered_staff.append({
                        "name": f"{staff.get('firstName', '')} {staff.get('lastName', '')}".strip(),
                        "email": staff.get('email', ''),
                        "phone": staff.get('phoneNumber') or staff.get('phone', ''),
                        "category": staff.get('category', '')
                    })
            
            return {
                "department": department,
                "staff": filtered_staff[:2],  # Return top 2
                "count": len(filtered_staff),
                "status": "success"
            }
    except Exception as e:
        logger.error(f"Staff API error: {e}")
        return {"error": str(e), "status": "failed"}

@tool
async def get_room_availability(date: str, state: dict) -> dict:
    """
    Get available meeting rooms for a specific date.
    
    Args:
        date: Date string (today, tomorrow, or YYYY-MM-DD)
        state: Agent state containing auth headers
    
    Returns:
        dict: Available rooms with time slots
    """
    try:
        # Parse date
        if date.lower() == "today":
            date = datetime.now().strftime("%Y-%m-%d")
        elif date.lower() == "tomorrow":
            date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        url = f"{API_BASE_URL}/iwaa-workspaces/GetAvailability"
        params = {
            'spaceTypeId': DEFAULT_SPACE_TYPE_ID,
            'date': date,
            'customerId': API_HEADERS['customerId']
        }
        headers = {**API_HEADERS, "Authorization": state.get("access_token", "")}
        
        session = await AsyncHTTPSession.get_session()
        async with session.get(url, headers=headers, params=params) as response:
            if response.status != 200:
                return {"error": "Unable to fetch room availability", "status": "failed"}
            
            data = await response.json()
            availability_list = data if isinstance(data, list) else data.get('data', [])
            
            rooms = {}
            for room in availability_list:
                name = room.get('spaceName') or room.get('name', 'Unknown')
                if name not in rooms:
                    rooms[name] = {
                        'floor': room.get('floorName', 'N/A'),
                        'slots': []
                    }
                rooms[name]['slots'].append({
                    'start': room.get('start'),
                    'end': room.get('end')
                })
            
            return {
                "date": date,
                "rooms": rooms,
                "count": len(rooms),
                "status": "success"
            }
    except Exception as e:
        logger.error(f"Room availability API error: {e}")
        return {"error": str(e), "status": "failed"}

@tool
async def book_meeting_room(room_name: str, date: str, start_time: str, end_time: str, state: dict) -> dict:
    """
    Book a meeting room.
    
    Args:
        room_name: Name of the meeting room
        date: Date in YYYY-MM-DD format
        start_time: Start time in HH:MM format
        end_time: End time in HH:MM format
        state: Agent state containing auth and user info
    
    Returns:
        dict: Booking confirmation or error
    """
    try:
        # First get room details
        availability_url = f"{API_BASE_URL}/iwaa-workspaces/GetAvailability"
        params = {
            'spaceTypeId': DEFAULT_SPACE_TYPE_ID,
            'date': date,
            'customerId': API_HEADERS['customerId']
        }
        headers = {**API_HEADERS, "Authorization": state.get("access_token", "")}
        
        session = await AsyncHTTPSession.get_session()
        
        async with session.get(availability_url, headers=headers, params=params) as response:
            if response.status != 200:
                return {"error": "Unable to verify room availability", "status": "failed"}
            
            data = await response.json()
            availability_list = data if isinstance(data, list) else data.get('data', [])
            
            room_data = None
            for room in availability_list:
                if room.get('spaceName', '').lower() == room_name.lower():
                    room_data = room
                    break
            
            if not room_data:
                return {"error": f"Room '{room_name}' not found", "status": "failed"}
            
            location_id = room_data.get('locationId')
            floor_id = room_data.get('floorId')
            space_id = room_data.get('spaceId')
            space_type_id = room_data.get('spaceTypeId', DEFAULT_SPACE_TYPE_ID)
        
        # Now book the room
        booking_url = f"{API_BASE_URL}/iwaa-workspaces/bookings?include_location=1"
        booking_data = {
            'location_id': str(location_id),
            'floor_id': str(floor_id),
            'space_type_id': str(space_type_id),
            'title': f"Booking via Assistant",
            'space_id': str(space_id),
            'dates[0][start]': f"{date} {start_time}",
            'dates[0][end]': f"{date} {end_time}"
        }
        
        async with session.post(
            booking_url,
            headers={**headers, 'Content-Type': 'application/x-www-form-urlencoded'},
            data=booking_data
        ) as response:
            result = await response.json()
            
            if result.get('status') == 1:
                return {
                    "room": room_name,
                    "date": date,
                    "start_time": start_time,
                    "end_time": end_time,
                    "status": "success",
                    "message": "Booking confirmed"
                }
            else:
                return {
                    "error": result.get('error', {}).get('message', 'Booking failed'),
                    "conflicts": result.get('error', {}).get('conflicts', []),
                    "status": "failed"
                }
    except Exception as e:
        logger.error(f"Booking API error: {e}")
        return {"error": str(e), "status": "failed"}

@tool
async def send_notification(title: str, message: str, notification_type: str, state: dict) -> dict:
    """
    Send notification to staff (pantry, IT, housekeeping).
    
    Args:
        title: Notification title
        message: Notification message
        notification_type: Type (Pantry, IT, Housekeeping)
        state: Agent state containing auth and location
    
    Returns:
        dict: Notification status
    """
    try:
        notification_url = f"{API_BASE_URL}/notification/create"
        notification_id = str(uuid.uuid4())
        
        # Get appropriate emails
        category_map = {
            "Pantry": "pantry",
            "IT": "it",
            "Housekeeping": "housekeeping"
        }
        category = category_map.get(notification_type, "it")
        emails = await get_category_emails(category)
        
        room_name = state.get("room_name", "")
        if room_name:
            message = f"{message} (Location: {room_name})"
        
        payload = {
            "id": notification_id,
            "title": title,
            "message": message,
            "type": notification_type,
            "to": emails
        }
        
        headers = {**API_HEADERS, "Authorization": state.get("access_token", ""), 'Content-Type': 'application/json'}
        session = await AsyncHTTPSession.get_session()
        
        async with session.post(notification_url, headers=headers, json=payload) as response:
            if response.status in [200, 201]:
                return {
                    "notification_id": notification_id,
                    "type": notification_type,
                    "status": "success",
                    "message": f"{notification_type} team notified"
                }
            else:
                return {
                    "notification_id": notification_id,
                    "type": notification_type,
                    "status": "partial",
                    "message": f"Request logged for {notification_type} team"
                }
    except Exception as e:
        logger.error(f"Notification API error: {e}")
        return {"error": str(e), "status": "failed"}

@tool
async def get_pantry_menu(state: dict) -> dict:
    """
    Get available pantry items menu.
    
    Args:
        state: Agent state containing auth headers
    
    Returns:
        dict: Pantry menu items
    """
    try:
        url = f"{API_BASE_URL}/yarooms/services?type=1"
        headers = {**API_HEADERS, "Authorization": state.get("access_token", "")}
        
        session = await AsyncHTTPSession.get_session()
        async with session.get(url, headers=headers) as response:
            if response.status != 200:
                return {"error": "Unable to fetch pantry menu", "status": "failed"}
            
            data = await response.json()
            items_list = data.get('data', {}).get('list', []) if isinstance(data, dict) else data
            
            menu_items = []
            for idx, item in enumerate(items_list, 1):
                name = item.get('name', '')
                if name:
                    menu_items.append({
                        'number': idx,
                        'name': name,
                        'id': item.get('id', '')
                    })
            
            return {
                "items": menu_items,
                "count": len(menu_items),
                "status": "success"
            }
    except Exception as e:
        logger.error(f"Pantry menu API error: {e}")
        return {"error": str(e), "status": "failed"}

@tool
async def get_extension_details(user_id: str, state: dict) -> dict:
    """
    Get today's meeting bookings for extension.
    
    Args:
        user_id: User ID
        state: Agent state containing DB connection
    
    Returns:
        dict: Today's bookings for the user
    """
    # This would connect to your MySQL database
    # For now, returning placeholder
    return {
        "user_id": user_id,
        "bookings": [],
        "status": "success",
        "message": "Feature requires database connection"
    }

# ===== AGENT DEFINITIONS =====

# Orchestrator Agent - Routes to specialized agents
def create_orchestrator(llm):
    """Create the orchestrator agent that routes requests"""
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are the Orchestrator Agent for EFS HQ Assistant.

Your role is to:
1. Analyze user intent
2. Determine which specialized agent should handle the request
3. Set routing flags for API or RAG needs

Intent Categories:
- WIFI: WiFi credentials, connection help
- STAFF: Staff contacts, department info
- ROOMS: Meeting room availability, booking
- PANTRY: Food/beverage orders
- TECH: Technical issues (after troubleshooting)
- HOUSEKEEPING: Cleaning, maintenance requests
- NAVIGATION: Indoor directions
- GENERAL: Policies, procedures, FAQs

Routing Logic:
- WIFI, STAFF, ROOMS, PANTRY → API Agent (requires_api=True)
- GENERAL, POLICIES → RAG Agent (requires_rag=True)
- TECH, HOUSEKEEPING → Hybrid Agent (both API and notification)
- NAVIGATION → Special handling

Respond with JSON:
{
  "intent": "WIFI|STAFF|ROOMS|PANTRY|TECH|HOUSEKEEPING|NAVIGATION|GENERAL",
  "next_agent": "api|rag|hybrid",
  "requires_api": true/false,
  "requires_rag": true/false,
  "confidence": 0.0-1.0
}"""),
        MessagesPlaceholder(variable_name="messages"),
    ])
    
    chain = prompt | llm
    return chain

# API Agent - Handles all API calls
def create_api_agent(llm, tools):
    """Create the API agent with tool calling"""
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are the API Agent for EFS HQ Assistant.

You have access to these tools:
- get_wifi_credentials: Get WiFi SSID and password
- get_staff_contacts: Get staff contact info by department
- get_room_availability: Check meeting room availability
- book_meeting_room: Book a meeting room
- get_pantry_menu: Get pantry menu items
- send_notification: Send notifications to staff (pantry/IT/housekeeping)
- get_extension_details: Get booking extension info

Guidelines:
1. Call appropriate tools based on user request
2. Always validate parameters before calling tools
3. Format responses in user-friendly language
4. If tool call fails, provide helpful fallback info

Response Style:
- Friendly and conversational
- Clear and concise
- Include actionable next steps"""),
        MessagesPlaceholder(variable_name="messages"),
    ])
    
    agent = prompt | llm.bind_tools(tools)
    return agent

# RAG Agent - Handles knowledge base queries
def create_rag_agent(llm):
    """Create the RAG agent for FAQ and documentation"""
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are the RAG Agent for EFS HQ Assistant.

Your knowledge base includes:
- Office policies and procedures
- Visitor management process (13-step registration)
- Meeting room features (TV connections, video conferencing)
- Printing instructions for employees
- Parking information
- General office information

Guidelines:
1. Answer based on provided documentation
2. Be specific with step-by-step instructions
3. Reference relevant links (e.g., https://apps.iwaa.com)
4. If unsure, say so and suggest alternatives

Response Style:
- Clear and structured
- Use numbered lists for procedures
- Include helpful tips where relevant"""),
        MessagesPlaceholder(variable_name="messages"),
        ("system", "Context: {context}")
    ])
    
    chain = prompt | llm
    return chain

# Hybrid Agent - Combines API + RAG (e.g., WiFi troubleshooting)
def create_hybrid_agent(llm, tools):
    """Create hybrid agent for complex multi-step workflows"""
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are the Hybrid Agent for EFS HQ Assistant.

You handle complex requests that require both:
1. Knowledge base information (troubleshooting steps)
2. API actions (notifications, escalations)

Example Workflows:
- WiFi Issues: Troubleshoot first → If fails → API call for IT support
- Printer Issues: Troubleshoot first → If fails → API call for tech support
- Facilities: Provide info → Then API call for request

Two-Step Process:
1. First Response: Provide troubleshooting/information
2. If User Confirms Issue Persists: Call appropriate API

Available Tools: {tools}

Guidelines:
- Always troubleshoot before escalating
- Be patient and helpful
- Confirm before making API calls"""),
        MessagesPlaceholder(variable_name="messages"),
    ])
    
    agent = prompt | llm.bind_tools(tools)
    return agent

# ===== GRAPH CONSTRUCTION =====

def should_continue(state: AgentState) -> Literal["api", "rag", "hybrid", "end"]:
    """Routing function based on orchestrator decision"""
    messages = state["messages"]
    last_message = messages[-1]
    
    # Check if orchestrator provided routing info
    if hasattr(last_message, 'additional_kwargs'):
        routing = last_message.additional_kwargs.get('routing', {})
        return routing.get('next_agent', 'end')
    
    # Default: end if no more routing needed
    return "end"

def create_agent_graph():
    """Create the complete multi-agent graph"""
    
    # Initialize LLM
    llm = ChatOpenAI(model="gpt-4o", temperature=0.7)
    
    # Create agents
    orchestrator = create_orchestrator(llm)
    
    # API tools
    api_tools = [
        get_wifi_credentials,
        get_staff_contacts,
        get_room_availability,
        book_meeting_room,
        get_pantry_menu,
        send_notification,
        get_extension_details
    ]
    
    api_agent = create_api_agent(llm, api_tools)
    rag_agent = create_rag_agent(llm)
    hybrid_agent = create_hybrid_agent(llm, api_tools)
    
    # Create tool node
    tool_node = ToolNode(api_tools)
    
    # Build graph
    workflow = StateGraph(AgentState)
    
    # Add nodes
    workflow.add_node("orchestrator", orchestrator)
    workflow.add_node("api_agent", api_agent)
    workflow.add_node("rag_agent", rag_agent)
    workflow.add_node("hybrid_agent", hybrid_agent)
    workflow.add_node("tools", tool_node)
    
    # Set entry point
    workflow.set_entry_point("orchestrator")
    
    # Add conditional edges from orchestrator
    workflow.add_conditional_edges(
        "orchestrator",
        should_continue,
        {
            "api": "api_agent",
            "rag": "rag_agent",
            "hybrid": "hybrid_agent",
            "end": END
        }
    )
    
    # API agent can call tools or end
    workflow.add_conditional_edges(
        "api_agent",
        lambda x: "tools" if x["messages"][-1].tool_calls else END
    )
    
    # Tools return to API agent
    workflow.add_edge("tools", "api_agent")
    
    # RAG and Hybrid end after response
    workflow.add_edge("rag_agent", END)
    workflow.add_edge("hybrid_agent", END)
    
    # Compile graph
    app = workflow.compile()
    
    return app

# ===== MAIN EXECUTION =====

async def process_message(user_input: str, user_id: str, session_id: str, 
                         access_token: str, room_name: str = "Diversity"):
    """
    Process a user message through the agent graph.
    
    Args:
        user_input: User's message
        user_id: User identifier
        session_id: Session identifier
        access_token: JWT access token
        room_name: Current room/location
    
    Returns:
        str: Agent's response
    """
    
    # Initialize graph
    graph = create_agent_graph()
    
    # Create initial state
    initial_state = AgentState(
        messages=[HumanMessage(content=user_input)],
        user_id=user_id,
        session_id=session_id,
        access_token=access_token,
        room_name=room_name,
        next_agent="orchestrator",
        intent="",
        requires_api=False,
        requires_rag=False,
        validation_needed=False,
        api_results={},
        rag_results={}
    )
    
    # Run graph
    try:
        result = await graph.ainvoke(initial_state)
        
        # Extract final response
        final_message = result["messages"][-1]
        
        if isinstance(final_message, AIMessage):
            return final_message.content
        else:
            return str(final_message)
            
    except Exception as e:
        logger.error(f"Graph execution error: {e}")
        return "I encountered an error processing your request. Please try again."

# ===== FASTAPI INTEGRATION =====

"""
To integrate with FastAPI:

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse

app = FastAPI()

@app.post("/ask")
async def ask(request: Request):
    payload = await request.json()
    
    user_input = payload.get("input", "").strip()
    session_id = payload.get("session_id", "default")
    user_id = payload.get("user_id")
    access_token = payload.get("access_token")
    room_name = payload.get("room", "Diversity")
    
    if not user_input or not user_id or not access_token:
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    # Update global auth
    API_HEADERS["Authorization"] = f"Bearer {access_token}"
    
    # Process through agent graph
    response = await process_message(
        user_input=user_input,
        user_id=user_id,
        session_id=session_id,
        access_token=f"Bearer {access_token}",
        room_name=room_name
    )
    
    return JSONResponse({
        "answer": response,
        "session_id": session_id,
        "timestamp": datetime.now().isoformat()
    })

@app.on_event("shutdown")
async def shutdown():
    await AsyncHTTPSession.close()
"""

if __name__ == "__main__":
    # Example usage
    async def main():
        response = await process_message(
            user_input="What's the WiFi password?",
            user_id="V0000136",
            session_id="test_session",
            access_token="Bearer YOUR_TOKEN_HERE",
            room_name="Diversity"
        )
        print(f"Response: {response}")
    
    asyncio.run(main())