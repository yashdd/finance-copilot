import google.generativeai as genai
from typing import Optional
from ..config import settings


class AIService:
    def __init__(self):
        self.model = None
        if settings.gemini_api_key:
            genai.configure(api_key=settings.gemini_api_key)
            self.model = genai.GenerativeModel('gemini-pro')
    
    def _generate_text(self, prompt: str, system_instruction: str = "") -> str:
        """Generate text using Gemini"""
        if not self.model:
            return "AI features require Gemini API key. Please configure it in environment variables."
        
        try:
            full_prompt = f"{system_instruction}\n\n{prompt}" if system_instruction else prompt
            response = self.model.generate_content(
                full_prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.7,
                    top_p=0.8,
                    top_k=40,
                )
            )
            return response.text
        except Exception as e:
            return f"Error generating response: {str(e)}"
    
    def generate_insight(self, symbol: str, quote_data: dict, news_summary: str = "") -> str:
        """Generate AI-powered financial insight for a stock"""
        if not self.model:
            return f"{symbol} shows current price of ${quote_data.get('current_price', 0):.2f} with {quote_data.get('change_percent', 0):.2f}% change."
        
        system_instruction = "You are a professional financial analyst providing concise market insights."
        
        prompt = f"""Generate a concise 2-3 sentence insight about {symbol} stock.

Current Data:
- Price: ${quote_data.get('current_price', 0):.2f}
- Change: {quote_data.get('change_percent', 0):.2f}%
- Volume: {quote_data.get('volume', 0):,}

Recent News Context:
{news_summary[:200] if news_summary else "No recent news available."}

Generate a professional, insightful analysis in 2-3 sentences. Be specific and actionable."""

        return self._generate_text(prompt, system_instruction)
    
    def analyze_company(self, symbol: str, metrics: dict, company_name: str = "") -> str:
        """Generate AI analysis of company fundamentals"""
        if not self.model:
            return f"{symbol} fundamentals analysis: P/E ratio {metrics.get('pe_ratio', 'N/A')}, Market Cap ${metrics.get('market_cap', 0):,.0f}."
        
        system_instruction = "You are a financial analyst providing fundamental analysis."
        
        prompt = f"""Analyze the financial health of {company_name or symbol} based on these metrics:

- P/E Ratio: {metrics.get('pe_ratio', 'N/A')}
- EPS: {metrics.get('eps', 'N/A')}
- Market Cap: ${metrics.get('market_cap', 0):,.0f}
- Dividend Yield: {metrics.get('dividend_yield', 'N/A')}
- Profit Margin: {metrics.get('profit_margin', 'N/A')}
- Revenue Growth: {metrics.get('revenue_growth', 'N/A')}
- Price to Book: {metrics.get('price_to_book', 'N/A')}
- Debt to Equity: {metrics.get('debt_to_equity', 'N/A')}

Provide a 3-4 sentence analysis comparing these metrics to industry standards and assessing overall company health."""
        
        return self._generate_text(prompt, system_instruction)
    
    def chat_response(self, user_message: str, context: dict = None) -> str:
        """Generate chatbot response using RAG context"""
        if not self.model:
            return "AI features require Gemini API key. Please configure it in environment variables."
        
        context_str = ""
        if context:
            context_str = f"\n\nContext:\n- Watchlist: {context.get('watchlist', [])}\n- Recent queries: {context.get('recent_queries', [])}"
        
        system_instruction = "You are FinanceCopilot, a knowledgeable financial assistant."
        
        prompt = f"""Answer the user's question about stocks, investing, or finance.

User Question: {user_message}
{context_str}

Provide a helpful, accurate response. If you don't know something, say so."""
        
        return self._generate_text(prompt, system_instruction)

