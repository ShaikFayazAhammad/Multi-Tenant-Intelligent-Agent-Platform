# import sys
# sys.path.append("/home/haloocom/efs-rag-bot")

# from dotenv import load_dotenv
# import os
# load_dotenv()

# # Sanity check
# if not os.getenv("OPENAI_API_KEY"):
#     raise RuntimeError("OPENAI_API_KEY not found in environment")

# from config import get_llm
# from graph.db_instance import db  # shared Chroma instance


# # --------------------------------------------------
# # 🔹 CANONICAL QUESTIONS (from your JSON)
# # --------------------------------------------------
# CANONICAL_QUESTIONS = [
#     # TV
#     "How do I connect my Apple laptop to the TV screen?",
#     "How do I connect my Windows laptop to the TV screen?",
#     "How do I connect my laptop to the TV screen?",
#     "Do we have an HDMI cable connection for the TV?",
#     "Do we connect to the TV using Wi-Fi?",
#     "The TV is not turning on or connecting. I need tech support.",

#     # Video Conferencing
#     "How do I connect my Apple laptop to the video conferencing system?",
#     "How do I connect my Windows laptop to the video conferencing device?",
#     "What are the connectivity options for video conferencing?",
#     "The video conferencing device is not working. I need tech support.",

#     # Projector
#     "How do I connect my laptop to the projector?",
#     "Do we have an HDMI cable connection for the projector?",
#     "Do we connect to the projector using Wi-Fi?",
#     "The projector is not turning on or connecting. I need tech support.",

#     # Pantry
#     "Can I request tea, coffee, water, or snacks for the meeting room?",
#     "The pantry items haven’t arrived yet. Can I send a reminder?",
#     "Can I request additional water bottles or snacks?",

#     # Room Facilities
#     "The AC in the meeting room is not working. How do I switch it on?",
#     "The lighting is too dim or too bright. Can it be adjusted?",
#     "The meeting room is not clean. Can housekeeping attend?",
#     "Can additional chairs be arranged for the meeting room?",
#     "Can housekeeping clean the meeting room before my session?",
#     "There is a spillage in the meeting room. Can someone attend immediately?",
#     "How do I request stationery items for the meeting room?",
#     "Can I get a notepad or marker for the meeting room?",
#     "The whiteboard markers are dry. Can we get new ones?",

#     # Printer
#     "How do I connect to the printer?",
#     "How do I get a printout?",
#     "Where is the nearest printer located?",

#     # Meeting Room Booking
#     "Can I extend the meeting room booking?",
#     "Which meeting rooms are available for booking?",
#     "Can I extend the parking space booking?",

#     # Navigation & Visitor Management
#     "Can you help me navigate to restrooms, restaurants, prayer rooms, or smoking areas?",
#     "How do I invite a visitor?",
#     "How do I register a visitor?",
#     "How do I check in a visitor?",
#     "Where can my guest collect their visitor pass?",
#     "Can parking be arranged for a visitor?",
#     "My visitor has not received the OTP or pass. Can it be resent?"
# ]


# # --------------------------------------------------
# # 1️⃣ INTENT DETECTION NODE
# # --------------------------------------------------
# def detect_intent(state):
#     llm = get_llm()

#     system_prompt = """
# You are an intent classifier for an enterprise internal FAQ system.

# Classify the question into ONE of the following:
# - YES_NO
# - HOW_TO
# - TROUBLESHOOT
# - SUPPORT
# - GENERAL_FAQ

# Return ONLY the intent name.
# """

#     response = llm.invoke([
#         {"role": "system", "content": system_prompt},
#         {"role": "user", "content": state["question"]}
#     ])

#     return {
#         "intent": response.content.strip().upper()
#     }


# # --------------------------------------------------
# # 2️⃣ CANONICAL QUESTION MAPPER
# # --------------------------------------------------
# def canonical_mapper(state):
#     llm = get_llm()

#     system_prompt = f"""
# You map user questions to the closest canonical FAQ question.

# Rules:
# - Choose ONLY from the canonical list
# - Do NOT invent new questions
# - If nothing matches clearly, return the original question

# Canonical questions:
# {CANONICAL_QUESTIONS}
# """

#     response = llm.invoke([
#         {"role": "system", "content": system_prompt},
#         {"role": "user", "content": state["question"]}
#     ])

#     canonical_question = response.content.strip()

#     return {
#         "canonical_question": canonical_question
#     }


# # --------------------------------------------------
# # 3️⃣ QUERY REWRITER NODE (SAFE NORMALIZATION)
# # --------------------------------------------------
# def rewrite_query(state):
#     llm = get_llm()

