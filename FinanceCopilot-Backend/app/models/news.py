from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class NewsItem(BaseModel):
    id: Optional[int] = None
    title: str
    source: str
    url: str
    summary: Optional[str] = None
    image: Optional[str] = None
    published_at: int
    related_symbols: Optional[list[str]] = None

