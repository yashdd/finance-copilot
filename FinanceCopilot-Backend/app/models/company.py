from pydantic import BaseModel
from typing import Optional


class CompanyAnalysis(BaseModel):
    symbol: str
    name: Optional[str] = None
    sector: Optional[str] = None
    industry: Optional[str] = None
    metrics: dict
    health_score: Optional[float] = None
    ai_summary: Optional[str] = None

