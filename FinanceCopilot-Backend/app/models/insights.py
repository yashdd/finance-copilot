from pydantic import BaseModel
from typing import Optional


class Insight(BaseModel):
    symbol: str
    summary: str
    generated_at: str
    key_points: Optional[list[str]] = None

