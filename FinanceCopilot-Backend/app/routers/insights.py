from fastapi import APIRouter, HTTPException
from ..models.insights import Insight
from ..services.finnhub_service import FinnhubService
from ..services.ai_service import AIService
from datetime import datetime

router = APIRouter(prefix="/insights", tags=["insights"])

finnhub_service = FinnhubService()
ai_service = AIService()


@router.get("/{symbol}", response_model=Insight)
def get_insights(symbol: str):
    """Get AI-generated insights for a stock"""
    try:
        # Get quote data
        quote = finnhub_service.get_quote(symbol)
        quote_data = {
            "current_price": quote.current_price,
            "change_percent": quote.change_percent,
            "volume": quote.volume,
            "change": quote.change
        }
        
        # Get recent news summary
        news_items = finnhub_service.get_company_news(symbol, days=7)
        news_summary = " ".join([item.summary or item.title for item in news_items[:3]])
        
        # Generate AI insight
        summary = ai_service.generate_insight(symbol, quote_data, news_summary)
        
        return Insight(
            symbol=symbol.upper(),
            summary=summary,
            generated_at=datetime.now().isoformat(),
            key_points=[
                f"Price: ${quote.current_price:.2f}",
                f"Change: {quote.change_percent:.2f}%",
                f"Volume: {quote.volume:,}"
            ]
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

