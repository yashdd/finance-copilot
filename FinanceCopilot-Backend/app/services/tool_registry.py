"""Tool registry for LangChain tool calling"""
from typing import Optional, List, Dict
from langchain_core.tools import tool
from .finnhub_service import FinnhubService
from .watchlist_service import WatchlistService

finnhub_service = FinnhubService()
watchlist_service = WatchlistService()


@tool
def search_stock_symbols(query: str) -> str:
    """Search for stock symbols by company name or description.
    
    Args:
        query: Company name or description to search for (e.g., 'Apple', 'tech stocks')
    
    Returns:
        JSON string with list of matching stocks with symbol, description, and type
    """
    try:
        results = finnhub_service.search_symbols(query, limit=10)
        if not results:
            return f"No stocks found matching '{query}'"
        
        formatted_results = []
        for item in results:
            formatted_results.append({
                "symbol": item.get("symbol", ""),
                "description": item.get("description", ""),
                "type": item.get("type", "")
            })
        
        import json
        return json.dumps(formatted_results, indent=2)
    except Exception as e:
        return f"Error searching stocks: {str(e)}"


@tool
def get_stock_quote(symbol: str) -> str:
    """Get current stock price, change, and volume for a stock symbol.
    
    Args:
        symbol: Stock symbol (e.g., 'AAPL', 'MSFT')
    
    Returns:
        JSON string with current price, change percent, volume, and other quote data
    """
    try:
        quote = finnhub_service.get_quote(symbol.upper())
        import json
        return json.dumps({
            "symbol": symbol.upper(),
            "current_price": quote.current_price,
            "change": quote.change,
            "change_percent": quote.change_percent,
            "high": quote.high,
            "low": quote.low,
            "open": quote.open,
            "previous_close": quote.previous_close,
            "volume": quote.volume,
            "timestamp": quote.timestamp
        }, indent=2)
    except Exception as e:
        return f"Error fetching quote for {symbol}: {str(e)}"


@tool
def get_stock_metrics(symbol: str) -> str:
    """Get fundamental metrics for a stock (P/E ratio, market cap, EPS, etc.).
    
    Args:
        symbol: Stock symbol (e.g., 'AAPL', 'MSFT')
    
    Returns:
        JSON string with fundamental metrics including P/E ratio, market cap, EPS, etc.
    """
    try:
        metrics = finnhub_service.get_metrics(symbol.upper())
        import json
        return json.dumps({
            "symbol": symbol.upper(),
            "pe_ratio": metrics.pe_ratio,
            "eps": metrics.eps,
            "market_cap": metrics.market_cap,
            "dividend_yield": metrics.dividend_yield,
            "profit_margin": metrics.profit_margin,
            "revenue_growth": metrics.revenue_growth,
            "price_to_book": metrics.price_to_book,
            "debt_to_equity": metrics.debt_to_equity
        }, indent=2, default=str)
    except Exception as e:
        return f"Error fetching metrics for {symbol}: {str(e)}"


@tool
def get_stock_news(symbol: str, days: int = 7) -> str:
    """Get recent news articles for a stock.
    
    Args:
        symbol: Stock symbol (e.g., 'AAPL', 'MSFT')
        days: Number of days to look back (default: 7)
    
    Returns:
        JSON string with list of news articles including title, source, url, and summary
    """
    try:
        news_items = finnhub_service.get_company_news(symbol.upper(), days=days)
        import json
        news_list = []
        for item in news_items[:10]:  # Limit to 10 most recent
            news_list.append({
                "title": item.title,
                "source": item.source,
                "url": item.url,
                "summary": item.summary,
                "published_at": item.published_at
            })
        return json.dumps(news_list, indent=2, default=str)
    except Exception as e:
        return f"Error fetching news for {symbol}: {str(e)}"


@tool
def get_watchlist() -> str:
    """Get the user's current watchlist with updated prices.
    
    Returns:
        JSON string with list of stocks in watchlist including symbol, name, current price, and change percent
    """
    try:
        watchlist_items = watchlist_service.get_all()
        import json
        watchlist_list = []
        for item in watchlist_items:
            watchlist_list.append({
                "symbol": item.symbol,
                "name": item.name,
                "current_price": item.current_price,
                "change_percent": item.change_percent,
                "added_at": item.added_at
            })
        return json.dumps(watchlist_list, indent=2, default=str)
    except Exception as e:
        return f"Error fetching watchlist: {str(e)}"


@tool
def get_stock_candles(symbol: str, days: int = 30, resolution: str = "D") -> str:
    """Get historical price data (candles) for a stock.
    
    Args:
        symbol: Stock symbol (e.g., 'AAPL', 'MSFT')
        days: Number of days of historical data (default: 30)
        resolution: Time resolution - '1', '5', '15', '30', '60', 'D', 'W', 'M' (default: 'D' for daily)
    
    Returns:
        JSON string with historical price data including timestamps, open, high, low, close, volume
    """
    try:
        candles = finnhub_service.get_candles(symbol.upper(), resolution=resolution, days=days)
        import json
        candle_list = []
        for candle in candles[-30:]:  # Last 30 candles
            candle_list.append({
                "timestamp": candle.timestamp,
                "open": candle.open,
                "high": candle.high,
                "low": candle.low,
                "close": candle.close,
                "volume": candle.volume
            })
        return json.dumps(candle_list, indent=2, default=str)
    except Exception as e:
        return f"Error fetching candles for {symbol}: {str(e)}"


# List of all available tools
ALL_TOOLS = [
    search_stock_symbols,
    get_stock_quote,
    get_stock_metrics,
    get_stock_news,
    get_watchlist,
    get_stock_candles,
]


