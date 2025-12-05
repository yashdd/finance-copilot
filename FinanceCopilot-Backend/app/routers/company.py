from fastapi import APIRouter, HTTPException
from ..models.company import CompanyAnalysis
from ..services.finnhub_service import FinnhubService
from ..services.ai_service import AIService

router = APIRouter(prefix="/company", tags=["company"])

finnhub_service = FinnhubService()

ai_service = AIService()


@router.get("/analysis/{symbol}", response_model=CompanyAnalysis)
def get_company_analysis(symbol: str):
    """Get comprehensive company analysis with fundamentals and AI summary"""
    try:
        # Get metrics
        metrics = finnhub_service.get_metrics(symbol)
        
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

