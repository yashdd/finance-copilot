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
        
        # Get fresh API key from settings (in case .env was updated)
        api_key = settings.finnhub_api_key.strip()
        
        if not api_key:
            raise ValueError("Finnhub API key is not configured. Please set FINNHUB_API_KEY in your .env file.")
        
        params["token"] = api_key
        response = requests.get(f"{self.BASE_URL}{endpoint}", params=params)
        
        # Better error handling
        if response.status_code == 401:
            # Check if API key looks suspicious (too short, placeholder, etc.)
            key_preview = api_key[:10] + "..." if len(api_key) > 10 else api_key
            raise ValueError(f"Invalid Finnhub API key. Please check your FINNHUB_API_KEY in .env file. (Key preview: {key_preview})")
        elif response.status_code == 429:
            raise ValueError("Finnhub API rate limit exceeded. Please try again later.")
        elif response.status_code == 400:
            try:
                error_data = response.json()
                error_msg = error_data.get("error", f"Bad request: {response.text}")
            except:
                error_msg = f"Bad request: {response.text}"
            raise ValueError(f"Finnhub API error: {error_msg}")
        elif response.status_code != 200:
            try:
                error_data = response.json()
                error_msg = error_data.get("error", f"HTTP {response.status_code}: {response.text}")
            except:
                error_msg = f"HTTP {response.status_code}: {response.text}"
            raise ValueError(f"Finnhub API error: {error_msg}")
        
        response.raise_for_status()
        return response.json()
    
    def get_quote(self, symbol: str) -> StockQuote:
        """Get real-time quote for a symbol"""
        data = self._get("/quote", {"symbol": symbol.upper()})
        
        # Handle cases where Finnhub returns null or missing values
        # Finnhub quote API returns: c (current price), d (change), dp (change %), h (high), l (low), o (open), pc (previous close), t (timestamp), v (volume)
        if not data or data.get("c") is None:
            raise ValueError(f"No quote data available for symbol {symbol.upper()}. The symbol may be invalid or market may be closed.")
        
        return StockQuote(
            symbol=symbol.upper(),
            current_price=float(data.get("c", 0)),
            change=float(data.get("d", 0)),
            change_percent=float(data.get("dp", 0)),
            high=float(data.get("h", 0)),
            low=float(data.get("l", 0)),
            open=float(data.get("o", 0)),
            previous_close=float(data.get("pc", 0)),
            volume=int(data.get("v", 0)),
            timestamp=int(data.get("t", 0))
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
        
        # Check if API returned an error status
        status = data.get("s", "")
        if status != "ok":
            error_msg = data.get("errmsg", "Unknown error")
            raise ValueError(f"Finnhub API returned error status '{status}': {error_msg}")
        
        # Check if we have data
        timestamps = data.get("t", [])
        if not timestamps or len(timestamps) == 0:
            raise ValueError(f"No candle data available for {symbol.upper()} for the specified time period. Try adjusting the days parameter or resolution.")
        
        candles = []
        opens = data.get("o", [])
        highs = data.get("h", [])
        lows = data.get("l", [])
        closes = data.get("c", [])
        volumes = data.get("v", [])
        
        for i in range(len(timestamps)):
            candles.append(StockCandle(
                symbol=symbol.upper(),
                timestamp=int(timestamps[i]),
                open=float(opens[i]) if i < len(opens) else 0.0,
                high=float(highs[i]) if i < len(highs) else 0.0,
                low=float(lows[i]) if i < len(lows) else 0.0,
                close=float(closes[i]) if i < len(closes) else 0.0,
                volume=int(volumes[i]) if i < len(volumes) else 0
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
        try:
            data = self._get("/news", {"category": category})
            
            # Check if data is a list
            if not isinstance(data, list):
                raise ValueError(f"Unexpected response format from Finnhub API. Expected list, got {type(data)}")
            
            # Check if data is empty
            if not data or len(data) == 0:
                return []  # Return empty list instead of raising error
            
            news_items = []
            for item in data[:20]:  # Limit to 20 items
                # Validate required fields
                if not item.get("headline"):
                    continue  # Skip items without headline
                
                # Handle related_symbols - ensure it's always a list or None
                related = item.get("related", [])
                if related == "" or related is None:
                    related_symbols = None
                elif isinstance(related, list):
                    related_symbols = related if related else None
                else:
                    # If it's not a list, try to convert or set to None
                    related_symbols = None
                    
                news_items.append(NewsItem(
                    title=item.get("headline", ""),
                    source=item.get("source", ""),
                    url=item.get("url", ""),
                    summary=item.get("summary", ""),
                    image=item.get("image", ""),
                    published_at=item.get("datetime", 0),
                    related_symbols=related_symbols
                ))
            return news_items
        except Exception as e:
            # Log the error for debugging
            print(f"Error fetching general news from Finnhub: {e}")
            raise
    
    def search_symbols(self, query: str, limit: int = 10) -> List[dict]:
        """Search for stock symbols"""
        data = self._get("/search", {"q": query})
        
        results = []
        count = data.get("count", 0)
        if count > 0:
            for item in data.get("result", [])[:limit]:
                results.append({
                    "symbol": item.get("symbol", ""),
                    "description": item.get("description", ""),
                    "type": item.get("type", ""),
                    "displaySymbol": item.get("displaySymbol", "")
                })
        return results

