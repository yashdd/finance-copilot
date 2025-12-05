"""Session management service for tracking active user sessions"""
from typing import Optional
from datetime import datetime, timedelta
from bson import ObjectId
from ..database import get_database

# Token expiration time (7 days in minutes) - matches security.py
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days


class SessionService:
    """Service for managing user sessions in MongoDB"""
    
    def __init__(self, db=None):
        self.db = db if db is not None else get_database()
        self.sessions_collection = self.db["user_sessions"]
    
    def create_session(self, user_id: str, token: str) -> str:
        """Create a new session for a user"""
        expires_at = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        session_doc = {
            "user_id": ObjectId(user_id),
            "token": token,  # Store token hash or identifier
            "created_at": datetime.utcnow(),
            "expires_at": expires_at,
            "is_active": True,
            "last_activity": datetime.utcnow()
        }
        
        result = self.sessions_collection.insert_one(session_doc)
        return str(result.inserted_id)
    
    def get_session(self, user_id: str, token: str) -> Optional[dict]:
        """Get an active session for a user and token"""
        session_doc = self.sessions_collection.find_one({
            "user_id": ObjectId(user_id),
            "token": token,
            "is_active": True,
            "expires_at": {"$gt": datetime.utcnow()}
        })
        return session_doc
    
    def is_session_valid(self, user_id: str, token: str) -> bool:
        """Check if a session is valid"""
        session = self.get_session(user_id, token)
        return session is not None
    
    def invalidate_session(self, user_id: str, token: str) -> bool:
        """Invalidate a specific session (logout)"""
        result = self.sessions_collection.update_one(
            {
                "user_id": ObjectId(user_id),
                "token": token,
                "is_active": True
            },
            {
                "$set": {
                    "is_active": False,
                    "logged_out_at": datetime.utcnow()
                }
            }
        )
        return result.modified_count > 0
    
    def invalidate_all_sessions(self, user_id: str) -> int:
        """Invalidate all sessions for a user (logout from all devices)"""
        result = self.sessions_collection.update_many(
            {
                "user_id": ObjectId(user_id),
                "is_active": True
            },
            {
                "$set": {
                    "is_active": False,
                    "logged_out_at": datetime.utcnow()
                }
            }
        )
        return result.modified_count
    
    def update_last_activity(self, user_id: str, token: str):
        """Update last activity timestamp for a session"""
        self.sessions_collection.update_one(
            {
                "user_id": ObjectId(user_id),
                "token": token,
                "is_active": True
            },
            {
                "$set": {
                    "last_activity": datetime.utcnow()
                }
            }
        )
    
    def cleanup_expired_sessions(self):
        """Remove expired sessions from database"""
        result = self.sessions_collection.delete_many({
            "expires_at": {"$lt": datetime.utcnow()}
        })
        return result.deleted_count
    
    def get_user_sessions(self, user_id: str) -> list:
        """Get all active sessions for a user"""
        sessions = list(self.sessions_collection.find({
            "user_id": ObjectId(user_id),
            "is_active": True,
            "expires_at": {"$gt": datetime.utcnow()}
        }).sort("created_at", -1))
        
        return [
            {
                "session_id": str(session["_id"]),
                "created_at": session["created_at"],
                "last_activity": session.get("last_activity"),
                "expires_at": session["expires_at"]
            }
            for session in sessions
        ]

