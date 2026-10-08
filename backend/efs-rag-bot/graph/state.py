# from typing import TypedDict, List

# class RAGState(TypedDict):
#     question: str
#     room: str
#     docs: List[str]
#     answer: str


# graph/state.py
from typing import TypedDict, List, Optional

class RAGState(TypedDict):
    """
    State object that flows through the LangGraph pipeline.
    All nodes read from and write to this state.
    """
    # Input
    question: str
    room: str
    conversation_history: Optional[List[dict]]
    
    # Intent detection
    intent: Optional[str]
    
    # Missing info detection
    is_complete: Optional[bool]
    missing_info: Optional[List[str]]
    confidence: Optional[str]
    
    # Follow-up generation
    needs_followup: Optional[bool]
    followup_question: Optional[str]
    
    # Canonical mapping
    canonical_question: Optional[str]
    
    # Retrieval
    docs: Optional[List[str]]
    
    # Final answer
    answer: Optional[str]