from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from ..models.company import CompanyAnalysis
from ..services.stock_service import StockService
from ..services.ai_service import AIService
from ..services.tool_registry import BASE_TOOLS

router = APIRouter(prefix="/company", tags=["company"])

stock_service = StockService()
ai_service = AIService()


@router.get("/analysis/{symbol}", response_model=CompanyAnalysis)
def get_company_analysis(symbol: str):
    """Get comprehensive company analysis with fundamentals and AI summary"""
    try:
        # Get metrics
        metrics = stock_service.get_metrics(symbol)
        
        # Convert metrics to dict for response
        metrics_dict = {
            "pe_ratio": metrics.pe_ratio,
            "eps": metrics.eps,
            "market_cap": metrics.market_cap,
            "dividend_yield": metrics.dividend_yield,
            "profit_margin": metrics.profit_margin,
            "revenue_growth": metrics.revenue_growth,
            "price_to_book": metrics.price_to_book,
            "debt_to_equity": metrics.debt_to_equity
        }
        
        # Calculate health score (simple heuristic)
        health_score = 0.5  # Default
        if metrics.pe_ratio and 10 <= metrics.pe_ratio <= 25:
            health_score += 0.1
        if metrics.profit_margin and metrics.profit_margin > 0.1:
            health_score += 0.1
        if metrics.revenue_growth and metrics.revenue_growth > 0:
            health_score += 0.1
        if metrics.debt_to_equity and metrics.debt_to_equity < 1.0:
            health_score += 0.1
        health_score = min(1.0, health_score)
        
        # Generate AI summary
        ai_summary = ai_service.analyze_company(symbol, metrics_dict, symbol)
        
        return CompanyAnalysis(
            symbol=symbol.upper(),
            metrics=metrics_dict,
            health_score=health_score,
            ai_summary=ai_summary
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/analyze-agentic/{symbol}")
def analyze_company_agentic(symbol: str):
    """
    Company analyzer - AI provides comprehensive stock analysis without tools.
    """
    try:
        symbol = symbol.upper()
        
        # Ensure LLM is initialized
        if not ai_service._ensure_llm_initialized():
            detail_msg = ai_service.last_error or "AI not available. Please check Gemini API configuration."
            raise HTTPException(status_code=503, detail=detail_msg)
        
        # Fetch real-time data for the company
        quote = stock_service.get_quote(symbol)
        metrics = stock_service.get_metrics(symbol)
        news = stock_service.get_company_news(symbol, days=7) if hasattr(stock_service, "get_company_news") else []
        
        # Try to get candles, but don't fail if unavailable
        try:
            candles = stock_service.get_candles(symbol, resolution="D", days=30)
        except Exception as e:
            print(f"[COMPANY_ANALYZER] Could not fetch candles for {symbol}: {e}", flush=True)
            candles = None
        
        # Compute 30-day trend
        trend = ""
        if candles:
            start = candles[0].close
            end = candles[-1].close
            pct = ((end - start) / start) * 100 if start else 0
            trend = f"{pct:+.2f}%"
        
        # Format news
        news_text = []
        for item in news[:3]:
            title = item.title if hasattr(item, "title") else item.get("title", "")
            if title:
                news_text.append(title)
        news_str = "; ".join(news_text) if news_text else "No recent news"
        
        # Create comprehensive analysis prompt
        analysis_prompt = f"""Perform a comprehensive analysis of {symbol} stock.

COMPANY DATA:
- Quote: price ${quote.current_price:.2f}, change {quote.change:+.2f} ({quote.change_percent:+.2f}%), volume {quote.volume:,}
- Metrics: P/E {metrics.pe_ratio or 'N/A'}, EPS {metrics.eps or 'N/A'}, Market Cap {metrics.market_cap or 'N/A'}, Profit Margin {metrics.profit_margin or 'N/A'}, Revenue Growth {metrics.revenue_growth or 'N/A'}, Price/Book {metrics.price_to_book or 'N/A'}, Debt/Equity {metrics.debt_to_equity or 'N/A'}
- 30-day trend: {trend or 'N/A'}
- Recent news: {news_str}

Provide a thorough analysis (plain text, no markdown) with these sections:

MARKET POSITION
Current price action, volume trends, and momentum analysis.

FUNDAMENTAL HEALTH
Assessment of valuation metrics, profitability, growth prospects.

STRENGTHS & WEAKNESSES
Key competitive advantages and risk factors.

TECHNICAL ANALYSIS
30-day trend direction and price patterns.

INVESTMENT OUTLOOK
Overall assessment and market positioning.

ACTION ITEMS
Exactly 2 short recommendations for investors.

DISCLAIMER
Not financial advice. Do your own research.

Be data-driven and thorough."""

        print(f"[COMPANY_ANALYZER] Starting analysis for {symbol}", flush=True)
        
        # Invoke LLM directly (no tools, no agent executor)
        from langchain_core.messages import HumanMessage
        response = ai_service.llm.invoke([HumanMessage(content=analysis_prompt)])
        
        analysis_text = response.content if hasattr(response, 'content') else str(response)
        
        print(f"[COMPANY_ANALYZER] Analysis complete for {symbol}", flush=True)
        
        return {
            "symbol": symbol,
            "analysis": analysis_text,
            "timestamp": "2024-01-01T00:00:00Z"  # Will be set by frontend
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"[COMPANY_ANALYZER] Error: {e}", flush=True)
        print(f"[COMPANY_ANALYZER] Traceback:\n{error_trace}", flush=True)
        raise HTTPException(status_code=500, detail=f"Error generating analysis: {str(e)}")


@router.post("/compare")
def compare_companies_agentic(
    symbol1: str = Query(..., description="First stock symbol"),
    symbol2: str = Query(..., description="Second stock symbol")
):
    """
    Company comparison - fetches real-time data for both companies and provides comprehensive side-by-side analysis.
    Note: Uses direct data fetching to avoid LangChain-Gemini tool-calling issues.
    """
    try:
        symbol1 = symbol1.upper()
        symbol2 = symbol2.upper()
        
        print(f"[COMPANY_COMPARER] Starting comparison: {symbol1} vs {symbol2}", flush=True)
        
        # Fetch data directly for both symbols
        quote1 = stock_service.get_quote(symbol1)
        metrics1 = stock_service.get_metrics(symbol1)
        news1 = stock_service.get_company_news(symbol1, days=7) if hasattr(stock_service, "get_company_news") else []
        
        # Try to get candles, but don't fail if unavailable
        try:
            candles1 = stock_service.get_candles(symbol1, resolution="D", days=30)
        except Exception as e:
            print(f"[COMPANY_COMPARER] Could not fetch candles for {symbol1}: {e}", flush=True)
            candles1 = None
        
        quote2 = stock_service.get_quote(symbol2)
        metrics2 = stock_service.get_metrics(symbol2)
        news2 = stock_service.get_company_news(symbol2, days=7) if hasattr(stock_service, "get_company_news") else []
        
        # Try to get candles, but don't fail if unavailable
        try:
            candles2 = stock_service.get_candles(symbol2, resolution="D", days=30)
        except Exception as e:
            print(f"[COMPANY_COMPARER] Could not fetch candles for {symbol2}: {e}", flush=True)
            candles2 = None
        
        # Compute 30-day trends
        trend1 = ""
        if candles1:
            start = candles1[0].close
            end = candles1[-1].close
            pct = ((end - start) / start) * 100 if start else 0
            trend1 = f"{pct:+.2f}%"
        
        trend2 = ""
        if candles2:
            start = candles2[0].close
            end = candles2[-1].close
            pct = ((end - start) / start) * 100 if start else 0
            trend2 = f"{pct:+.2f}%"
        
        # Format news
        news1_text = []
        for item in news1[:2]:
            title = item.title if hasattr(item, "title") else item.get("title", "")
            if title:
                news1_text.append(title)
        news1_str = "; ".join(news1_text) if news1_text else "No recent news"
        
        news2_text = []
        for item in news2[:2]:
            title = item.title if hasattr(item, "title") else item.get("title", "")
            if title:
                news2_text.append(title)
        news2_str = "; ".join(news2_text) if news2_text else "No recent news"
        
        # Build comprehensive comparison prompt
        system_instruction = (
            "You are an equity analyst comparing two stocks. Analyze the provided data comprehensively. "
            "Deliver a thorough side-by-side comparison in plain text (no markdown) with these sections:\n"
            "Price Performance: current prices, changes, 30-day trends.\n"
            "Valuation: P/E, market cap, price/book comparisons.\n"
            "Profitability & Growth: profit margins, revenue growth.\n"
            "Balance Sheet: debt/equity comparisons.\n"
            "Recent News: key headlines for each.\n"
            "Investment Outlook: which stock may suit growth vs value strategies.\n"
            "Verdict: summarize relative attractiveness.\n"
            "End with two short action recommendations and a 'not investment advice' disclaimer."
        )
        
        prompt = f"""Compare {symbol1} vs {symbol2}:

{symbol1}:
- Quote: price ${quote1.current_price:.2f}, change {quote1.change:+.2f} ({quote1.change_percent:+.2f}%), volume {quote1.volume:,}
- Metrics: P/E {metrics1.pe_ratio or 'N/A'}, EPS {metrics1.eps or 'N/A'}, Market Cap {metrics1.market_cap or 'N/A'}, Profit Margin {metrics1.profit_margin or 'N/A'}, Revenue Growth {metrics1.revenue_growth or 'N/A'}, Price/Book {metrics1.price_to_book or 'N/A'}, Debt/Equity {metrics1.debt_to_equity or 'N/A'}
- 30-day trend: {trend1 or 'N/A'}
- Recent news: {news1_str}

{symbol2}:
- Quote: price ${quote2.current_price:.2f}, change {quote2.change:+.2f} ({quote2.change_percent:+.2f}%), volume {quote2.volume:,}
- Metrics: P/E {metrics2.pe_ratio or 'N/A'}, EPS {metrics2.eps or 'N/A'}, Market Cap {metrics2.market_cap or 'N/A'}, Profit Margin {metrics2.profit_margin or 'N/A'}, Revenue Growth {metrics2.revenue_growth or 'N/A'}, Price/Book {metrics2.price_to_book or 'N/A'}, Debt/Equity {metrics2.debt_to_equity or 'N/A'}
- 30-day trend: {trend2 or 'N/A'}
- Recent news: {news2_str}

Generate the comparison using the required sections."""

        if not ai_service.llm:
            fallback = (
                f"{symbol1} (${quote1.current_price:.2f}, {quote1.change_percent:+.2f}%) vs "
                f"{symbol2} (${quote2.current_price:.2f}, {quote2.change_percent:+.2f}%). "
                f"P/E: {metrics1.pe_ratio or 'N/A'} vs {metrics2.pe_ratio or 'N/A'}. "
                f"Market Cap: {metrics1.market_cap or 'N/A'} vs {metrics2.market_cap or 'N/A'}."
            )
            return {"symbol1": symbol1, "symbol2": symbol2, "comparison": fallback, "timestamp": "2024-01-01T00:00:00Z"}
        
        comparison_text = ai_service._generate_text(prompt, system_instruction)
        
        print(f"[COMPANY_COMPARER] Comparison complete: {symbol1} vs {symbol2}", flush=True)
        
        return {
            "symbol1": symbol1,
            "symbol2": symbol2,
            "comparison": comparison_text,
            "timestamp": "2024-01-01T00:00:00Z"  # Will be set by frontend
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"[COMPANY_COMPARER] Error: {e}", flush=True)
        print(f"[COMPANY_COMPARER] Traceback:\n{error_trace}", flush=True)
        raise HTTPException(status_code=500, detail=f"Error generating comparison: {str(e)}")

