"""Tool registry for LangChain tool calling"""
from typing import Optional, List, Dict
from langchain_core.tools import tool, StructuredTool
from pydantic import BaseModel, Field
from .stock_service import StockService
from .watchlist_service import WatchlistService

stock_service = StockService()


def _search_stock_symbols(query: str) -> str:
    """Search for stock symbols by company name or description.
    
    Args:
        query: Company name or description to search for (e.g., 'Apple', 'tech stocks')
    
    Returns:
        JSON string with list of matching stocks with symbol, description, and type
    """
    try:
        results = stock_service.search_symbols(query, limit=10)
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


def _get_stock_quote(symbol: str) -> str:
    """Get current stock price, change, and volume for a stock symbol.
    
    Args:
        symbol: Stock symbol (e.g., 'AAPL', 'MSFT')
    
    Returns:
        JSON string with current price, change percent, volume, and other quote data
    """
    try:
        quote = stock_service.get_quote(symbol.upper())
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


def _get_stock_metrics(symbol: str) -> str:
    """Get fundamental metrics for a stock (P/E ratio, market cap, EPS, etc.).
    
    Args:
        symbol: Stock symbol (e.g., 'AAPL', 'MSFT')
    
    Returns:
        JSON string with fundamental metrics including P/E ratio, market cap, EPS, etc.
    """
    try:
        metrics = stock_service.get_metrics(symbol.upper())
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


def _get_stock_news(symbol: str, days: int = 7) -> str:
    """Get recent news articles for a stock.
    
    Args:
        symbol: Stock symbol (e.g., 'AAPL', 'MSFT')
        days: Number of days to look back (default: 7)
    
    Returns:
        JSON string with list of news articles including title, source, url, and summary
    """
    try:
        news_items = stock_service.get_company_news(symbol.upper(), days=days)
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


def _get_stock_candles(symbol: str, days: int = 30, resolution: str = "D") -> str:
    """Get historical price data (candles) for a stock.
    
    Args:
        symbol: Stock symbol (e.g., 'AAPL', 'MSFT')
        days: Number of days of historical data (default: 30)
        resolution: Time resolution - '1', '5', '15', '30', '60', 'D', 'W', 'M' (default: 'D' for daily)
    
    Returns:
        JSON string with historical price data including timestamps, open, high, low, close, volume
    """
    try:
        candles = stock_service.get_candles(symbol.upper(), resolution=resolution, days=days)
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


# Create StructuredTool instances with explicit names
search_stock_symbols = StructuredTool.from_function(
    func=_search_stock_symbols,
    name="search_stock_symbols",
    description="Search for stock symbols by company name or description. Args: query (str): Company name to search"
)

get_stock_quote = StructuredTool.from_function(
    func=_get_stock_quote,
    name="get_stock_quote",
    description="Get current stock price, change, and volume. Args: symbol (str): Stock symbol like AAPL"
)

get_stock_metrics = StructuredTool.from_function(
    func=_get_stock_metrics,
    name="get_stock_metrics",
    description="Get fundamental metrics (P/E, EPS, market cap, etc.). Args: symbol (str): Stock symbol"
)

get_stock_news = StructuredTool.from_function(
    func=_get_stock_news,
    name="get_stock_news",
    description="Get recent news articles for a stock. Args: symbol (str): Stock symbol, days (int): Days to look back (default 7)"
)

get_stock_candles = StructuredTool.from_function(
    func=_get_stock_candles,
    name="get_stock_candles",
    description="Get historical price data. Args: symbol (str): Stock symbol, days (int): Days of data (default 30), resolution (str): Time resolution (default 'D')"
)


