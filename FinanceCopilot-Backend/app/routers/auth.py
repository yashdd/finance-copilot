from fastapi import APIRouter, Depends, HTTPException, status, Request
from datetime import timedelta, datetime
from bson import ObjectId
import secrets
from ..database import get_db, User
from ..models.auth import (
    UserCreate, 
    UserLogin, 
    UserResponse, 
    Token,
    EmailVerificationRequest
)
from ..core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_active_user,
    get_token_hash,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
from ..services.session_service import SessionService
from ..utils.email_service import EmailService

router = APIRouter(prefix="/auth", tags=["authentication"])


def generate_verification_token() -> str:
    """Generate a secure verification token"""
    return secrets.token_urlsafe(32)


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db=Depends(get_db)):
    """Register a new user with email verification"""
    import sys
    import traceback
    try:
        print(f"[REGISTER] Endpoint called - Email: {user_data.email}, Username: {user_data.username}", flush=True)
        print(f"[REGISTER] Database object: {db}", flush=True)
        
        users_collection = db["users"]
        print(f"[REGISTER] Users collection obtained: {users_collection}", flush=True)
        
        # Validate password confirmation
        if user_data.password != user_data.confirm_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Passwords do not match"
            )
        
        # Validate password strength
        if len(user_data.password) < 8:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 8 characters long"
            )
        
        # Validate age if provided
        if user_data.age is not None and (user_data.age < 13 or user_data.age > 120):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Age must be between 13 and 120"
            )
        
        # Check if username already exists
        try:
            existing_user = users_collection.find_one({"username": user_data.username})
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already registered"
                )
        except Exception as e:
            if isinstance(e, HTTPException):
                raise
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error checking username: {str(e)}"
            )
        
        # Check if email already exists
        try:
            existing_email = users_collection.find_one({"email": user_data.email})
            if existing_email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )
        except Exception as e:
            if isinstance(e, HTTPException):
                raise
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error checking email: {str(e)}"
            )
        
        # Generate verification token
        verification_token = generate_verification_token()
        
        # Create new user
        hashed_password = get_password_hash(user_data.password)
        user_doc = {
            "email": user_data.email,
            "username": user_data.username,
            "hashed_password": hashed_password,
            "full_name": user_data.full_name,
            "age": user_data.age,
            "is_active": True,
            "is_verified": False,
            "verification_token": verification_token,
            "email_verified_at": None,
            "created_at": datetime.utcnow(),
            "updated_at": None
        }
        
        # Insert user into MongoDB
        try:
            result = users_collection.insert_one(user_doc)
            user_doc["_id"] = result.inserted_id
        except Exception as e:
            import traceback
            print(f"MongoDB insert error: {e}")
            print(traceback.format_exc())
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create user in database: {str(e)}"
            )
        
        # Send verification email
        try:
            EmailService.send_verification_email(user_data.email, verification_token)
        except Exception as e:
            print(f"Error sending verification email: {e}")
            # Don't fail registration if email fails, but log it
        
        # Convert to User model for response
        try:
            print(f"[REGISTER] Converting user_doc to User model...", flush=True)
            print(f"[REGISTER] user_doc keys: {list(user_doc.keys())}", flush=True)
            print(f"[REGISTER] user_doc _id type: {type(user_doc.get('_id'))}", flush=True)
            
            # Convert _id to string for UserResponse (before creating User model)
            user_id_str = str(user_doc["_id"]) if user_doc.get("_id") else None
            
            # Ensure _id is ObjectId for User model
            if "_id" in user_doc and not isinstance(user_doc["_id"], ObjectId):
                user_doc["_id"] = ObjectId(user_doc["_id"])
            
            user = User(**user_doc)
            print(f"[REGISTER] User model created successfully", flush=True)
            
            return UserResponse(
                id=user_id_str,
                email=user.email,
                username=user.username,
                full_name=user.full_name,
                age=user.age,
                is_active=user.is_active,
                is_verified=user.is_verified,
                created_at=user.created_at,
            )
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"[REGISTER] Error creating UserResponse: {e}", flush=True)
            print(f"[REGISTER] Traceback:\n{error_trace}", flush=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error creating response: {str(e)}"
            )
            
    except HTTPException as e:
        print(f"[REGISTER] HTTPException: {e.detail}", flush=True)
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"[REGISTER] Unexpected error: {e}", flush=True)
        print(f"[REGISTER] Traceback:\n{error_trace}", flush=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.post("/verify-email", response_model=dict)
def verify_email(verification_data: EmailVerificationRequest, db=Depends(get_db)):
    """Verify user email with verification token"""
    users_collection = db["users"]
    
    # Find user by verification token
    user_doc = users_collection.find_one({
        "verification_token": verification_data.token,
        "is_verified": False
    })
    
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token"
        )
    
    # Update user as verified
    users_collection.update_one(
        {"_id": user_doc["_id"]},
        {
            "$set": {
                "is_verified": True,
                "email_verified_at": datetime.utcnow(),
                "verification_token": None,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return {
        "message": "Email verified successfully",
        "verified": True
    }


@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db=Depends(get_db)):
    """Login and get access token with session management"""
    users_collection = db["users"]
    session_service = SessionService(db)
    
    # Find user by username only
    user_doc = users_collection.find_one({"username": credentials.username})
    
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    user = User(**user_doc)
    
    if not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    # Check if email is verified (optional - you can make this required)
    # if not user.is_verified:
    #     raise HTTPException(
    #         status_code=status.HTTP_403_FORBIDDEN,
    #         detail="Please verify your email before logging in"
    #     )
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=access_token_expires
    )
    
    # Create session
    token_hash = get_token_hash(access_token)
    session_service.create_session(str(user.id), token_hash)
    
    # Convert user.id (ObjectId) to string for UserResponse
    user_id_str = str(user.id) if user.id else None
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            id=user_id_str,
            email=user.email,
            username=user.username,
            full_name=user.full_name,
            age=user.age,
            is_active=user.is_active,
            is_verified=user.is_verified,
            created_at=user.created_at,
        )
    )


