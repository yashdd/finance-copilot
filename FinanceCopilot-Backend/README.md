# FinanceCopilot Backend (FastAPI)

## Quickstart

1) Create and activate a virtual environment

Windows (PowerShell):

```
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

2) Install dependencies

```
pip install -r requirements.txt
```

3) Run the server

```
uvicorn app.main:app --reload --port 8000
```

4) Open docs

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Project structure

```
FinanceCopilot-Backend/
  app/
    __init__.py
    main.py
    config.py
    models/
      __init__.py
      stock.py
      news.py
      insights.py
      company.py
      chat.py
    routers/
      __init__.py
      health.py
      transactions.py
      watchlist.py
      stock.py
      news.py
      insights.py
      company.py
      chatbot.py
    services/
      __init__.py
      finnhub_service.py
      ai_service.py
      watchlist_service.py
  requirements.txt
  README.md
  API_ENDPOINTS.md
```

## Environment Variables

Create a `.env` file in the backend root:

```env
FRONTEND_ORIGIN=http://localhost:3000
FINNHUB_API_KEY=your_finnhub_key_here
GEMINI_API_KEY=your_gemini_key_here
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key_here
```

## Features

**Watchlist** - Add/remove stocks, track prices  
**Stock Data** - Real-time quotes, historical candles, fundamentals  
**News** - Company-specific and general financial news  
**AI Insights** - AI-generated stock analysis  
**Company Analysis** - Comprehensive fundamentals with health scores  
**Chatbot** - RAG-powered conversational assistant  

See [API_ENDPOINTS.md](./API_ENDPOINTS.md) for full endpoint documentation.


