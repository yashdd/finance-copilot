from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List
from ..models.stock import WatchlistItem
from ..services.watchlist_service import WatchlistService
from ..services.ai_service import AIService
from ..database import get_db, User
from ..core.security import get_current_active_user

router = APIRouter(prefix="/watchlist", tags=["watchlist"])

ai_service = AIService()


class AddWatchlistRequest(BaseModel):
    symbol: str
    name: str


@router.post("/add", response_model=WatchlistItem)
def add_to_watchlist(
    request: AddWatchlistRequest,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Add a stock to user's watchlist"""
    try:
        watchlist_service = WatchlistService(db)
        return watchlist_service.add_to_watchlist(str(current_user.id), request.symbol, request.name)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/remove/{symbol}")
def remove_from_watchlist(
    symbol: str,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Remove a stock from user's watchlist"""
    try:
        watchlist_service = WatchlistService(db)
        success = watchlist_service.remove_from_watchlist(str(current_user.id), symbol)
        if not success:
            raise HTTPException(status_code=404, detail="Stock not found in watchlist")
        return {"message": f"{symbol} removed from watchlist"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/all", response_model=List[WatchlistItem])
def get_all_watchlist(
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Get all watchlist items for the current user with updated prices"""
    watchlist_service = WatchlistService(db)
    return watchlist_service.get_all(str(current_user.id))


@router.get("/check/{symbol}")
def check_watchlist(
    symbol: str,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Check if a symbol is in user's watchlist"""
    watchlist_service = WatchlistService(db)
    return {"in_watchlist": watchlist_service.is_in_watchlist(str(current_user.id), symbol)}


@router.post("/analyze")
def analyze_watchlist(
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """
    Simple watchlist analyzer - AI analyzes watchlist data without tools
    """
    try:
        user_id = str(current_user.id)
        watchlist_service = WatchlistService(db)
        
        # Get user's watchlist
        watchlist_items = watchlist_service.get_all(user_id)
        
        if not watchlist_items or len(watchlist_items) == 0:
            raise HTTPException(status_code=400, detail="Your watchlist is empty. Add some stocks to analyze.")
        
        # Ensure LLM is initialized
        if not ai_service._ensure_llm_initialized():
            detail_msg = ai_service.last_error or "AI not available. Please check Gemini API configuration."
            raise HTTPException(status_code=503, detail=detail_msg)
        
        # Build watchlist context
        symbols = [item.symbol for item in watchlist_items]
        symbols_str = ", ".join(symbols)
        
        # Build watchlist data summary
        watchlist_data = "\n".join([
            f"- {item.symbol}: ${item.current_price:.2f} (Change: {item.change_percent:.2f}%)"
            for item in watchlist_items
        ])
        
        # Create analysis prompt with structured output format
        analysis_prompt = f"""Analyze this watchlist of {len(watchlist_items)} stocks. Format your response EXACTLY with these sections, NO markdown formatting (no ** or __ or # symbols):

WATCHLIST DATA:
{watchlist_data}

---

PORTFOLIO OVERVIEW
2-3 sentences describing the overall watchlist composition and performance.

LEADERS & LAGGARDS
List top gainers and decliners with their changes.

PERFORMANCE ANALYSIS
Summary of overall watchlist performance, trends, and health.

ACTION ITEMS
Exactly 2 concise action items or observations.

DISCLAIMER
Not financial advice. Past performance does not guarantee future results.

Use plain text only. No markdown. Be concise and data-driven."""

        print(f"[WATCHLIST_ANALYZER] Starting analysis for user {user_id} with {len(watchlist_items)} stocks", flush=True)
        
        # Invoke LLM directly (no tools, no agent executor)
        from langchain_core.messages import HumanMessage
        response = ai_service.llm.invoke([HumanMessage(content=analysis_prompt)])
        
        analysis_text = response.content if hasattr(response, 'content') else str(response)
        
        # Clean up formatting - ensure sections are properly separated
        analysis_text = analysis_text.strip()

        print(f"[WATCHLIST_ANALYZER] Analysis complete for user {user_id}", flush=True)
        
        return {
            "watchlist_count": len(watchlist_items),
            "symbols": symbols,
            "analysis": analysis_text,
            "timestamp": "2024-01-01T00:00:00Z"  # Will be set by frontend
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"[WATCHLIST_ANALYZER] Error: {e}", flush=True)
        print(f"[WATCHLIST_ANALYZER] Traceback:\n{error_trace}", flush=True)
        raise HTTPException(status_code=500, detail=f"Error generating watchlist analysis: {str(e)}")
