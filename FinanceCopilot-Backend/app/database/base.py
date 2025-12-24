from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
from ..config import settings
import os
from typing import Optional

# MongoDB connection URL
MONGODB_URL = os.getenv(
    "MONGODB_URL",
    "mongodb://localhost:27017/"
)

# For sync operations (pymongo)
mongodb_client: Optional[MongoClient] = None
database = None


def get_mongodb_client() -> MongoClient:
    """Get MongoDB client (sync)"""
    global mongodb_client
    if mongodb_client is None:
        try:
            mongodb_client = MongoClient(MONGODB_URL, serverSelectionTimeoutMS=5000)
            # Test connection
            mongodb_client.admin.command('ping')
            print(f"✓ Connected to MongoDB at {MONGODB_URL}")
        except Exception as e:
            print(f"✗ MongoDB connection error: {e}")
            print(f"  Connection URL: {MONGODB_URL}")
            raise ConnectionError(f"Failed to connect to MongoDB: {e}")
    return mongodb_client


def get_database():
    """Get MongoDB database instance"""
    global database
    if database is None:
        client = get_mongodb_client()
        # Extract database name from URL or use default
        db_name = os.getenv("MONGO_DB", "FinanceCopilot")
        # If URL contains database name after the last /, use it
        # Format: mongodb://host:port/dbname
        url_clean = MONGODB_URL.rstrip("/")
        if "/" in url_clean:
            url_parts = url_clean.split("/")
            # Last part after the last / should be the database name
            # Skip if it's empty, contains ":" (host:port), or is all digits
            if len(url_parts) > 1:
                potential_db = url_parts[-1]
                # Only use if it's a valid database name (no colons, not empty, not all digits)
                if potential_db and ":" not in potential_db and not potential_db.isdigit():
                    db_name = potential_db
        database = client[db_name]
        print(f"Connected to MongoDB database: {db_name}")
    return database


def get_db():
    """Dependency for getting database (for FastAPI dependency injection)"""
    try:
        db = get_database()
        print(f"[DB] Database dependency called, returning database: {db}", flush=True)
        return db
    except Exception as e:
        import traceback
        print(f"[DB] Error in get_db dependency: {e}", flush=True)
        print(f"[DB] Traceback:\n{traceback.format_exc()}", flush=True)
        raise


def close_mongodb_connection():
    """Close MongoDB connection"""
    global mongodb_client
    if mongodb_client is not None:
        mongodb_client.close()
        mongodb_client = None