#     system_prompt = """
# You rewrite questions for FAQ retrieval.
# - Fix spelling and grammar
# - Expand abbreviations (tv → TV screen)
# - Normalize devices (window → Windows)
# - DO NOT answer the question
# - Output only the rewritten question
# """

#     user_prompt = f"""
# Original question:
# {state.get("canonical_question", state["question"])}

# Rewritten question:
# """

#     response = llm.invoke([
#         {"role": "system", "content": system_prompt},
#         {"role": "user", "content": user_prompt}
#     ])

#     return {
#         "question": response.content.strip()
#     }


# # --------------------------------------------------
# # 4️⃣ RETRIEVER NODE (CHROMA + ROOM FILTER)
# # --------------------------------------------------
# def retrieve(state):
#     question = state["question"].lower()
#     user_room = state["room"].lower().replace(" room", "").strip()

#     # Retrieve without room filter
#     retriever = db.as_retriever(search_kwargs={"k": 10})
#     docs = retriever.invoke(question)

#     normalized_docs = [
#         {
#             "content": d.page_content,
#             "room": d.metadata.get("room", "").lower().strip()
#         }
#         for d in docs
#     ]

#     # Room-specific filtering
#     room_docs = [d["content"] for d in normalized_docs if d["room"] == user_room]

#     if room_docs:
#         return {"docs": room_docs}

#     # Fallback: global answers
#     return {"docs": [d["content"] for d in normalized_docs]}


# # --------------------------------------------------
# # 5️⃣ STRICT ANSWER GENERATOR NODE
# # --------------------------------------------------
# def generate(state):
#     llm = get_llm()
#     context = "\n".join(state["docs"]).strip()

#     system_prompt = """
# You are a strict internal FAQ assistant.

# Rules:
# - Use ONLY the provided context
# - DO NOT add any external knowledge
# - Preserve numbering and bullet points
# - If the answer is not present, reply EXACTLY:
#   "I do not have that information for this room. Please contact support."
# """

#     user_prompt = f"""
# Context:
# {context}

# Question:
# {state["question"]}

# Answer:
# """

#     response = llm.invoke([
#         {"role": "system", "content": system_prompt},
#         {"role": "user", "content": user_prompt}
#     ])

#     return {
#         "answer": response.content.strip()
#     }



# # graph/nodes.py - SIMPLIFIED APPROACH
# import sys
# # sys.path.append("/home/haloocom/efs-rag-bot")

# from dotenv import load_dotenv
# import os
# import json
# import re
# import logging

# load_dotenv()

# if not os.getenv("OPENAI_API_KEY"):
#     raise RuntimeError("OPENAI_API_KEY not found in environment")

# from config import get_llm
# from graph.db_instance import db

# logger = logging.getLogger(__name__)

# # --------------------------------------------------
# # 🔹 CANONICAL QUESTIONS
# # --------------------------------------------------
# CANONICAL_QUESTIONS = [
#     "How do I connect my Apple laptop to the TV screen?",
#     "How do I connect my Windows laptop to the TV screen?",
#     "How do I connect my laptop to the TV screen?",
#     "How do I connect my Apple laptop to the video conferencing system?",
#     "How do I connect my Windows laptop to the video conferencing device?",
#     "How do I connect my laptop to the projector?",
#     "Do we have an HDMI cable connection for the TV?",
#     "Do we connect to the TV using Wi-Fi?",
#     "The TV is not turning on or connecting. I need tech support.",
#     "The video conferencing device is not working. I need tech support.",
#     "The projector is not turning on or connecting. I need tech support.",
#     "Can I request tea, coffee, water, or snacks for the meeting room?",
#     "The AC in the meeting room isn't working how to switch it on?",
#     "The lighting is too dim or too bright. Can it be adjusted?",
#     "The meeting room is not clean. Can housekeeping attend?",
#     "Can additional chairs be arranged for the meeting room?",
#     "How do I connect to the printer?",
#     "How do I get a printout?",
#     "Where is the nearest printer located?",
#     "Can I extend the meeting room booking?",
#     "Which meeting rooms are available for booking?",
#     "Can I extend the parking space booking?",
#     "How do I invite a visitor?",
#     "How do I register a visitor?",
#     "How do I check in a visitor?",
#     "Where can my guest collect their visitor pass?",
#     "My visitor hasn't received the OTP/pass — can you resend it?"
# ]


# # --------------------------------------------------
# # 🔧 HELPER: Build Full Context Question
# # --------------------------------------------------
# def build_full_question(state):
#     """
#     Build the full question by combining current input with conversation history.
#     This runs FIRST before any other processing.
    
#     Returns the complete question string.
#     """
#     current = state["question"].lower().strip()
#     history = state.get("conversation_history", [])
    
