from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    timestamp: Optional[str] = None
    session_id: Optional[str] = None  # Session ID for tracking


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None  # If None, creates new session
    context: Optional[dict] = None


class ChatSession(BaseModel):
    id: str
    title: Optional[str] = None  # Auto-generated from first message
    created_at: str
    updated_at: str
    message_count: int = 0
    summary: Optional[str] = None  # Summarized conversation history


class ChatSessionResponse(BaseModel):
    session: ChatSession
    messages: List[ChatMessage]

