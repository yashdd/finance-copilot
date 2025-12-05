from fastapi import APIRouter, HTTPException, Depends
from ..models.chat import ChatRequest, ChatMessage, ChatSession, ChatSessionResponse
from ..services.ai_service import AIService
from ..services.watchlist_service import WatchlistService
from ..services.finnhub_service import FinnhubService
from ..services.chat_session_service import ChatSessionService
from ..services.rag_service import RAGService
from ..services.tool_registry import ALL_TOOLS
from ..database import get_db
from ..database.models import User
from ..core.security import get_current_active_user
from langchain.memory import ConversationSummaryBufferMemory
from langchain_core.messages import HumanMessage, AIMessage
from datetime import datetime
from typing import List, Dict
import re

router = APIRouter(prefix="/chatbot", tags=["chatbot"])

ai_service = AIService()

# Initialize tools and agent
ai_service.set_tools(ALL_TOOLS)

# Memory storage per session: {session_id: ConversationSummaryBufferMemory}
# This automatically summarizes old conversations to reduce context window
session_memories: Dict[str, ConversationSummaryBufferMemory] = {}


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
    try:
        # Initialize services with database session
        chat_session_service = ChatSessionService(db)
        rag_service = RAGService(db)
        watchlist_service = WatchlistService(db)
        finnhub_service = FinnhubService()
        
        user_id = str(current_user.id)
        
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
        
        # Get or create LangChain summarization memory for this session
        memory_key = f"{user_id}_{session_id}"
        if memory_key not in session_memories:
            # Use ConversationSummaryBufferMemory which automatically summarizes old conversations
            # max_token_limit: When conversation exceeds this, older messages are summarized
            # llm: Used for summarization (will use the same LLM from ai_service)
            memory = ConversationSummaryBufferMemory(
                llm=ai_service.llm,
                max_token_limit=1000,  # Summarize when conversation exceeds ~1000 tokens
                return_messages=True,
                memory_key="chat_history",
                moving_summary_buffer="summary"
            )
            
            # Load existing messages into memory
            # If there's a summary, use it; otherwise load recent messages
            if session_data and session_data["messages"]:
                # If session has a summary, add it to the memory's summary buffer
                if session_data["session"].summary:
                    memory.moving_summary_buffer = session_data["session"].summary
                    print(f"Loaded existing summary for session {session_id}")
                
                # Load recent messages (last 10) into memory
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
        watchlist_items = watchlist_service.get_all()
        watchlist_symbols = [item.symbol for item in watchlist_items]
        watchlist_context = ", ".join(watchlist_symbols) if watchlist_symbols else "No stocks in watchlist"
        
        # Enhance user message with RAG context if available
        enhanced_message = request.message
        if rag_context:
            enhanced_message = f"Context from knowledge base:\n{rag_context}\n\nUser question: {request.message}"
        
        # Use tool-calling agent with memory (AI will decide which tools to use)
        try:
            response_text = ai_service.chat_response_with_tools(
                enhanced_message,
                memory=memory,
                watchlist_context=watchlist_context
            )
        except Exception as e:
            print(f"Error with tool calling, falling back to regular chat: {e}")
            # Fallback to regular chat if tool calling fails
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
        
        # Save assistant response to session
        assistant_message = ChatMessage(
            role="assistant",
            content=response_text,
            timestamp=datetime.now().isoformat()
        )
        chat_session_service.add_message(session_id, user_id, assistant_message)
        
        # Update session summary if memory has generated/updated a summary
        # ConversationSummaryBufferMemory automatically updates the summary when needed
        try:
            current_summary = memory.moving_summary_buffer
            if current_summary and current_summary != (session_data["session"].summary if session_data else None):
                # Summary was updated, save it to session
                chat_session_service.update_summary(session_id, user_id, current_summary)
                print(f"Updated summary for session {session_id}")
        except Exception as e:
            print(f"Could not update summary: {e}")
        
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
        print(f"Error in chat endpoint: {error_msg}")
        print(traceback.format_exc())
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

