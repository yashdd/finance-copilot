from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from ..models.news import NewsItem
from ..services.finnhub_service import FinnhubService

router = APIRouter(prefix="/news", tags=["news"])

finnhub_service = FinnhubService()


@router.get("/company/{symbol}", response_model=List[NewsItem])
def get_company_news(
    symbol: str,
    days: int = Query(default=7, ge=1, le=30)
):
    """Get company-specific news"""
    try:
        return finnhub_service.get_company_news(symbol, days)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/general", response_model=List[NewsItem])
def get_general_news(
    category: str = Query(default="general", regex="^(general|finance|forex|crypto|merger)$")
):
    """Get general financial news"""
    try:
        news_items = finnhub_service.get_general_news(category)
        return news_items
    except ValueError as e:
        # ValueError usually means API key or API error
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Log unexpected errors
        import traceback
        print(f"Unexpected error in get_general_news: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

