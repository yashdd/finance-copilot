from fastapi import APIRouter, HTTPException, Depends
from ..models.chat import ChatRequest, ChatMessage, ChatSession, ChatSessionResponse
from ..services.ai_service import AIService
from ..services.watchlist_service import WatchlistService
from ..services.stock_service import StockService
from ..services.chat_session_service import ChatSessionService
from ..services.rag_service import RAGService
from ..services.tool_registry import BASE_TOOLS, create_user_tools
from ..database import get_db
from ..database.models import User
from ..core.security import get_current_active_user
from langchain.memory import ConversationBufferWindowMemory
from langchain_core.messages import HumanMessage, AIMessage
from datetime import datetime
from typing import List, Dict
import re

router = APIRouter(prefix="/chatbot", tags=["chatbot"])

ai_service = AIService()

# Memory storage per session: {session_id: ConversationBufferWindowMemory}
# Uses a windowed buffer (no LLM required) to keep recent messages
session_memories: Dict[str, ConversationBufferWindowMemory] = {}


def extract_stock_symbols(message: str) -> list[str]:
    """Extract potential stock symbols from user message"""
    # Pattern to match stock symbols (1-5 uppercase letters, possibly followed by numbers)
    # Common patterns: AAPL, MSFT, TSLA, BRK.B, etc.
    pattern = r'\b([A-Z]{1,5}(?:\.[A-Z])?)\b'
    matches = re.findall(pattern, message.upper())
    
    # Filter out common words that match the pattern
    common_words = {'I', 'A', 'AM', 'AN', 'AS', 'AT', 'BE', 'BY', 'DO', 'GO', 'HE', 'IF', 'IN', 'IS', 'IT', 'ME', 'MY', 'NO', 'OF', 'ON', 'OR', 'SO', 'TO', 'UP', 'US', 'WE'}
    symbols = [match for match in matches if match not in common_words and len(match) >= 2]
    
    # Remove duplicates while preserving order
    seen = set()
    unique_symbols = []
    for symbol in symbols:
        if symbol not in seen:
            seen.add(symbol)
            unique_symbols.append(symbol)
    
    return unique_symbols[:3]  # Limit to 3 symbols to avoid too many API calls


