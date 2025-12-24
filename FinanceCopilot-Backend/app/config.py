from pydantic import BaseModel
import os
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseModel):
    app_name: str = "FinanceCopilot API"
    # Allow common frontend ports (Next.js default is 3000, but can be different)
    frontend_origin: str = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")
    
    # External API Keys (strip whitespace to avoid issues)
    finnhub_api_key: str = os.getenv("FINNHUB_API_KEY", "").strip()
    alpha_vantage_api_key: str = os.getenv("ALPHAVANTAGE_API_KEY", "").strip()
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "").strip()
    
    # Database configuration - MongoDB
    mongodb_url: str = os.getenv(
        "MONGODB_URL",
        f"mongodb://{os.getenv('MONGO_USER', '')}:{os.getenv('MONGO_PASSWORD', '')}@{os.getenv('MONGO_HOST', 'localhost')}:{os.getenv('MONGO_PORT', '27017')}/{os.getenv('MONGO_DB', 'financecopilot')}"
    ).replace("mongodb://:@", "mongodb://")  # Clean up if no user/pass
    
    # ChromaDB configuration
    chroma_persist_dir: str = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")
    
    # Security
    secret_key: str = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
    
    @property
    def allowed_origins(self) -> list[str]:
        """Get list of allowed CORS origins"""
        origins = [self.frontend_origin]
        # Add common Next.js dev ports
        origins.extend([
            "http://localhost:3000",
            "http://localhost:3001",
            "http://localhost:3002",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:3001",
            "http://127.0.0.1:3002",
        ])
        # Remove duplicates while preserving order
        seen = set()
        unique_origins = []
        for origin in origins:
            if origin not in seen:
                seen.add(origin)
                unique_origins.append(origin)
        return unique_origins


settings = Settings()

