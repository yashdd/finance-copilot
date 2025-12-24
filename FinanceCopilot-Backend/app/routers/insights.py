from fastapi import APIRouter, HTTPException
from ..models.insights import Insight
from ..services.stock_service import StockService
from ..services.ai_service import AIService
from datetime import datetime

router = APIRouter(prefix="/insights", tags=["insights"])

stock_service = StockService()

ai_service = AIService()


@router.get("/{symbol}", response_model=Insight)
def get_insights(symbol: str):
    """Get comprehensive AI-generated insights for a stock using Gemini"""
    try:
        # Gather comprehensive data from multiple sources
        quote = stock_service.get_quote(symbol)
        quote_data = {
            "current_price": quote.current_price,
            "change": quote.change,
            "change_percent": quote.change_percent,
            "open": quote.open,
            "high": quote.high,
            "low": quote.low,
            "previous_close": quote.previous_close,
            "volume": quote.volume
        }
        
        # Get fundamental metrics
        metrics = None
        metrics_data = None
        try:
            metrics = stock_service.get_metrics(symbol)
            metrics_data = {
                "pe_ratio": metrics.pe_ratio,
                "eps": metrics.eps,
                "market_cap": metrics.market_cap,
                "dividend_yield": metrics.dividend_yield,
                "profit_margin": metrics.profit_margin,
                "revenue_growth": metrics.revenue_growth,
                "price_to_book": metrics.price_to_book,
                "debt_to_equity": metrics.debt_to_equity
            }
        except Exception:
            # Metrics might not be available for all stocks
            pass
        
        # Get recent news (last 7 days)
        news_items = []
        try:
            news_items_raw = stock_service.get_company_news(symbol, days=7)
            news_items = [
                {
                    "title": item.title,
                    "summary": item.summary or "",
                    "source": item.source,
                    "published_at": item.published_at
                }
                for item in news_items_raw[:5]  # Top 5 news items
            ]
        except Exception:
            # News might not be available
            pass
        
        # Determine price trend
        price_trend = ""
        if quote.change_percent > 2:
            price_trend = "Strong upward momentum"
        elif quote.change_percent > 0:
            price_trend = "Moderate upward trend"
        elif quote.change_percent > -2:
            price_trend = "Moderate downward trend"
        else:
            price_trend = "Significant downward pressure"
        
        # Generate comprehensive AI insight using Gemini
        insight_result = ai_service.generate_insight(
            symbol=symbol.upper(),
            quote_data=quote_data,
            metrics_data=metrics_data,
            news_items=news_items,
            price_trend=price_trend
        )
        
        return Insight(
            symbol=symbol.upper(),
            summary=insight_result.get("summary", ""),
            generated_at=datetime.now().isoformat(),
            key_points=insight_result.get("key_points", [])
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

