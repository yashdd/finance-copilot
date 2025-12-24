from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from ..models.news import NewsItem
from ..services.stock_service import StockService

router = APIRouter(prefix="/news", tags=["news"])

stock_service = StockService()


@router.get("/company/{symbol}", response_model=List[NewsItem])
def get_company_news(
    symbol: str,
    days: int = Query(default=7, ge=1, le=30)
):
    """Get company-specific news by symbol"""
    try:
        return stock_service.get_company_news(symbol, days)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/company-name/{company_name}", response_model=List[NewsItem])
def get_news_by_company_name(
    company_name: str,
    days: int = Query(default=7, ge=1, le=30)
):
    """Get company news by company name (searches for symbol first, then fetches news)"""
    try:
        news_items = stock_service.get_news_by_company_name(company_name, days)
        return news_items
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/general", response_model=List[NewsItem])
def get_general_news(
    category: str = Query(default="general", regex="^(general|finance|forex|crypto|merger)$")
):
    """Get general financial news"""
    try:
        news_items = stock_service.get_general_news(category)
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