#     # If no history or question is already complete (>6 words), return as-is
#     if not history or len(current.split()) > 6:
#         return state["question"]
    
#     # Extract all user messages
#     user_messages = [msg["content"] for msg in history if msg["role"] == "user"]
    
#     if not user_messages:
#         return state["question"]
    
#     # Get the last substantial user question (more than 3 words)
#     last_question = None
#     for msg in reversed(user_messages):
#         if len(msg.split()) > 3:
#             last_question = msg
#             break
    
#     if not last_question:
#         return state["question"]
    
#     # Simple pattern matching for combining context
#     # Pattern 1: "to [device]" - combine with previous question
#     if re.match(r'^to\s+', current):
#         combined = f"{last_question} {current}"
#         print(f"Combined: '{last_question}' + '{current}' -> '{combined}'")
#         return combined
    
#     # Pattern 2: Just device name answers like "apple", "windows", "tv", "projector"
#     single_words = ['apple', 'mac', 'macbook', 'windows', 'pc', 'tv', 'television', 
#                     'projector', 'video conferencing', 'vc']
#     if any(current == word or current.endswith(word) for word in single_words):
#         combined = f"{last_question} {current}"
#         print(f"Combined: '{last_question}' + '{current}' -> '{combined}'")
#         return combined
    
#     return state["question"]


# # --------------------------------------------------
# # 1️⃣ DETECT INTENT (Simplified)
# # --------------------------------------------------
# def detect_intent(state):
#     """Simple intent detection"""
#     question = state["question"].lower()
    
#     # Priority 1: Check for "how to" questions first (even if they mention "not working")
#     if any(word in question for word in ["how to", "how do i", "how can i"]):
#         intent = "HOW_TO"
#     # Priority 2: Troubleshooting (only if NOT a "how to" question)
#     elif any(word in question for word in ["not working", "broken", "issue", "problem", "need support"]):
#         intent = "TROUBLESHOOT"
#     # Priority 3: Yes/No questions
#     elif any(word in question for word in ["do we have", "is there", "can i"]):
#         intent = "YES_NO"
#     else:
#         intent = "GENERAL_FAQ"
    
#     print(f"Intent: {intent}")
#     return {"intent": intent}


# # --------------------------------------------------
# # 2️⃣ CHECK IF COMPLETE (Rule-Based)
# # --------------------------------------------------
# def detect_missing_info(state):
#     """
#     Rule-based detection of missing information.
#     Much more reliable than LLM-based detection.
#     """
#     # Build full context first
#     full_question = build_full_question(state)
#     question_lower = full_question.lower()
    
#     print(f"Checking completeness: '{full_question}'")
    
#     # Category 1: Questions that DON'T need device type (always complete)
#     # - Printer questions
#     # - Navigation questions
#     # - Visitor management
#     # - Room facilities
#     # - General facility questions
#     if any(word in question_lower for word in [
#         "printer", "print", "printout",
#         "navigate", "restroom", "restaurant", "prayer", "smoking",
#         "visitor", "guest", "invite", "register", "check in",
#         "pantry", "tea", "coffee", "water", "snacks",
#         "ac", "air condition", "lighting", "light", "housekeeping", "clean",
#         "chair", "stationery", "notepad", "marker", "whiteboard",
#         "parking", "meeting room", "book", "extend"
#     ]):
#         print("[OK] Complete (general facility question - no device needed)")
#         return {"is_complete": True, "missing_info": [], "confidence": "high"}
    
#     # Category 2: Troubleshooting questions (always complete)
#     if any(word in question_lower for word in ["not working", "broken", "issue", "problem", "need support", "need tech"]):
#         print("[OK] Complete (troubleshooting question)")
#         return {"is_complete": True, "missing_info": [], "confidence": "high"}
    
#     # Category 3: Yes/No questions (always complete)
#     if any(phrase in question_lower for phrase in ["do we have", "is there", "can i", "can we"]):
#         print("[OK] Complete (yes/no question)")
#         return {"is_complete": True, "missing_info": [], "confidence": "high"}
    
#     # Category 4: Connection questions (need device type AND target)
#     if "connect" in question_lower or "how to" in question_lower or "how do" in question_lower:
#         # Device type keywords
#         has_apple = any(word in question_lower for word in ["apple", "mac", "macbook"])
#         has_windows = any(word in question_lower for word in ["windows", "pc"])
#         has_device_type = has_apple or has_windows
        
#         # Target device keywords
#         has_tv = any(word in question_lower for word in ["tv", "television", "screen"])
#         has_vc = any(word in question_lower for word in ["video conferencing", "vc", "conference", "conferencing"])
#         has_projector = "projector" in question_lower
#         has_target = has_tv or has_vc or has_projector
        
