from typing import List, Optional
from datetime import datetime
from ..models.stock import WatchlistItem
from .finnhub_service import FinnhubService


class WatchlistService:
    def __init__(self):
        # In-memory storage (replace with database later)
        self.watchlist: List[WatchlistItem] = []
        self.finnhub = FinnhubService()
    
    def add_to_watchlist(self, symbol: str, name: str) -> WatchlistItem:
        """Add a stock to watchlist"""
        # Check if already exists
        for item in self.watchlist:
            if item.symbol.upper() == symbol.upper():
                return item
        
        # Get current price
        try:
            quote = self.finnhub.get_quote(symbol)
            new_item = WatchlistItem(
                symbol=symbol.upper(),
                name=name,
                added_at=str(datetime.now()),
                current_price=quote.current_price,
                change_percent=quote.change_percent
            )
        except:
            new_item = WatchlistItem(
                symbol=symbol.upper(),
                name=name,
                added_at=str(datetime.now())
            )
        
        self.watchlist.append(new_item)
        return new_item
    
    def remove_from_watchlist(self, symbol: str) -> bool:
        """Remove a stock from watchlist"""
        self.watchlist = [item for item in self.watchlist if item.symbol.upper() != symbol.upper()]
        return True
    
    def get_all(self) -> List[WatchlistItem]:
        """Get all watchlist items with updated prices"""
        updated_items = []
        for item in self.watchlist:
            try:
                quote = self.finnhub.get_quote(item.symbol)
                item.current_price = quote.current_price
                item.change_percent = quote.change_percent
            except:
                pass
            updated_items.append(item)
        return updated_items
    
    def is_in_watchlist(self, symbol: str) -> bool:
        """Check if symbol is in watchlist"""
        return any(item.symbol.upper() == symbol.upper() for item in self.watchlist)

