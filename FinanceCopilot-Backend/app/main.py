from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import traceback

from .config import settings
from .routers import health, watchlist, stock, news, insights, company, chatbot, auth, rag
from .core.middleware import AuthMiddleware
from .database.init_db import init_db


app = FastAPI(title=settings.app_name)

# Initialize database indexes on startup
@app.on_event("startup")
async def startup_event():
    """Initialize database indexes on application startup"""
    try:
        init_db()
        print("✓ Database indexes initialized")
    except Exception as e:
        print(f"⚠ Warning: Could not initialize database indexes: {e}")
        print("  The application will continue, but some queries may be slower.")

# Get allowed origins from settings
ALLOWED_ORIGINS = settings.allowed_origins
print(f"🔵 CORS: Allowing origins: {ALLOWED_ORIGINS}", flush=True)


def add_cors_headers(response: JSONResponse, request: Request) -> JSONResponse:
    """Add CORS headers to a response"""
    origin = request.headers.get("Origin")
    # Allow localhost:3000 and any other localhost/127.0.0.1 origin
    if origin and ("localhost" in origin.lower() or "127.0.0.1" in origin):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["Access-Control-Max-Age"] = "600"
    return response


# HTTPException handler (adds CORS headers)
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    response = JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )
    return add_cors_headers(response, request)


# RequestValidationError handler (adds CORS headers)
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    response = JSONResponse(
        status_code=422,
        content={"detail": exc.errors()}
    )
    return add_cors_headers(response, request)


# Global exception handler (adds CORS headers)
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    error_trace = traceback.format_exc()
    print(f"🔴 [GLOBAL] Unhandled exception: {exc}", flush=True)
    print(f"🔴 [GLOBAL] Path: {request.url.path}", flush=True)
    print(f"🔴 [GLOBAL] Traceback:\n{error_trace}", flush=True)
    response = JSONResponse(
        status_code=500,
        content={
            "detail": f"Internal server error: {str(exc)}",
            "type": type(exc).__name__
        }
    )
    return add_cors_headers(response, request)

# Authentication middleware (protects all routes except public ones)
# Added first, so it executes AFTER CORS (middleware executes in reverse order)
app.add_middleware(AuthMiddleware)

# CORS (must be added LAST so it executes FIRST and can add headers to all responses)
# Allow all localhost origins for development (including port 3000)
# Using both allow_origins (explicit) and allow_origin_regex (flexible) for maximum compatibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # Explicit list from settings
    allow_origin_regex=r"http://localhost:\d+|http://127\.0\.0\.1:\d+",  # Regex for any localhost port
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Routers
app.include_router(health.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(watchlist.router, prefix="/api")
app.include_router(stock.router, prefix="/api")
app.include_router(news.router, prefix="/api")
app.include_router(insights.router, prefix="/api")
app.include_router(company.router, prefix="/api")
app.include_router(chatbot.router, prefix="/api")
app.include_router(rag.router, prefix="/api")


@app.get("/")
def root():
    return {"message": "FinanceCopilot API is running"}


@app.get("/api")
def api_root():
    """API root endpoint - lists available endpoints"""
    return {
        "message": "FinanceCopilot API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/api/health",
            "auth": {
                "register": "/api/auth/register",
                "login": "/api/auth/login",
                "verify_email": "/api/auth/verify-email",
                "logout": "/api/auth/logout",
                "me": "/api/auth/me"
            },
            "watchlist": "/api/watchlist",
            "stock": "/api/stock",
            "news": "/api/news",
            "insights": "/api/insights",
            "company": "/api/company",
            "chatbot": "/api/chatbot",
            "rag": "/api/rag"
        },
        "docs": "/docs",
        "redoc": "/redoc"
    }


