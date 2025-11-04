from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import health, transactions, watchlist, stock, news, insights, company, chatbot


app = FastAPI(title=settings.app_name)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(health.router, prefix="/api")
app.include_router(transactions.router, prefix="/api")
app.include_router(watchlist.router, prefix="/api")
app.include_router(stock.router, prefix="/api")
app.include_router(news.router, prefix="/api")
app.include_router(insights.router, prefix="/api")
app.include_router(company.router, prefix="/api")
app.include_router(chatbot.router, prefix="/api")


@app.get("/")
def root():
    return {"message": "FinanceCopilot API is running"}


