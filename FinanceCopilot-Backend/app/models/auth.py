from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    """User registration model"""
    email: EmailStr
    username: str
    password: str
    confirm_password: str
    full_name: Optional[str] = None
    age: Optional[int] = None


class UserLogin(BaseModel):
    """User login model"""
    username: str  # Username only
    password: str


class UserResponse(BaseModel):
    """User response model"""
    id: str
    email: str
    username: str
    full_name: Optional[str] = None
    age: Optional[int] = None
    is_active: bool
    is_verified: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class EmailVerificationRequest(BaseModel):
    """Email verification request model"""
    token: str


class SessionInfo(BaseModel):
    """Session information model"""
    session_id: str
    user_id: str
    created_at: datetime
    expires_at: datetime
    is_active: bool


class Token(BaseModel):
    """Token response model"""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenData(BaseModel):
    """Token data model"""
    user_id: Optional[str] = None