@router.post("/logout")
def logout(
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Logout and invalidate current session"""
    
    session_service = SessionService(db)
    
    # Get token from Authorization header
    try:
        authorization = request.headers.get("Authorization", "")
        if authorization.startswith("Bearer "):
            token = authorization.split(" ")[1]
            token_hash = get_token_hash(token)
            # Invalidate specific session
            session_service.invalidate_session(str(current_user.id), token_hash)
            return {"message": "Logged out successfully"}
        else:
            # Fallback: invalidate all sessions
            count = session_service.invalidate_all_sessions(str(current_user.id))
            return {
                "message": "Logged out successfully",
                "sessions_invalidated": count
            }
    except Exception as e:
        print(f"Error during logout: {e}")
        # Still return success even if session invalidation fails
        return {"message": "Logged out successfully"}


@router.post("/logout-all")
def logout_all(
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Logout from all devices (invalidate all sessions)"""
    session_service = SessionService(db)
    count = session_service.invalidate_all_sessions(str(current_user.id))
    
    return {
        "message": "Logged out from all devices successfully",
        "sessions_invalidated": count
    }


@router.get("/sessions")
def get_sessions(
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db)
):
    """Get all active sessions for the current user"""
    session_service = SessionService(db)
    sessions = session_service.get_user_sessions(str(current_user.id))
    
    return {
        "sessions": sessions,
        "count": len(sessions)
    }


@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """Get current user information"""
    # Convert user.id (ObjectId) to string for UserResponse
    user_id_str = str(current_user.id) if current_user.id else None
    
    return UserResponse(
        id=user_id_str,
        email=current_user.email,
        username=current_user.username,
        full_name=current_user.full_name,
        age=current_user.age,
        is_active=current_user.is_active,
        is_verified=current_user.is_verified,
        created_at=current_user.created_at,
    )