def create_user_tools(user_id: str, watchlist_service: WatchlistService):
    """Create user-specific tools with explicit names for Gemini tool-calling"""
    import json

    # Define raw functions (closures capture user_id and watchlist_service)
    def _get_watchlist() -> str:
        try:
            watchlist_items = watchlist_service.get_all(user_id)
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

    def _add_to_watchlist(symbol: str, name: str = "") -> str:
        try:
            if not name:
                search_results = stock_service.search_symbols(symbol, limit=1)
                if search_results:
                    name = search_results[0].get("description", symbol.upper())
                else:
                    name = symbol.upper()
            item = watchlist_service.add_to_watchlist(user_id, symbol.upper(), name)
            return json.dumps({
                "success": True,
                "message": f"Added {symbol.upper()} ({name}) to watchlist",
                "symbol": item.symbol,
                "name": item.name
            }, indent=2)
        except ValueError as e:
            return json.dumps({
                "success": False,
                "error": str(e)
            }, indent=2)
        except Exception as e:
            return json.dumps({
                "success": False,
                "error": f"Error adding to watchlist: {str(e)}"
            }, indent=2)

    def _remove_from_watchlist(symbol: str) -> str:
        try:
            success = watchlist_service.remove_from_watchlist(user_id, symbol.upper())
            if success:
                return json.dumps({
                    "success": True,
                    "message": f"Removed {symbol.upper()} from watchlist"
                }, indent=2)
            else:
                return json.dumps({
                    "success": False,
                    "error": f"{symbol.upper()} not found in watchlist"
                }, indent=2)
        except Exception as e:
            return json.dumps({
                "success": False,
                "error": f"Error removing from watchlist: {str(e)}"
            }, indent=2)

    def _compare_stocks(symbol1: str, symbol2: str) -> str:
        try:
            quote1 = stock_service.get_quote(symbol1.upper())
            quote2 = stock_service.get_quote(symbol2.upper())
            metrics1 = stock_service.get_metrics(symbol1.upper())
            metrics2 = stock_service.get_metrics(symbol2.upper())
            comparison = {
                symbol1.upper(): {
                    "price": quote1.current_price,
                    "change_percent": quote1.change_percent,
                    "volume": quote1.volume,
                    "pe_ratio": metrics1.pe_ratio,
                    "market_cap": metrics1.market_cap,
                    "revenue_growth": metrics1.revenue_growth
                },
                symbol2.upper(): {
                    "price": quote2.current_price,
                    "change_percent": quote2.change_percent,
                    "volume": quote2.volume,
                    "pe_ratio": metrics2.pe_ratio,
                    "market_cap": metrics2.market_cap,
                    "revenue_growth": metrics2.revenue_growth
                },
                "differences": {
                    "price_diff": quote1.current_price - quote2.current_price,
                    "change_diff": quote1.change_percent - quote2.change_percent,
                    "pe_diff": (metrics1.pe_ratio or 0) - (metrics2.pe_ratio or 0)
                }
            }
            return json.dumps(comparison, indent=2, default=str)
        except Exception as e:
            return json.dumps({
                "error": f"Error comparing stocks: {str(e)}"
            }, indent=2)

    # Return StructuredTool instances with explicit names
    return [
        StructuredTool.from_function(func=_get_watchlist, name="get_watchlist", description="Get the user's current watchlist with updated prices"),
        StructuredTool.from_function(func=_add_to_watchlist, name="add_to_watchlist", description="Add a stock to watchlist. Args: symbol (str), name (str, optional)"),
        StructuredTool.from_function(func=_remove_from_watchlist, name="remove_from_watchlist", description="Remove a stock from watchlist. Args: symbol (str)"),
        StructuredTool.from_function(func=_compare_stocks, name="compare_stocks", description="Compare two stocks side by side. Args: symbol1 (str), symbol2 (str)")
    ]


# Base tools (no user context needed)
BASE_TOOLS = [
    search_stock_symbols,
    get_stock_quote,
    get_stock_metrics,
    get_stock_news,
    get_stock_candles,
]

# Legacy: ALL_TOOLS for backward compatibility (without user-specific tools)
ALL_TOOLS = BASE_TOOLS.copy()


