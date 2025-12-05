"""
Database initialization script for MongoDB
Creates indexes for better query performance
"""
from .base import get_database


def init_db():
    """Initialize database - create indexes"""
    print("Initializing MongoDB database...")
    db = get_database()
    
    # Create indexes for users collection
    print("Creating indexes for users collection...")
    users_collection = db["users"]
    users_collection.create_index("email", unique=True)
    users_collection.create_index("username", unique=True)
    print("✓ Users indexes created")
    
    # Create indexes for chat_sessions collection
    print("Creating indexes for chat_sessions collection...")
    sessions_collection = db["chat_sessions"]
    sessions_collection.create_index("user_id")
    sessions_collection.create_index([("user_id", 1), ("updated_at", -1)])
    print("✓ Chat sessions indexes created")
    
    # Create indexes for chat_messages collection
    print("Creating indexes for chat_messages collection...")
    messages_collection = db["chat_messages"]
    messages_collection.create_index("session_id")
    messages_collection.create_index([("session_id", 1), ("created_at", 1)])
    print("✓ Chat messages indexes created")
    
    # Create indexes for documents collection
    print("Creating indexes for documents collection...")
    documents_collection = db["documents"]
    documents_collection.create_index("user_id")
    documents_collection.create_index([("title", "text"), ("content", "text")])  # Text search index
    print("✓ Documents indexes created")
    
    # Create indexes for user_sessions collection
    print("Creating indexes for user_sessions collection...")
    sessions_collection = db["user_sessions"]
    sessions_collection.create_index("user_id")
    sessions_collection.create_index([("user_id", 1), ("token", 1)])
    sessions_collection.create_index("expires_at", expireAfterSeconds=0)  # TTL index for auto-deletion
    sessions_collection.create_index([("user_id", 1), ("is_active", 1)])
    print("✓ User sessions indexes created")
    
    # Create indexes for watchlist_items collection
    print("Creating indexes for watchlist_items collection...")
    watchlist_collection = db["watchlist_items"]
    watchlist_collection.create_index("user_id")
    watchlist_collection.create_index([("user_id", 1), ("symbol", 1)], unique=True)
    print("✓ Watchlist items indexes created")
    
    print("\n✓ Database initialization complete!")
    print("\nNote: ChromaDB vector store will be initialized automatically when first document is added.")


if __name__ == "__main__":
    init_db()
