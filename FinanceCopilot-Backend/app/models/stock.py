from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class StockQuote(BaseModel):
    symbol: str
    current_price: float
    change: float
    change_percent: float
    high: float
    low: float
    open: float
    previous_close: float
    volume: int
    timestamp: int


class StockCandle(BaseModel):
    symbol: str
    timestamp: int
    open: float
    high: float
    low: float
    close: float
    volume: int


class StockMetrics(BaseModel):
    symbol: str
    pe_ratio: Optional[float] = None
    eps: Optional[float] = None
    market_cap: Optional[float] = None
    dividend_yield: Optional[float] = None
    profit_margin: Optional[float] = None
    revenue_growth: Optional[float] = None
    price_to_book: Optional[float] = None
    debt_to_equity: Optional[float] = None


class WatchlistItem(BaseModel):
    symbol: str
    name: str
    added_at: str
    current_price: Optional[float] = None
    change_percent: Optional[float] = None

