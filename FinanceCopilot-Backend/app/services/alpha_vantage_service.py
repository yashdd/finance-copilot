"""Alpha Vantage API service as alternative to Finnhub"""
import requests
from typing import Optional, List
from datetime import datetime, timedelta
from ..config import settings
from ..models.stock import StockQuote, StockCandle, StockMetrics
from ..models.news import NewsItem


class AlphaVantageService:
    BASE_URL = "https://www.alphavantage.co/query"
    
    def __init__(self):
        self.api_key = settings.alpha_vantage_api_key
    
    def _get(self, params: dict) -> dict:
        """Make GET request to Alpha Vantage API"""
        if not self.api_key:
            raise ValueError("Alpha Vantage API key is not configured. Please set ALPHAVANTAGE_API_KEY in your .env file.")
        
        params["apikey"] = self.api_key
        response = requests.get(self.BASE_URL, params=params, timeout=10)
        
        if response.status_code != 200:
            raise ValueError(f"Alpha Vantage API error: HTTP {response.status_code}")
        
        data = response.json()
        
        # Check for API errors
        if "Error Message" in data:
            raise ValueError(f"Alpha Vantage API error: {data['Error Message']}")
        if "Note" in data:
            raise ValueError(f"Alpha Vantage API rate limit: {data['Note']}")
        
        return data
    
    def get_quote(self, symbol: str) -> StockQuote:
        """Get real-time quote for a symbol (using GLOBAL_QUOTE endpoint)"""
        data = self._get({
            "function": "GLOBAL_QUOTE",
            "symbol": symbol.upper()
        })
        
        quote_data = data.get("Global Quote", {})
        if not quote_data:
            raise ValueError(f"No quote data available for symbol {symbol.upper()}")
        
        # Alpha Vantage returns: "01. symbol", "02. open", "05. price", etc.
        current_price = float(quote_data.get("05. price", 0))
        change = float(quote_data.get("09. change", 0))
        change_percent = float(quote_data.get("10. change percent", "0%").replace("%", ""))
        high = float(quote_data.get("03. high", current_price))
        low = float(quote_data.get("04. low", current_price))
        open_price = float(quote_data.get("02. open", current_price))
        previous_close = float(quote_data.get("08. previous close", current_price))
        volume = int(quote_data.get("06. volume", 0))
        
        # Get timestamp (use current time if not available)
        timestamp = int(datetime.now().timestamp())
        
        return StockQuote(
            symbol=symbol.upper(),
            current_price=current_price,
            change=change,
            change_percent=change_percent,
            high=high,
            low=low,
            open=open_price,
            previous_close=previous_close,
            volume=volume,
            timestamp=timestamp
        )
    
    def get_candles(self, symbol: str, resolution: str = "D", days: int = 30) -> List[StockCandle]:
        """Get historical candle data"""
        # Map resolution to Alpha Vantage function
        function_map = {
            "1": "TIME_SERIES_INTRADAY",
            "5": "TIME_SERIES_INTRADAY",
            "15": "TIME_SERIES_INTRADAY",
            "30": "TIME_SERIES_INTRADAY",
            "60": "TIME_SERIES_INTRADAY",
            "D": "TIME_SERIES_DAILY",
            "W": "TIME_SERIES_WEEKLY",
            "M": "TIME_SERIES_MONTHLY"
        }
        
        function = function_map.get(resolution, "TIME_SERIES_DAILY")
        
        params = {
            "function": function,
            "symbol": symbol.upper(),
            "outputsize": "full" if days > 100 else "compact"
        }
        
        # For intraday, need interval parameter
        if resolution in ["1", "5", "15", "30", "60"]:
            interval_map = {
                "1": "1min",
                "5": "5min",
                "15": "15min",
                "30": "30min",
                "60": "60min"
            }
            params["interval"] = interval_map.get(resolution, "5min")
        
        data = self._get(params)
        
        # Extract time series key (varies by function)
        time_series_key = None
        for key in data.keys():
            if "Time Series" in key:
                time_series_key = key
                break
        
        if not time_series_key:
            raise ValueError(f"No time series data available for {symbol.upper()}")
        
        time_series = data[time_series_key]
        
        # Convert to candles
        candles = []
        cutoff_date = datetime.now() - timedelta(days=days)
        
        for date_str, values in time_series.items():
            try:
                # Parse date (format: "2024-01-15" or "2024-01-15 16:00:00")
                if " " in date_str:
                    date_obj = datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S")
                else:
                    date_obj = datetime.strptime(date_str, "%Y-%m-%d")
                
                # Filter by date range
                if date_obj < cutoff_date:
                    continue
                
                timestamp = int(date_obj.timestamp())
                
                candles.append(StockCandle(
                    symbol=symbol.upper(),
                    timestamp=timestamp,
                    open=float(values.get("1. open", 0)),
                    high=float(values.get("2. high", 0)),
                    low=float(values.get("3. low", 0)),
                    close=float(values.get("4. close", 0)),
                    volume=int(values.get("5. volume", 0))
                ))
            except Exception as e:
                print(f"Error parsing candle data for {date_str}: {e}")
                continue
        
        # Sort by timestamp (oldest first)
        candles.sort(key=lambda x: x.timestamp)
        
        if not candles:
            raise ValueError(f"No candle data available for {symbol.upper()} for the specified time period.")
        
        return candles
    
    def get_metrics(self, symbol: str) -> StockMetrics:
        """Get fundamental metrics (using OVERVIEW endpoint)"""
        data = self._get({
            "function": "OVERVIEW",
            "symbol": symbol.upper()
        })
        
        if not data or "Symbol" not in data:
            raise ValueError(f"No metrics data available for {symbol.upper()}")
        
        # Parse metrics (Alpha Vantage returns strings, need to convert)
        def safe_float(value):
            try:
                if value and value != "None" and value != "-":
                    return float(value)
            except:
                pass
            return None
        
        def safe_int(value):
            try:
                if value and value != "None" and value != "-":
                    return int(float(value))
            except:
                pass
            return None
        
        return StockMetrics(
            symbol=symbol.upper(),
            pe_ratio=safe_float(data.get("PERatio")),
            eps=safe_float(data.get("EPS")),
            market_cap=safe_int(data.get("MarketCapitalization")),
            dividend_yield=safe_float(data.get("DividendYield")),
            profit_margin=safe_float(data.get("ProfitMargin")),
            revenue_growth=None,  # Not directly available in OVERVIEW
            price_to_book=safe_float(data.get("PriceToBookRatio")),
            debt_to_equity=None  # Not directly available in OVERVIEW
        )
    
    def search_symbols(self, query: str, limit: int = 10) -> List[dict]:
        """Search for stock symbols (using SYMBOL_SEARCH endpoint)"""
        data = self._get({
            "function": "SYMBOL_SEARCH",
            "keywords": query
        })
        
        results = []
        matches = data.get("bestMatches", [])
        
        for item in matches[:limit]:
            results.append({
                "symbol": item.get("1. symbol", ""),
                "description": item.get("2. name", ""),
                "type": item.get("3. type", ""),
                "displaySymbol": item.get("1. symbol", "")
            })
        
        return results

