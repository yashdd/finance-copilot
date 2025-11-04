from fastapi import APIRouter, HTTPException
from ..models.chat import ChatRequest, ChatMessage
from ..services.ai_service import AIService
from ..services.watchlist_service import WatchlistService
from datetime import datetime

router = APIRouter(prefix="/chatbot", tags=["chatbot"])

ai_service = AIService()
watchlist_service = WatchlistService()


@router.post("/chat", response_model=ChatMessage)
def chat(request: ChatRequest):
    """Chat with FinanceCopilot AI assistant"""
    try:
        # Build context from watchlist
        watchlist_items = watchlist_service.get_all()
        watchlist_symbols = [item.symbol for item in watchlist_items]
        
        context = {
            "watchlist": watchlist_symbols,
            "recent_queries": []  # Could be enhanced with session storage
        }
        
        # Generate response
        response_text = ai_service.chat_response(request.message, context)
        
        return ChatMessage(
            role="assistant",
            content=response_text,
            timestamp=datetime.now().isoformat()
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