#         missing = []
        
#         if not has_device_type:
#             missing.append("device_type")
#         if not has_target:
#             missing.append("target_device")
        
#         if missing:
#             print(f"[X] Incomplete: missing {missing}")
#             return {
#                 "is_complete": False,
#                 "missing_info": missing,
#                 "confidence": "high"
#             }
    
#     # Default: Complete
#     print("[OK] Complete")
#     return {"is_complete": True, "missing_info": [], "confidence": "high"}


# # --------------------------------------------------
# # 3️⃣ GENERATE FOLLOW-UP
# # --------------------------------------------------
# def generate_followup(state):
#     """Generate simple, direct follow-up questions"""
#     missing = state.get("missing_info", [])
    
#     if "device_type" in missing and "target_device" in missing:
#         followup = "What device would you like to connect? (e.g., Apple laptop, Windows laptop) And where would you like to connect it? (TV, video conferencing, or projector)"
#     elif "device_type" in missing:
#         followup = "Which type of laptop are you using - Apple or Windows?"
#     elif "target_device" in missing:
#         followup = "What would you like to connect to - TV, video conferencing system, or projector?"
#     else:
#         followup = "Could you provide more details?"
    
#     print(f"[?] Follow-up: {followup}")
    
#     return {
#         "followup_question": followup,
#         "needs_followup": True,
#         "answer": followup
#     }


# # --------------------------------------------------
# # 4️⃣ MAP TO CANONICAL (Rule-Based)
# # --------------------------------------------------
# # --------------------------------------------------
# # 4️⃣ MAP TO CANONICAL (Similarity-Based)
# # --------------------------------------------------
# def canonical_mapper(state):
#     """
#     Find the most similar canonical question.
#     Returns the canonical question if match score > 70%, else return original query.
#     """
#     llm = get_llm()
#     full_question = build_full_question(state)
    
#     system_prompt = f"""You are a matching assistant. Compare the user's question to the list of canonical questions below.
    
# Rules:
# 1. If the user's question has a 70% or higher similarity/intent match with any canonical question, return EXACTLY that canonical question.
# 2. If there is NO match above 70%, return the user's original question EXACTLY.
# 3. Do NOT provide reasoning or extra text. JUST the question.

# Canonical Questions:
# {json.dumps(CANONICAL_QUESTIONS, indent=2)}
# """

#     try:
#         response = llm.invoke([
#             {"role": "system", "content": system_prompt},
#             {"role": "user", "content": full_question}
#         ])
        
#         canonical = response.content.strip().strip('"')
#         print(f"LLM Mapped: '{full_question}' -> '{canonical}'")
#         return {"canonical_question": canonical}
#     except Exception as e:
#         # Log full traceback and exception details so we can see the real root cause
#         logger.exception("Mapper error in canonical_mapper")
#         print(f"[X] Mapper error: {repr(e)} (type={type(e)})")
#         return {"canonical_question": full_question}


# # --------------------------------------------------
# # 5️⃣ REWRITE QUERY (Minimal)
# # --------------------------------------------------
# def rewrite_query(state):
#     """
#     Minimal rewriting - just use the canonical question.
#     """
#     question = state.get("canonical_question", state["question"])
#     print(f"Query: {question}")
#     return {"question": question}


# # --------------------------------------------------
# # 6️⃣ RETRIEVE
# # --------------------------------------------------
# def retrieve(state):
#     """
#     Retrieve documents from vector DB.
#     """
#     try:
#         question = state["question"].lower()
#         user_room = state.get("room", "general").lower().replace(" room", "").strip()

#         print(f"Retrieving for: '{question}' in room: '{user_room}'")
        
#         # Get documents
#         retriever = db.as_retriever(search_kwargs={"k": 20})
#         docs = retriever.invoke(question)

#         if not docs:
#             return {"docs": []}

#         # Normalize documents
#         norm_docs = []
#         for d in docs:
#             room_meta = d.metadata.get("room", "general")
#             room_list = [r.lower().strip() for r in (room_meta if isinstance(room_meta, list) else [room_meta])]
#             content = d.page_content
#             norm_docs.append({"content": content, "rooms": room_list})

#         # Identify keywords from canonical question
#         target_device = "tv" if "tv" in question else \
#                         "video conferencing" if ("video" in question or "vc" in question) else \
#                         "projector" if "projector" in question else \
#                         None
        
#         brand = "apple" if "apple" in question else \
#                 "windows" if "windows" in question else \
#                 None

#         # 1. Collect all matches for user_room OR 'general'
#         room_matches = [d for d in norm_docs if user_room in d["rooms"]]
#         general_matches = [d for d in norm_docs if "general" in d["rooms"]]
        
