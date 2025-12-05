from typing import List, Optional, Dict
from datetime import datetime
from bson import ObjectId
from ..models.chat import ChatSession, ChatMessage
from ..database.models import ChatSession as DBChatSession, ChatMessage as DBChatMessage
from ..database import get_database


class ChatSessionService:
    """Service for managing chat sessions and conversation history with MongoDB"""
    
    def __init__(self, db=None):
        self.db = db if db is not None else get_database()
        self.sessions_collection = self.db["chat_sessions"]
        self.messages_collection = self.db["chat_messages"]
        self.max_messages_per_session = 100  # Limit messages per session
        self.summarize_threshold = 20  # Summarize when message count exceeds this
    
    def create_session(self, user_id: str, first_message: str = None) -> ChatSession:
        """Create a new chat session"""
        # Generate title from first message
        title = None
        if first_message:
            # Take first 50 chars as title
            title = first_message[:50].strip()
            if len(first_message) > 50:
                title += "..."
        
        # Create session document
        session_doc = {
            "user_id": ObjectId(user_id),
            "title": title or "New Chat",
            "message_count": 0,
            "summary": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = self.sessions_collection.insert_one(session_doc)
        session_id = str(result.inserted_id)
        
        return ChatSession(
            id=session_id,
            title=session_doc["title"],
            created_at=session_doc["created_at"].isoformat(),
            updated_at=session_doc["updated_at"].isoformat(),
            message_count=0,
            summary=None
        )
    
    def get_session(self, session_id: str, user_id: str) -> Optional[Dict]:
        """Get session with messages"""
        try:
            # Verify session belongs to user
            session_doc = self.sessions_collection.find_one({
                "_id": ObjectId(session_id),
                "user_id": ObjectId(user_id)
            })
            
            if not session_doc:
                return None
            
            # Get messages for this session
            message_docs = list(self.messages_collection.find(
                {"session_id": ObjectId(session_id)}
            ).sort("created_at", 1))  # Sort ascending by created_at
            
            # Convert to Pydantic models
            messages = [
                ChatMessage(
                    role=msg["role"],
                    content=msg["content"],
                    timestamp=msg["created_at"].isoformat(),
                    session_id=session_id
                )
                for msg in message_docs
            ]
            
            session = ChatSession(
                id=str(session_doc["_id"]),
                title=session_doc.get("title"),
                created_at=session_doc["created_at"].isoformat(),
                updated_at=session_doc.get("updated_at", session_doc["created_at"]).isoformat(),
                message_count=session_doc.get("message_count", len(messages)),
                summary=session_doc.get("summary")
            )
            
            return {
                "session": session,
                "messages": messages
            }
        except Exception as e:
            print(f"Error getting session: {e}")
            return None
    
    def add_message(self, session_id: str, user_id: str, message: ChatMessage) -> bool:
        """Add a message to a session"""
        try:
            # Verify session belongs to user
            session_doc = self.sessions_collection.find_one({
                "_id": ObjectId(session_id),
                "user_id": ObjectId(user_id)
            })
            
            if not session_doc:
                return False
            
            # Check message limit
            message_count = self.messages_collection.count_documents({
                "session_id": ObjectId(session_id)
            })
            
            if message_count >= self.max_messages_per_session:
                # Delete oldest messages (keep last max_messages_per_session - 10)
                messages_to_delete = list(self.messages_collection.find(
                    {"session_id": ObjectId(session_id)}
                ).sort("created_at", 1).limit(message_count - (self.max_messages_per_session - 10)))
                
                if messages_to_delete:
                    ids_to_delete = [msg["_id"] for msg in messages_to_delete]
                    self.messages_collection.delete_many({"_id": {"$in": ids_to_delete}})
            
            # Add new message
            message_doc = {
                "session_id": ObjectId(session_id),
                "role": message.role,
                "content": message.content,
                "created_at": datetime.utcnow()
            }
            
            self.messages_collection.insert_one(message_doc)
            
            # Update session message count and updated_at
            new_count = self.messages_collection.count_documents({
                "session_id": ObjectId(session_id)
            })
            
            self.sessions_collection.update_one(
                {"_id": ObjectId(session_id)},
                {
                    "$set": {
                        "message_count": new_count,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            return True
        except Exception as e:
            print(f"Error adding message: {e}")
            return False
    
    def get_messages(self, session_id: str, user_id: str, limit: Optional[int] = None) -> List[ChatMessage]:
        """Get messages for a session"""
        try:
            # Verify session belongs to user
            session_doc = self.sessions_collection.find_one({
                "_id": ObjectId(session_id),
                "user_id": ObjectId(user_id)
            })
            
            if not session_doc:
                return []
            
            query = self.messages_collection.find(
                {"session_id": ObjectId(session_id)}
            ).sort("created_at", 1)
            
            if limit:
                query = query.limit(limit)
            
            message_docs = list(query)
            
            return [
                ChatMessage(
                    role=msg["role"],
                    content=msg["content"],
                    timestamp=msg["created_at"].isoformat(),
                    session_id=session_id
                )
                for msg in message_docs
            ]
        except Exception as e:
            print(f"Error getting messages: {e}")
            return []
    
    def get_recent_messages(self, session_id: str, user_id: str, count: int = 10) -> List[ChatMessage]:
        """Get recent messages for context"""
        return self.get_messages(session_id, user_id, limit=count)
    
    def update_summary(self, session_id: str, user_id: str, summary: str):
        """Update conversation summary"""
        try:
            result = self.sessions_collection.update_one(
                {
                    "_id": ObjectId(session_id),
                    "user_id": ObjectId(user_id)
                },
                {
                    "$set": {
                        "summary": summary,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            return result.modified_count > 0
        except Exception as e:
            print(f"Error updating summary: {e}")
            return False
    
    def list_sessions(self, user_id: str, limit: int = 50) -> List[ChatSession]:
        """List all sessions for a user, sorted by updated_at"""
        try:
            session_docs = list(self.sessions_collection.find(
                {"user_id": ObjectId(user_id)}
            ).sort("updated_at", -1).limit(limit))
            
            return [
                ChatSession(
                    id=str(session["_id"]),
                    title=session.get("title"),
                    created_at=session["created_at"].isoformat(),
                    updated_at=session.get("updated_at", session["created_at"]).isoformat(),
                    message_count=session.get("message_count", 0),
                    summary=session.get("summary")
                )
                for session in session_docs
            ]
        except Exception as e:
            print(f"Error listing sessions: {e}")
            return []
    
    def delete_session(self, session_id: str, user_id: str) -> bool:
        """Delete a session and all its messages"""
        try:
            # Verify session belongs to user
            session_doc = self.sessions_collection.find_one({
                "_id": ObjectId(session_id),
                "user_id": ObjectId(user_id)
            })
            
            if not session_doc:
                return False
            
            # Delete all messages
            self.messages_collection.delete_many({"session_id": ObjectId(session_id)})
            
            # Delete session
            result = self.sessions_collection.delete_one({"_id": ObjectId(session_id)})
            
            return result.deleted_count > 0
        except Exception as e:
            print(f"Error deleting session: {e}")
            return False
    
    def should_summarize(self, session_id: str, user_id: str) -> bool:
        """Check if session should be summarized"""
        try:
            session_doc = self.sessions_collection.find_one({
                "_id": ObjectId(session_id),
                "user_id": ObjectId(user_id)
            })
            
            if not session_doc:
                return False
            
            return session_doc.get("message_count", 0) >= self.summarize_threshold
        except Exception as e:
            print(f"Error checking summarize: {e}")
            return False