@router.post("/chat", response_model=ChatMessage)
def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Chat with FinanceCopilot AI assistant with enhanced context, session management, and conversation history"""
    print(f"[CHAT] Received chat request from user {current_user.id}", flush=True)
    print(f"[CHAT] Message: {request.message[:100]}...", flush=True)
    print(f"[CHAT] Session ID: {request.session_id}", flush=True)
    
    try:
        # Initialize services with database session
        print(f" [CHAT] Initializing services...", flush=True)
        chat_session_service = ChatSessionService(db)
        rag_service = RAGService(db)
        watchlist_service = WatchlistService(db)
        stock_service = StockService()
        
        user_id = str(current_user.id)
        print(f"[CHAT] User ID: {user_id}", flush=True)
        
        # Handle session management
        session_id = request.session_id
        if not session_id:
            # Create new session
            session = chat_session_service.create_session(user_id, request.message)
            session_id = session.id
        else:
            # Verify session exists and belongs to user
            if not chat_session_service.get_session(session_id, user_id):
                raise HTTPException(status_code=404, detail="Session not found")
        
        # Get conversation history
        conversation_history = []
        conversation_summary = None
        session_data = chat_session_service.get_session(session_id, user_id)
        
        if session_data:
            messages = session_data["messages"]
            conversation_history = [{"role": msg.role, "content": msg.content} for msg in messages]
            
            # Check if we should summarize (if summary doesn't exist and message count is high)
            if chat_session_service.should_summarize(session_id, user_id) and not session_data["session"].summary:
                # Summarize conversation
                conversation_summary = ai_service.summarize_conversation(conversation_history)
                if conversation_summary:
                    chat_session_service.update_summary(session_id, user_id, conversation_summary)
            else:
                # Use existing summary
                conversation_summary = session_data["session"].summary
        
        # Get or create conversation memory for this session
        memory_key = f"{user_id}_{session_id}"
        if memory_key not in session_memories:
            # Windowed memory that keeps the last N messages (no LLM required)
            memory = ConversationBufferWindowMemory(
                k=10,
                return_messages=True,
                memory_key="chat_history",
            )
            
            # Load existing messages into memory (last 10)
            if session_data and session_data["messages"]:
                recent_messages = session_data["messages"][-10:]
                for msg in recent_messages:
                    if msg.role == "user":
                        memory.chat_memory.add_user_message(msg.content)
                    elif msg.role == "assistant":
                        memory.chat_memory.add_ai_message(msg.content)
            session_memories[memory_key] = memory
        else:
            memory = session_memories[memory_key]
        
        # Save user message to session
        user_message = ChatMessage(
            role="user",
            content=request.message,
            timestamp=datetime.now().isoformat()
        )
        chat_session_service.add_message(session_id, user_id, user_message)
        
        # Get RAG context if available
        rag_context = rag_service.get_relevant_context(request.message, user_id, limit=3)
        
        # Get watchlist for context
        watchlist_items = watchlist_service.get_all(user_id)
        watchlist_symbols = [item.symbol for item in watchlist_items]
        watchlist_context = ", ".join(watchlist_symbols) if watchlist_symbols else "No stocks in watchlist"
        
        # Create user-specific tools with access to user_id and watchlist service
        user_tools = create_user_tools(user_id, watchlist_service)
        all_user_tools = BASE_TOOLS + user_tools
        
        # Set tools for this user session (with user-specific watchlist tools)
        ai_service.set_tools(all_user_tools)
        
        # Enhance user message with RAG context if available
        enhanced_message = request.message
        if rag_context:
            enhanced_message = f"Context from knowledge base:\n{rag_context}\n\nUser question: {request.message}"
        
        # Use tool-calling agent with memory (AI will decide which tools to use)
        print(f"[CHAT] Calling AI service with tools...", flush=True)
        try:
            response_text = ai_service.chat_response_with_tools(
                enhanced_message,
                memory=memory,
                watchlist_context=watchlist_context
            )
            print(f"[CHAT] Got response from agent: {response_text[:100]}...", flush=True)
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"[CHAT] Error with tool calling: {e}", flush=True)
            print(f"[CHAT] Traceback:\n{error_trace}", flush=True)
            # Fallback to regular chat if tool calling fails
            print(f"[CHAT] Falling back to regular chat...", flush=True)
            try:
                context = {
                    "watchlist": watchlist_symbols,
                    "detected_symbols": [],
                    "symbol_data": {},
                    "conversation_summary": conversation_summary,
                    "rag_context": rag_context,
                }
                response_text = ai_service.chat_response(
                    enhanced_message,
                    context,
                    conversation_history=conversation_history
                )
                print(f"[CHAT] Got fallback response: {response_text[:100]}...", flush=True)
            except Exception as fallback_error:
                import traceback
                fallback_trace = traceback.format_exc()
                print(f"[CHAT] Fallback also failed: {fallback_error}", flush=True)
                print(f"[CHAT] Fallback traceback:\n{fallback_trace}", flush=True)
                raise
        
        # Save assistant response to session
        assistant_message = ChatMessage(
            role="assistant",
            content=response_text,
            timestamp=datetime.now().isoformat()
        )
        chat_session_service.add_message(session_id, user_id, assistant_message)
        
        # Return response with session_id
        return ChatMessage(
            role="assistant",
            content=response_text,
            timestamp=datetime.now().isoformat(),
            session_id=session_id
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_msg = str(e)
        error_trace = traceback.format_exc()
        print(f"[CHAT] Error in chat endpoint: {error_msg}", flush=True)
        print(f"[CHAT] Full traceback:\n{error_trace}", flush=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {error_msg}")


@router.get("/sessions", response_model=List[ChatSession])
def list_sessions(
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """List all chat sessions for the current user"""
    try:
        chat_session_service = ChatSessionService(db)
        return chat_session_service.list_sessions(str(current_user.id))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/sessions/{session_id}", response_model=ChatSessionResponse)
def get_session(
    session_id: str,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Get a specific chat session with messages"""
    try:
        chat_session_service = ChatSessionService(db)
        session_data = chat_session_service.get_session(session_id, str(current_user.id))
        if not session_data:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return ChatSessionResponse(
            session=session_data["session"],
            messages=session_data["messages"]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/sessions", response_model=ChatSession)
def create_session(
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Create a new chat session"""
    try:
        chat_session_service = ChatSessionService(db)
        return chat_session_service.create_session(str(current_user.id))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/sessions/{session_id}")
def delete_session(
    session_id: str,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Delete a chat session"""
    try:
        chat_session_service = ChatSessionService(db)
        success = chat_session_service.delete_session(session_id, str(current_user.id))
        if not success:
            raise HTTPException(status_code=404, detail="Session not found")
        return {"message": "Session deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/session/current", response_model=ChatSessionResponse)
def get_or_create_current_session(
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Get or create the current chat session for the user"""
    try:
        chat_session_service = ChatSessionService(db)
        session = chat_session_service.get_or_create_session(str(current_user.id))
        
        # Get messages for this session
        session_data = chat_session_service.get_session(session.id, str(current_user.id))
        
        if session_data:
            return ChatSessionResponse(
                session=session_data["session"],
                messages=session_data["messages"]
            )
        else:
            # Return session with empty messages
            return ChatSessionResponse(
                session=session,
                messages=[]
            )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