#         # Combine them (prioritizing room matches in the list)
#         combined_potential = []
#         seen_content = set()
        
#         for d in room_matches + general_matches:
#             if d["content"] not in seen_content:
#                 combined_potential.append(d)
#                 seen_content.add(d["content"])
        
#         # 2. Check for high-quality match in the combined list
#         def is_high_quality(doc_content):
#             content_lower = doc_content.lower()
#             device_match = target_device in content_lower if target_device else True
#             brand_match = brand in content_lower if brand else True
#             return device_match and brand_match

#         high_quality_docs = [d["content"] for d in combined_potential if is_high_quality(d["content"])]
        
#         if high_quality_docs:
#             print(f"[OK] Found {len(high_quality_docs)} high-quality docs (Room: {user_room} + General)")
#             return {"docs": high_quality_docs}
        
#         # 3. Last resort fallback: all top matches from search
#         print(f"[WARN] No high-quality docs for '{user_room}' or 'general'. Using all top search results.")
#         return {"docs": [d["content"] for d in norm_docs[:10]]}
        
#     except Exception as e:
#         # Log full traceback and exception details for deeper debugging
#         logger.exception("Retrieval error in retrieve")
#         print(f"[ERR] Retrieval error: {repr(e)} (type={type(e)})")
#         return {"docs": []}


# # --------------------------------------------------
# # 7️⃣ GENERATE ANSWER (STRICT RAG)
# # --------------------------------------------------
# def generate(state):
#     """Generate answer strictly from retrieved docs"""
#     docs = state.get("docs", [])
    
#     if not docs:
#         return {"answer": "I do not have that information for this room. Please contact support."}
    
#     llm = get_llm()
#     context = "\n\n---\n\n".join(docs).strip()
    
#     system_prompt = """You are a helpful FAQ assistant. Your job is to answer the user's question using the provided context.

# Context matches are Question-Answer pairs from the knowledge base.

# RULES:
# 1. If the user's question matches or is similar to a Question in the context, output the corresponding Answer.
# 2. If the user's question is answered by the content in the context, output that answer.
# 3. If the answer is NOT in the context, say EXACTLY: "I do not have that information for this room. Please contact support."
# 4. Maintain the formatting (steps, bullets) of the original answer.
# 5. Do not add external knowledge.
# """

#     user_prompt = f"""Question: {state["question"]}

# Context:
# {context}

# Answer strictly using the context provided above:"""

#     try:
#         response = llm.invoke([
#             {"role": "system", "content": system_prompt},
#             {"role": "user", "content": user_prompt}
#         ])

#         answer = response.content.strip()
#         return {"answer": answer}
#     except Exception as e:
#         print(f"❌ Generation error: {str(e)}")
#         return {"answer": "I do not have that information for this room. Please contact support."}



# # --------------------------------------------------
# # 🧪 TESTING
# # --------------------------------------------------
# if __name__ == "__main__":
#     print("🧪 Testing Simplified Nodes\n")
    
#     # Test 1: Context combination
#     print("=" * 60)
#     print("Test 1: Context Combination")
#     state1 = {
#         "question": "to tv screen",
#         "conversation_history": [
#             {"role": "user", "content": "how to connect apple laptop"},
#             {"role": "assistant", "content": "Which device?"}
#         ]
#     }
#     full_q = build_full_question(state1)
#     print(f"Full question: {full_q}")
    
#     # Test 2: Complete detection
#     print("\n" + "=" * 60)
#     print("Test 2: Completeness Detection")
#     state2 = {"question": full_q}
#     result2 = detect_missing_info(state2)
#     print(f"Complete: {result2}")
    
#     # Test 3: Canonical mapping
#     print("\n" + "=" * 60)
#     print("Test 3: Canonical Mapping")
#     result3 = canonical_mapper(state2)
#     print(f"Canonical: {result3}")




# graph/nodes.py - SIMPLIFIED APPROACH
import sys
# sys.path.append("/home/haloocom/efs-rag-bot")

from dotenv import load_dotenv
import os
import json
import re
import logging

load_dotenv()

if not os.getenv("OPENAI_API_KEY"):
    raise RuntimeError("OPENAI_API_KEY not found in environment")

from config import get_llm
from graph.db_instance import db

logger = logging.getLogger(__name__)

