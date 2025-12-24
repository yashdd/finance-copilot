"""Unified stock service with fallback to multiple providers"""
from typing import Optional, List
from ..services.finnhub_service import FinnhubService
from ..services.alpha_vantage_service import AlphaVantageService
from ..models.stock import StockQuote, StockCandle, StockMetrics
from ..models.news import NewsItem
from ..config import settings


class StockService:
    """Unified stock service that tries Finnhub first, then falls back to Alpha Vantage"""
    
    def __init__(self):
        self.finnhub = FinnhubService() if settings.finnhub_api_key else None
        self.alpha_vantage = AlphaVantageService() if settings.alpha_vantage_api_key else None
        self.current_provider = "finnhub"  # Track which provider is being used

    def _metrics_completeness(self, metrics: StockMetrics) -> float:
        """Return ratio of available core metrics so we know when to fetch a fallback."""
        fields = [
            "pe_ratio",
            "eps",
            "market_cap",
            "dividend_yield",
            "profit_margin",
            "revenue_growth",
            "price_to_book",
            "debt_to_equity",
        ]
        present = sum(1 for field in fields if getattr(metrics, field, None) is not None)
        return present / len(fields)

    def _merge_metrics(self, primary: StockMetrics, secondary: StockMetrics) -> StockMetrics:
        """Fill missing fields in primary metrics using secondary provider values."""
        primary_dict = primary.dict()
        secondary_dict = secondary.dict()
        for key, value in secondary_dict.items():
            if primary_dict.get(key) is None and value is not None:
                primary_dict[key] = value
        # Prefer the primary symbol, but fall back to secondary if needed
        primary_dict["symbol"] = primary.symbol or secondary.symbol
        return StockMetrics(**primary_dict)
    
    def get_quote(self, symbol: str) -> StockQuote:
        """Get real-time quote with fallback"""
        # Try Finnhub first
        if self.finnhub:
            try:
                result = self.finnhub.get_quote(symbol)
                self.current_provider = "finnhub"
                return result
            except Exception as e:
                print(f"Finnhub quote failed for {symbol}: {e}")
        
        # Fallback to Alpha Vantage
        if self.alpha_vantage:
            try:
                result = self.alpha_vantage.get_quote(symbol)
                self.current_provider = "alpha_vantage"
                print(f"Using Alpha Vantage for quote: {symbol}")
                return result
            except Exception as e:
                print(f"Alpha Vantage quote failed for {symbol}: {e}")
        
        raise ValueError(f"Unable to fetch quote for {symbol}. No API providers available or all failed.")
    
    def get_candles(self, symbol: str, resolution: str = "D", days: int = 30) -> List[StockCandle]:
        """Get historical candle data with fallback"""
        # Try Finnhub first
        if self.finnhub:
            try:
                result = self.finnhub.get_candles(symbol, resolution, days)
                self.current_provider = "finnhub"
                return result
            except Exception as e:
                print(f"Finnhub candles failed for {symbol}: {e}")
        
        # Fallback to Alpha Vantage
        if self.alpha_vantage:
            try:
                result = self.alpha_vantage.get_candles(symbol, resolution, days)
                self.current_provider = "alpha_vantage"
                print(f"Using Alpha Vantage for candles: {symbol}")
                return result
            except Exception as e:
                print(f"Alpha Vantage candles failed for {symbol}: {e}")
        
        raise ValueError(f"Unable to fetch candles for {symbol}. No API providers available or all failed.")
    
    def get_metrics(self, symbol: str) -> StockMetrics:
        """Get fundamental metrics with fallback"""
        errors = []
        primary_metrics = None
        fallback_metrics = None

        # Try Finnhub first
        if self.finnhub:
            try:
                primary_metrics = self.finnhub.get_metrics(symbol)
                self.current_provider = "finnhub"
            except Exception as e:
                errors.append(f"finnhub: {e}")
                print(f"Finnhub metrics failed for {symbol}: {e}")
        
        # If Finnhub missing too many fields or unavailable, try Alpha Vantage and merge missing values
        needs_fallback = (
            primary_metrics is None or
            self._metrics_completeness(primary_metrics) < 0.5
        )
        if self.alpha_vantage and needs_fallback:
            try:
                fallback_metrics = self.alpha_vantage.get_metrics(symbol)
                print(f"Using Alpha Vantage to {'supply metrics' if primary_metrics else 'provide metrics'}: {symbol}")
                if primary_metrics:
                    merged = self._merge_metrics(primary_metrics, fallback_metrics)
                    self.current_provider = "finnhub+alpha_vantage"
                    return merged
                self.current_provider = "alpha_vantage"
                return fallback_metrics
            except Exception as e:
                errors.append(f"alpha_vantage: {e}")
                print(f"Alpha Vantage metrics failed for {symbol}: {e}")
        
        if primary_metrics:
            return primary_metrics
        
        error_detail = "; ".join(errors) if errors else "No providers configured"
        raise ValueError(f"Unable to fetch metrics for {symbol}. {error_detail}.")
    
    def search_symbols(self, query: str, limit: int = 10) -> List[dict]:
        """Search for stock symbols with fallback"""
        # Try Finnhub first
        if self.finnhub:
            try:
                result = self.finnhub.search_symbols(query, limit)
                self.current_provider = "finnhub"
                return result
            except Exception as e:
                print(f"Finnhub search failed: {e}")
        
        # Fallback to Alpha Vantage
        if self.alpha_vantage:
            try:
                result = self.alpha_vantage.search_symbols(query, limit)
                self.current_provider = "alpha_vantage"
                print(f"Using Alpha Vantage for search: {query}")
                return result
            except Exception as e:
                print(f"Alpha Vantage search failed: {e}")
        
        raise ValueError(f"Unable to search symbols. No API providers available or all failed.")
    
    def get_company_news(self, symbol: str, days: int = 7) -> List[NewsItem]:
        """Get company news (Finnhub only - Alpha Vantage doesn't have news)"""
        if self.finnhub:
            try:
                return self.finnhub.get_company_news(symbol, days)
            except Exception as e:
                print(f"Finnhub news failed for {symbol}: {e}")
                # Return empty list instead of raising error
                return []
        
        # Alpha Vantage doesn't have news API
        print("News not available: Finnhub API key not configured")
        return []
    
    def get_general_news(self, category: str = "general") -> List[NewsItem]:
        """Get general news (Finnhub only - Alpha Vantage doesn't have news)"""
        if self.finnhub:
            try:
                return self.finnhub.get_general_news(category)
            except Exception as e:
                print(f"Finnhub general news failed: {e}")
                return []
        
        # Alpha Vantage doesn't have news API
        print("News not available: Finnhub API key not configured")
        return []
    
    def get_news_by_company_name(self, company_name: str, days: int = 7) -> List[NewsItem]:
        """Get company news by name (Finnhub only)"""
        if self.finnhub:
            try:
                return self.finnhub.get_news_by_company_name(company_name, days)
            except Exception as e:
                print(f"Finnhub news by name failed: {e}")
                return []
        
        return []

