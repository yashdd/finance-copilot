from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from ..models.stock import WatchlistItem
from ..database.models import WatchlistItem as DBWatchlistItem
from .stock_service import StockService


class WatchlistService:
    MAX_WATCHLIST_SIZE = 20
    
    def __init__(self, db=None):
        from ..database import get_database
        self.db = db if db is not None else get_database()
        self.watchlist_collection = self.db["watchlist_items"]
        self.stock_service = StockService()
    
    def add_to_watchlist(self, user_id: str, symbol: str, name: str) -> WatchlistItem:
        """Add a stock to user's watchlist"""
        # Check if already exists for this user
        existing = self.watchlist_collection.find_one({
            "user_id": ObjectId(user_id),
            "symbol": symbol.upper()
        })
        
        if existing:
            # Return existing item
            return WatchlistItem(
                id=str(existing["_id"]),
                user_id=str(existing["user_id"]),
                symbol=existing["symbol"],
                name=existing.get("name"),
                added_at=existing["added_at"].isoformat() if isinstance(existing["added_at"], datetime) else existing["added_at"],
                current_price=existing.get("current_price"),
                change_percent=existing.get("change_percent")
            )
        
        # Check watchlist limit for this user
        user_watchlist_count = self.watchlist_collection.count_documents({
            "user_id": ObjectId(user_id)
        })
        
        if user_watchlist_count >= self.MAX_WATCHLIST_SIZE:
            raise ValueError(f"Watchlist limit reached. Maximum {self.MAX_WATCHLIST_SIZE} stocks allowed. Please remove some stocks before adding new ones.")
        
        # Get current price
        try:
            quote = self.stock_service.get_quote(symbol)
            current_price = quote.current_price
            change_percent = quote.change_percent
        except:
            current_price = None
            change_percent = None
        
        # Create watchlist item document
        watchlist_doc = {
            "user_id": ObjectId(user_id),
            "symbol": symbol.upper(),
            "name": name,
            "added_at": datetime.utcnow(),
            "current_price": current_price,
            "change_percent": change_percent
        }
        
        result = self.watchlist_collection.insert_one(watchlist_doc)
        watchlist_doc["_id"] = result.inserted_id
        
        return WatchlistItem(
            id=str(watchlist_doc["_id"]),
            user_id=str(watchlist_doc["user_id"]),
            symbol=watchlist_doc["symbol"],
            name=watchlist_doc["name"],
            added_at=watchlist_doc["added_at"].isoformat() if isinstance(watchlist_doc["added_at"], datetime) else watchlist_doc["added_at"],
            current_price=watchlist_doc.get("current_price"),
            change_percent=watchlist_doc.get("change_percent")
        )
    
    def remove_from_watchlist(self, user_id: str, symbol: str) -> bool:
        """Remove a stock from user's watchlist"""
        result = self.watchlist_collection.delete_one({
            "user_id": ObjectId(user_id),
            "symbol": symbol.upper()
        })
        return result.deleted_count > 0
    
    def get_all(self, user_id: str) -> List[WatchlistItem]:
        """Get all watchlist items for a user with updated prices"""
        watchlist_docs = list(self.watchlist_collection.find({
            "user_id": ObjectId(user_id)
        }).sort("added_at", -1))
        
        updated_items = []
        for doc in watchlist_docs:
            # Update prices
            try:
                quote = self.stock_service.get_quote(doc["symbol"])
                # Update in database
                self.watchlist_collection.update_one(
                    {"_id": doc["_id"]},
                    {
                        "$set": {
                            "current_price": quote.current_price,
                            "change_percent": quote.change_percent
                        }
                    }
                )
                doc["current_price"] = quote.current_price
                doc["change_percent"] = quote.change_percent
            except:
                pass
            
            updated_items.append(WatchlistItem(
                id=str(doc["_id"]),
                user_id=str(doc["user_id"]),
                symbol=doc["symbol"],
                name=doc.get("name"),
                added_at=doc["added_at"].isoformat() if isinstance(doc["added_at"], datetime) else doc["added_at"],
                current_price=doc.get("current_price"),
                change_percent=doc.get("change_percent")
            ))
        
        return updated_items
    
    def is_in_watchlist(self, user_id: str, symbol: str) -> bool:
        """Check if symbol is in user's watchlist"""
        count = self.watchlist_collection.count_documents({
            "user_id": ObjectId(user_id),
            "symbol": symbol.upper()
        })
        return count > 0
