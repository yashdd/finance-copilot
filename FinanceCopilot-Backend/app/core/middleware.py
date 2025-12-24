"""Authentication middleware to protect routes"""
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from ..core.security import decode_access_token, get_token_hash
from ..services.session_service import SessionService
from ..database import get_database


class AuthMiddleware(BaseHTTPMiddleware):
    """Middleware to protect all routes except auth and health endpoints"""
    
    # Public paths that don't require authentication
    PUBLIC_PATHS = [
        "/api",
        "/api/auth/register",
        "/api/auth/login",
        "/api/auth/verify-email",
        "/api/health",
        "/",
        "/docs",
        "/openapi.json",
        "/redoc"
    ]
    
    async def dispatch(self, request: Request, call_next):
        # Get the path without query parameters
        path = request.url.path
        print(f"[Middleware] {request.method} {path}")
        
        # Skip authentication for OPTIONS requests (CORS preflight) - MUST be first
        if request.method == "OPTIONS":
            print(f"[Middleware] OPTIONS request (CORS preflight), allowing")
            response = await call_next(request)
            # Ensure CORS headers are present for OPTIONS requests
            origin = request.headers.get("Origin", "")
            if origin and ("localhost" in origin.lower() or "127.0.0.1" in origin):
                response.headers["Access-Control-Allow-Origin"] = origin
            else:
                response.headers["Access-Control-Allow-Origin"] = "*"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
            response.headers["Access-Control-Allow-Headers"] = "*"
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Max-Age"] = "600"
            return response
        
        # Skip authentication for public paths
        if any(path == public_path or path.startswith(public_path + "/") for public_path in self.PUBLIC_PATHS):
            print(f"[Middleware] Public path, allowing request")
            response = await call_next(request)
            # Add CORS headers for public paths
            origin = request.headers.get("Origin")
            if origin and ("localhost" in origin.lower() or "127.0.0.1" in origin):
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
                response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
                response.headers["Access-Control-Allow-Headers"] = "*"
            return response
        
        # Get token from Authorization header
        authorization = request.headers.get("Authorization", "")
        if not authorization.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        token = authorization.split(" ")[1]
        
        # Decode and validate token
        payload = decode_access_token(token)
        if payload is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Check session validity
        try:
            db = get_database()
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
            print(f"Error in auth middleware: {e}")
            # Continue if session check fails (for backward compatibility)
            pass
        
        # Continue with the request
        try:
            response = await call_next(request)
            # Add CORS headers to successful responses
            origin = request.headers.get("Origin")
            if origin and ("localhost" in origin or "127.0.0.1" in origin):
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
                response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
                response.headers["Access-Control-Allow-Headers"] = "*"
            return response
        except HTTPException as e:
            # Convert HTTPException to response with CORS headers
            from fastapi.responses import JSONResponse
            origin = request.headers.get("Origin")
            response = JSONResponse(
                status_code=e.status_code,
                content={"detail": e.detail},
                headers=e.headers or {}
            )
            if origin and ("localhost" in origin or "127.0.0.1" in origin):
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
                response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
                response.headers["Access-Control-Allow-Headers"] = "*"
            return response
        except Exception as e:
            # Catch any other exceptions and add CORS headers
            from fastapi.responses import JSONResponse
            import traceback
            origin = request.headers.get("Origin")
            print(f"[MIDDLEWARE] Exception caught: {e}", flush=True)
            print(traceback.format_exc(), flush=True)
            response = JSONResponse(
                status_code=500,
                content={"detail": f"Internal server error: {str(e)}"}
            )
            if origin and ("localhost" in origin or "127.0.0.1" in origin):
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
                response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
                response.headers["Access-Control-Allow-Headers"] = "*"
            return response