# --------------------------------------------------
# 🔹 CANONICAL QUESTIONS
# --------------------------------------------------
CANONICAL_QUESTIONS = [
    "How do I connect my Apple laptop to the TV screen?",
    "How do I connect my Windows laptop to the TV screen?",
    "How do I connect my laptop to the TV screen?",
    "How do I connect my Apple laptop to the Video Conferencing?",
    "How do I connect my Windows laptop to the video conferencing device?",
    "How do I connect my laptop to the Projector?",
    "Do we have an HDMI cable connection?",
    "Do we connect using Wi-Fi connection?",
    "The TV is not turning on or connecting. I need tech support.",
    "The video conferencing device is not working. I need tech support.",
    "The projector is not turning on or connecting. I need tech support.",
    "Can I request tea, coffee, water, or snacks for the meeting room?",
    "The AC in the meeting room isn't working how to switch it on?",
    "The lighting is too dim or too bright. Can it be adjusted?",
    "The meeting room is not clean. Can housekeeping attend?",
    "Can additional chairs be arranged for the meeting room?",
    "How do I connect to the printer?",
    "How do I get a printout?",
    "Where is the nearest printer located?",
    "Can I extend the meeting room booking?",
    "Which meeting rooms are available for booking?",
    "Can I extend the parking space booking?",
    "How do I invite a visitor?",
    "How do I register a visitor?",
    "How do I check in a visitor?",
    "Where can my guest collect their visitor pass?",
    "My visitor hasn't received the OTP/pass — can you resend it?"
]


# --------------------------------------------------
# 🔧 HELPER: Build Full Context Question
# --------------------------------------------------
def build_full_question(state):
    """
    Build the full question by combining current input with conversation history.
    This runs FIRST before any other processing.
    
    Returns the complete question string.
    """
    current = state["question"].lower().strip()
    history = state.get("conversation_history", [])
    
    # If no history or question is already complete (>6 words), return as-is
    if not history or len(current.split()) > 6:
        return state["question"]
    
    # Extract all user messages
    user_messages = [msg["content"] for msg in history if msg["role"] == "user"]
    
    if not user_messages:
        return state["question"]
    
    # Get the last substantial user question (more than 3 words)
    last_question = None
    for msg in reversed(user_messages):
        if len(msg.split()) > 3:
            last_question = msg
            break
    
    if not last_question:
        return state["question"]
    
    # Simple pattern matching for combining context
    # Pattern 1: "to [device]" - combine with previous question
    if re.match(r'^to\s+', current):
        combined = f"{last_question} {current}"
        print(f"Combined: '{last_question}' + '{current}' -> '{combined}'")
        return combined
    
    # Pattern 2: Just device name answers like "apple", "windows", "tv", "projector"
    single_words = ['apple', 'mac', 'macbook', 'windows', 'pc', 'tv', 'television', 
                    'projector', 'video conferencing', 'vc']
    if any(current == word or current.endswith(word) for word in single_words):
        combined = f"{last_question} {current}"
        print(f"Combined: '{last_question}' + '{current}' -> '{combined}'")
        return combined
    
    return state["question"]


# --------------------------------------------------
# 1️⃣ DETECT INTENT (Simplified)
# --------------------------------------------------
def detect_intent(state):
    """Simple intent detection"""
    question = state["question"].lower()
    
    # Priority 1: Check for "how to" questions first (even if they mention "not working")
    if any(word in question for word in ["how to", "how do i", "how can i"]):
        intent = "HOW_TO"
    # Priority 2: Troubleshooting (only if NOT a "how to" question)
    elif any(word in question for word in ["not working", "broken", "issue", "problem", "need support"]):
        intent = "TROUBLESHOOT"
    # Priority 3: Yes/No questions
    elif any(word in question for word in ["do we have", "is there", "can i"]):
        intent = "YES_NO"
    else:
        intent = "GENERAL_FAQ"
    
    print(f"Intent: {intent}")
    return {"intent": intent}


