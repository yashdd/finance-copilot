from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from ..models.stock import WatchlistItem
from ..services.watchlist_service import WatchlistService

router = APIRouter(prefix="/watchlist", tags=["watchlist"])

# Singleton service instance (in production, use dependency injection)
watchlist_service = WatchlistService()


class AddWatchlistRequest(BaseModel):
    symbol: str
    name: str


@router.post("/add", response_model=WatchlistItem)
def add_to_watchlist(request: AddWatchlistRequest):
    """Add a stock to watchlist"""
    try:
        return watchlist_service.add_to_watchlist(request.symbol, request.name)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/remove/{symbol}")
def remove_from_watchlist(symbol: str):
    """Remove a stock from watchlist"""
    try:
        watchlist_service.remove_from_watchlist(symbol)
        return {"message": f"{symbol} removed from watchlist"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/all", response_model=List[WatchlistItem])
def get_all_watchlist():
    """Get all watchlist items with updated prices"""
    return watchlist_service.get_all()


@router.get("/check/{symbol}")
def check_watchlist(symbol: str):
    """Check if a symbol is in watchlist"""
    return {"in_watchlist": watchlist_service.is_in_watchlist(symbol)}

