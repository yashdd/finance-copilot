from pydantic import BaseModel
import os
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseModel):
    app_name: str = "FinanceCopilot API"
    frontend_origin: str = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")
    
    # External API Keys
    finnhub_api_key: str = os.getenv("FINNHUB_API_KEY", "")
    alpha_vantage_api_key: str = os.getenv("ALPHA_VANTAGE_API_KEY", "")
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")


settings = Settings()

