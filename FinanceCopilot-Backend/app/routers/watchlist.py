from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List
from ..models.stock import WatchlistItem
from ..services.watchlist_service import WatchlistService
from ..database import get_db, User
from ..core.security import get_current_active_user

router = APIRouter(prefix="/watchlist", tags=["watchlist"])


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
