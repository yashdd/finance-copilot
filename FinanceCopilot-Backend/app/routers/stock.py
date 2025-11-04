from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from ..models.stock import StockQuote, StockCandle, StockMetrics
from ..services.finnhub_service import FinnhubService

router = APIRouter(prefix="/stock", tags=["stock"])

finnhub_service = FinnhubService()


@router.get("/quote/{symbol}", response_model=StockQuote)
def get_quote(symbol: str):
    """Get real-time quote for a stock"""
    try:
        return finnhub_service.get_quote(symbol)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/candle/{symbol}", response_model=List[StockCandle])
def get_candles(
    symbol: str,
    resolution: str = Query(default="D", regex="^(1|5|15|30|60|D|W|M)$"),
    days: int = Query(default=30, ge=1, le=365)
):
    """Get historical candle data for a stock"""
    try:
        return finnhub_service.get_candles(symbol, resolution, days)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/metrics/{symbol}", response_model=StockMetrics)
def get_metrics(symbol: str):
    """Get fundamental metrics for a stock"""
    try:
        return finnhub_service.get_metrics(symbol)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

