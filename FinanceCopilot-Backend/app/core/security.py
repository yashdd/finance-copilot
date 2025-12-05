from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from bson import ObjectId
from ..database import get_db, User
from ..services.session_service import SessionService
from ..config import settings
import os
import hashlib
import bcrypt

# Password hashing
# Use bcrypt directly to avoid passlib's initialization issues with long passwords
# We'll handle password length by pre-hashing with SHA256
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def _prehash_password(password: str) -> str:
    """
    Pre-hash password with SHA256 to handle bcrypt's 72-byte limit.
    This converts any length password to a fixed 64-character hex string (64 bytes < 72 bytes).
    This completely removes password length restrictions.
    """
    # SHA256 produces 32 bytes = 64 hex characters = 64 bytes (well under 72 byte limit)
    return hashlib.sha256(password.encode('utf-8')).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash"""
    # Pre-hash the plain password to match the stored hash
    prehashed_password = _prehash_password(plain_password)
    
    # Check if hash starts with $2b$ (bcrypt format) - if so, use bcrypt directly
    if hashed_password.startswith("$2b$") or hashed_password.startswith("$2a$"):
        # Use bcrypt directly to avoid passlib initialization issues
        try:
            return bcrypt.checkpw(prehashed_password.encode('utf-8'), hashed_password.encode('utf-8'))
        except Exception:
            # Fallback to passlib if bcrypt fails
            return pwd_context.verify(prehashed_password, hashed_password)
    else:
        # Use passlib for other hash formats
        return pwd_context.verify(prehashed_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Hash a password using bcrypt.
    Pre-hashes with SHA256 first to handle bcrypt's 72-byte limit.
    This removes any password length restrictions.
    Uses bcrypt directly to avoid passlib initialization issues.
    """
    # Pre-hash with SHA256 to ensure it's always under 72 bytes
    # SHA256 hex digest = 64 characters = 64 bytes (well under 72 byte limit)
    prehashed_password = _prehash_password(password)
    
    # Verify the pre-hashed password is under 72 bytes
    prehashed_bytes = len(prehashed_password.encode('utf-8'))
    if prehashed_bytes > 72:
        # This should never happen with SHA256, but just in case
        raise ValueError(f"Pre-hashed password is {prehashed_bytes} bytes, exceeds 72 byte limit")
    
    # Use bcrypt directly to avoid passlib's initialization issues with long passwords
    # This bypasses passlib's detect_wrap_bug which causes the error
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(prehashed_password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """Decode and verify a JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def get_token_hash(token: str) -> str:
    """Create a hash of the token for session storage"""
    return hashlib.sha256(token.encode()).hexdigest()


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db=Depends(get_db)
) -> User:
    """Get current authenticated user from JWT token with session validation"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    
    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    
    # Check session validity
    try:
        session_service = SessionService(db)
        token_hash = get_token_hash(token)
        if not session_service.is_session_valid(user_id, token_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session expired or invalid. Please login again.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Update last activity
        session_service.update_last_activity(user_id, token_hash)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error checking session: {e}")
        # Continue with user validation even if session check fails
    
    # Query MongoDB for user
    try:
        users_collection = db["users"]
        user_doc = users_collection.find_one({"_id": ObjectId(user_id)})
        
        if user_doc is None:
            raise credentials_exception
        
        user = User(**user_doc)
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive"
            )
        
        return user
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting user: {e}")
        raise credentials_exception


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current active user (dependency for protected routes)"""
    return current_user