# --------------------------------------------------
# 2️⃣ CHECK IF COMPLETE (Rule-Based)
# --------------------------------------------------
def detect_missing_info(state):
    """
    Rule-based detection of missing information.
    Much more reliable than LLM-based detection.
    """
    # Build full context first
    full_question = build_full_question(state)
    question_lower = full_question.lower()
    
    print(f"Checking completeness: '{full_question}'")
    
    # Category 1: Questions that DON'T need device type (always complete)
    # - Printer questions
    # - Navigation questions
    # - Visitor management
    # - Room facilities
    # - General facility questions
    if any(word in question_lower for word in [
        "printer", "print", "printout",
        "navigate", "restroom", "restaurant", "prayer", "smoking",
        "visitor", "guest", "invite", "register", "check in",
        "pantry", "tea", "coffee", "water", "snacks",
        "ac", "air condition", "lighting", "light", "housekeeping", "clean",
        "chair", "stationery", "notepad", "marker", "whiteboard",
        "parking", "meeting room", "book", "extend"
    ]):
        print("[OK] Complete (general facility question - no device needed)")
        return {"is_complete": True, "missing_info": [], "confidence": "high"}
    
    # Category 2: Troubleshooting questions (always complete)
    if any(word in question_lower for word in ["not working", "broken", "issue", "problem", "need support", "need tech"]):
        print("[OK] Complete (troubleshooting question)")
        return {"is_complete": True, "missing_info": [], "confidence": "high"}
    
    # Category 3: Yes/No questions (always complete)
    if any(phrase in question_lower for phrase in ["do we have", "is there", "can i", "can we"]):
        print("[OK] Complete (yes/no question)")
        return {"is_complete": True, "missing_info": [], "confidence": "high"}
    
    # Category 4: Connection questions (need device type AND target)
    if any(phrase in question_lower for phrase in ["how to connect", "how do i connect"]):
        # Device type keywords
        has_apple = any(word in question_lower for word in ["apple", "mac", "macbook"])
        has_windows = any(word in question_lower for word in ["windows", "pc"])
        has_device_type = has_apple or has_windows
        
        # Target device keywords
        has_tv = any(word in question_lower for word in ["tv", "television", "screen"])
        has_vc = any(word in question_lower for word in ["video conferencing", "vc", "conference", "conferencing"])
        has_projector = "projector" in question_lower
        has_target = has_tv or has_vc or has_projector
        
        missing = []
        
        # NOTE: Only require device type if it's NOT a general device-agnostic question
        if not has_device_type:
            missing.append("device_type")
        if not has_target:
            missing.append("target_device")
        
        if missing:
            print(f"[X] Incomplete: missing {missing}")
            return {
                "is_complete": False,
                "missing_info": missing,
                "confidence": "high"
            }
    
    # Category 5: Standalone Yes/No connection questions (HDMI/Wifi) that DO NOT mention "how to connect"
    if "hdmi cable" in question_lower or "wi-fi connection" in question_lower or "connectivity options" in question_lower:
        print("[OK] Complete (direct connectivity question)")
        return {"is_complete": True, "missing_info": [], "confidence": "high"}
    
    # Default: Complete
    print("[OK] Complete")
    return {"is_complete": True, "missing_info": [], "confidence": "high"}


# --------------------------------------------------
# 3️⃣ GENERATE FOLLOW-UP
# --------------------------------------------------
def generate_followup(state):
    """Generate simple, direct follow-up questions"""
    missing = state.get("missing_info", [])
    
    if "device_type" in missing and "target_device" in missing:
        followup = "What device would you like to connect? (e.g., Apple laptop, Windows laptop) And where would you like to connect it? (TV, video conferencing, or projector)"
    elif "device_type" in missing:
        followup = "Which type of laptop are you using - Apple or Windows?"
    elif "target_device" in missing:
        followup = "What would you like to connect to - TV, video conferencing system, or projector?"
    else:
        followup = "Could you provide more details?"
    
    print(f"[?] Follow-up: {followup}")
    
    return {
        "followup_question": followup,
        "needs_followup": True,
        "answer": followup
    }


# --------------------------------------------------
# 4️⃣ MAP TO CANONICAL (Rule-Based)
# --------------------------------------------------
# --------------------------------------------------
# 4️⃣ MAP TO CANONICAL (Similarity-Based)
# --------------------------------------------------
def canonical_mapper(state):
    """
    Find the most similar canonical question.
    Returns the canonical question if match score > 70%, else return original query.
    """
    llm = get_llm()
    full_question = build_full_question(state)
    
    system_prompt = f"""You are a matching assistant. Compare the user's question to the list of canonical questions below.
    
Rules:
1. If the user's question has a 70% or higher similarity/intent match with any canonical question, return EXACTLY that canonical question.
2. If there is NO match above 70%, return the user's original question EXACTLY.
3. Do NOT provide reasoning or extra text. JUST the question.

Canonical Questions:
{json.dumps(CANONICAL_QUESTIONS, indent=2)}
"""

    try:
        response = llm.invoke([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": full_question}
        ])
        
        canonical = response.content.strip().strip('"')
        print(f"LLM Mapped: '{full_question}' -> '{canonical}'")
        return {"canonical_question": canonical}
    except Exception as e:
        # Log full traceback and exception details so we can see the real root cause
        logger.exception("Mapper error in canonical_mapper")
        print(f"[X] Mapper error: {repr(e)} (type={type(e)})")
        return {"canonical_question": full_question}


# --------------------------------------------------
# 5️⃣ REWRITE QUERY (Minimal)
# --------------------------------------------------
def rewrite_query(state):
    """
    Minimal rewriting - just use the canonical question.
    """
    question = state.get("canonical_question", state["question"])
    print(f"Query: {question}")
    return {"question": question}


