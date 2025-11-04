import requests
from typing import Optional, List
from datetime import datetime, timedelta
from ..config import settings
from ..models.stock import StockQuote, StockCandle, StockMetrics
from ..models.news import NewsItem


class FinnhubService:
    BASE_URL = "https://finnhub.io/api/v1"
    
    def __init__(self):
        self.api_key = settings.finnhub_api_key
    
    def _get(self, endpoint: str, params: dict = None) -> dict:
        """Make GET request to Finnhub API"""
        if params is None:
            params = {}
        params["token"] = self.api_key
        response = requests.get(f"{self.BASE_URL}{endpoint}", params=params)
        response.raise_for_status()
        return response.json()
    
    def get_quote(self, symbol: str) -> StockQuote:
        """Get real-time quote for a symbol"""
        data = self._get("/quote", {"symbol": symbol.upper()})
        return StockQuote(
            symbol=symbol.upper(),
            current_price=data.get("c", 0),
            change=data.get("d", 0),
            change_percent=data.get("dp", 0),
            high=data.get("h", 0),
            low=data.get("l", 0),
            open=data.get("o", 0),
            previous_close=data.get("pc", 0),
            volume=data.get("v", 0),
            timestamp=data.get("t", 0)
        )
    
    def get_candles(self, symbol: str, resolution: str = "D", days: int = 30) -> List[StockCandle]:
        """Get historical candle data"""
        to_timestamp = int(datetime.now().timestamp())
        from_timestamp = int((datetime.now() - timedelta(days=days)).timestamp())
        
        data = self._get("/stock/candle", {
            "symbol": symbol.upper(),
            "resolution": resolution,
            "from": from_timestamp,
            "to": to_timestamp
        })
        
        if data.get("s") != "ok":
            return []
        
        candles = []
        for i in range(len(data.get("t", []))):
            candles.append(StockCandle(
                symbol=symbol.upper(),
                timestamp=data["t"][i],
                open=data["o"][i],
                high=data["h"][i],
                low=data["l"][i],
                close=data["c"][i],
                volume=data["v"][i]
            ))
        return candles
    
    def get_metrics(self, symbol: str) -> StockMetrics:
        """Get fundamental metrics"""
        data = self._get("/stock/metric", {"symbol": symbol.upper(), "metric": "all"})
        metric_data = data.get("metric", {})
        
        return StockMetrics(
            symbol=symbol.upper(),
            pe_ratio=metric_data.get("peRatio"),
            eps=metric_data.get("eps"),
            market_cap=metric_data.get("marketCapitalization"),
            dividend_yield=metric_data.get("dividendYield"),
            profit_margin=metric_data.get("profitMargin"),
            revenue_growth=metric_data.get("revenueGrowth"),
            price_to_book=metric_data.get("priceToBookRatio"),
            debt_to_equity=metric_data.get("debtToEquityRatio")
        )
    
    def get_company_news(self, symbol: str, days: int = 7) -> List[NewsItem]:
        """Get company-specific news"""
        to_date = datetime.now().strftime("%Y-%m-%d")
        from_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
        
        data = self._get("/company-news", {
            "symbol": symbol.upper(),
            "from": from_date,
            "to": to_date
        })
        
        news_items = []
        for item in data[:10]:  # Limit to 10 items
            news_items.append(NewsItem(
                title=item.get("headline", ""),
                source=item.get("source", ""),
                url=item.get("url", ""),
                summary=item.get("summary", ""),
                image=item.get("image", ""),
                published_at=item.get("datetime", 0),
                related_symbols=[symbol.upper()]
            ))
        return news_items
    
    def get_general_news(self, category: str = "general") -> List[NewsItem]:
        """Get general financial news"""
        data = self._get("/news", {"category": category})
        
        news_items = []
        for item in data[:20]:  # Limit to 20 items
            news_items.append(NewsItem(
                title=item.get("headline", ""),
                source=item.get("source", ""),
                url=item.get("url", ""),
                summary=item.get("summary", ""),
                image=item.get("image", ""),
                published_at=item.get("datetime", 0),
                related_symbols=item.get("related", [])
            ))
        return news_items