# --------------------------------------------------
# 6️⃣ RETRIEVE
# --------------------------------------------------
def retrieve(state):
    """
    Retrieve documents from vector DB.
    """
    try:
        question = state["question"].lower()
        user_room = state.get("room", "general").lower().replace(" room", "").strip()

        print(f"Retrieving for: '{question}' in room: '{user_room}'")
        
        # Get documents
        retriever = db.as_retriever(search_kwargs={"k": 20})
        docs = retriever.invoke(question)

        if not docs:
            return {"docs": []}

        # Normalize documents
        norm_docs = []
        for d in docs:
            room_meta = d.metadata.get("room", "general")
            room_list = [r.lower().strip() for r in (room_meta if isinstance(room_meta, list) else [room_meta])]
            content = d.page_content
            norm_docs.append({"content": content, "rooms": room_list})

        # Identify keywords from canonical question
        target_device = "tv" if "tv" in question else \
                        "video conferencing" if ("video" in question or "vc" in question) else \
                        "projector" if "projector" in question else \
                        None
        
        brand = "apple" if "apple" in question else \
                "windows" if "windows" in question else \
                None

        # 1. Collect all matches for user_room OR 'general'
        room_matches = [d for d in norm_docs if user_room in d["rooms"]]
        general_matches = [d for d in norm_docs if "general" in d["rooms"]]
        
        # Combine them (prioritizing room matches in the list)
        combined_potential = []
        seen_content = set()
        
        for d in room_matches + general_matches:
            if d["content"] not in seen_content:
                combined_potential.append(d)
                seen_content.add(d["content"])
        
        # 2. Check for high-quality match in the combined list
        def is_high_quality(doc_content):
            content_lower = doc_content.lower()
            device_match = target_device in content_lower if target_device else True
            brand_match = brand in content_lower if brand else True
            return device_match and brand_match

        high_quality_docs = [d["content"] for d in combined_potential if is_high_quality(d["content"])]
        
        if high_quality_docs:
            print(f"[OK] Found {len(high_quality_docs)} high-quality docs (Room: {user_room} + General)")
            return {"docs": high_quality_docs}
        
        # 3. Last resort fallback: return empty to trigger "no info" response
        print(f"[WARN] No high-quality docs for '{user_room}' or 'general'.")
        return {"docs": []}
        
    except Exception as e:
        # Log full traceback and exception details for deeper debugging
        logger.exception("Retrieval error in retrieve")
        print(f"[ERR] Retrieval error: {repr(e)} (type={type(e)})")
        return {"docs": []}


# --------------------------------------------------
# 7️⃣ GENERATE ANSWER (STRICT RAG)
# --------------------------------------------------
def generate(state):
    """Generate answer strictly from retrieved docs"""
    docs = state.get("docs", [])
    
    if not docs:
        return {"answer": "I do not have that information for this room. Please contact support."}
    
    llm = get_llm()
    context = "\n\n---\n\n".join(docs).strip()
    
    system_prompt = """You are a helpful FAQ assistant. Your job is to answer the user's question using the provided context.

Context matches are Question-Answer pairs from the knowledge base.

RULES:
1. If the user's question matches or is similar to a Question in the context, output the corresponding Answer.
2. If the user's question is answered by the content in the context, output that answer.
3. If the answer is NOT in the context, say EXACTLY: "I do not have that information for this room. Please contact support."
4. Maintain the formatting (steps, bullets) of the original answer.
5. Do not add external knowledge.
"""

    user_prompt = f"""Question: {state["question"]}

Context:
{context}

Answer strictly using the context provided above:"""

    try:
        response = llm.invoke([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ])

        answer = response.content.strip()
        return {"answer": answer}
    except Exception as e:
        print(f"❌ Generation error: {str(e)}")
        return {"answer": "I do not have that information for this room. Please contact support."}



# --------------------------------------------------
# 🧪 TESTING
# --------------------------------------------------
if __name__ == "__main__":
    print("🧪 Testing Simplified Nodes\n")
    
    # Test 1: Context combination
    print("=" * 60)
    print("Test 1: Context Combination")
    state1 = {
        "question": "to tv screen",
        "conversation_history": [
            {"role": "user", "content": "how to connect apple laptop"},
            {"role": "assistant", "content": "Which device?"}
        ]
    }
    full_q = build_full_question(state1)
    print(f"Full question: {full_q}")
    
    # Test 2: Complete detection
    print("\n" + "=" * 60)
    print("Test 2: Completeness Detection")
    state2 = {"question": full_q}
    result2 = detect_missing_info(state2)
    print(f"Complete: {result2}")
    
    # Test 3: Canonical mapping
    print("\n" + "=" * 60)
    print("Test 3: Canonical Mapping")
    result3 = canonical_mapper(state2)
    print(f"Canonical: {result3}")