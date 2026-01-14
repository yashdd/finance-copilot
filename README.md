# 💼 FinanceCopilot

> AI-powered financial assistant with real-time stock data, intelligent chatbot, and personalized insights

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=next.js)](https://nextjs.org/)
[![LangChain](https://img.shields.io/badge/LangChain-1C3C3C?logo=langchain)](https://www.langchain.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

FinanceCopilot is a full-stack financial intelligence platform that combines real-time market data with AI-powered insights. Built with FastAPI and Next.js, it provides users with stock tracking, AI chat assistance, news aggregation, and personalized financial analysis.

---

## ✨ Key Features

### 🚀 **Real-Time Stock Data**
- Live stock quotes with OHLC data
- Historical price charts (multiple resolutions: 1min to monthly)
- Fundamental metrics (P/E ratio, EPS, market cap, revenue growth, etc.)
- Multi-provider architecture with automatic failover (Finnhub → Alpha Vantage)

### 🤖 **AI-Powered Chatbot**
- **LangChain Agent** with Google Gemini AI
- **RAG (Retrieval-Augmented Generation)** using ChromaDB vector store
- Tool calling for real-time data fetching
- Conversation memory with automatic summarization
- Natural language queries about stocks, markets, and investments

### 📊 **Watchlist Management**
- Personal stock watchlists with real-time price updates
- Add/remove stocks with instant updates
- Watchlist analysis and insights

### 📰 **Financial News**
- Company-specific news aggregation
- General financial news (categories: finance, forex, crypto, mergers)
- News integration with AI insights

### 🔍 **Company Analysis**
- Comprehensive fundamental analysis
- AI-generated insights and summaries
- Agentic analysis (AI autonomously fetches and synthesizes data)
- Side-by-side company comparisons

### 🔐 **User Authentication**
- JWT-based authentication
- Email verification
- Session management
- Secure password hashing

---

## 🏗️ Architecture

### **Backend (FastAPI)**
- **36+ RESTful API endpoints** across 9 routers
- **MongoDB** for persistent data storage
- **ChromaDB** for vector embeddings (RAG)
- Multi-provider stock data with automatic failover
- LangChain integration for AI agent capabilities

### **Frontend (Next.js 16)**
- **React 19** with TypeScript
- **Tailwind CSS** for styling
- **Recharts** for data visualization
- Real-time updates and responsive design
- Protected routes with authentication

### **AI/ML Stack**
- **Google Gemini 1.5 Pro** (via LangChain)
- **RAG Pipeline**: ChromaDB + Google Generative AI embeddings
- **LangChain Agents** with tool calling
- Conversation memory management

---

## 🛠️ Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **MongoDB** - NoSQL database
- **ChromaDB** - Vector database for RAG
- **LangChain** - LLM framework
- **Google Gemini AI** - LLM provider
- **Pydantic** - Data validation
- **Python-JOSE** - JWT authentication

### Frontend
- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Styling
- **Recharts** - Chart library
- **Axios** - HTTP client
- **Zustand** - State management

### External APIs
- **Finnhub API** - Primary stock data provider
- **Alpha Vantage API** - Fallback stock data provider
- **Google Gemini API** - AI/LLM services

---

## 📁 Project Structure

```
FinanceCopilot/
├── FinanceCopilot-Backend/
│   ├── app/
│   │   ├── routers/          # API endpoints (9 routers)
│   │   ├── services/         # Business logic
│   │   ├── models/           # Pydantic models
│   │   ├── database/         # MongoDB models & connection
│   │   ├── core/             # Middleware, security
│   │   └── main.py           # FastAPI app
│   ├── chroma_db/            # Vector store (ChromaDB)
│   └── requirements.txt
│
└── FinanceCopilot-Frontend/
    ├── src/
    │   ├── app/              # Next.js app router pages
    │   ├── components/       # React components
    │   └── lib/              # Utilities, API client
    └── package.json
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+
- MongoDB (local or cloud)
- API Keys:
  - Finnhub API key
  - Google Gemini API key
  - Alpha Vantage API key (optional, for fallback)

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd FinanceCopilot-Backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**
   
   Create a `.env` file in `FinanceCopilot-Backend/`:
   ```env
   MONGODB_URL=mongodb://localhost:27017/financecopilot
   FINNHUB_API_KEY=your_finnhub_key
   GEMINI_API_KEY=your_gemini_key
   ALPHAVANTAGE_API_KEY=your_alpha_vantage_key
   SECRET_KEY=your-secret-key-here
   FRONTEND_ORIGIN=http://localhost:3000
   ```

5. **Run the server**
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

   API docs available at: http://localhost:8000/docs

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd FinanceCopilot-Frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure API endpoint**
   
   Update `src/lib/api-config.ts` if needed (default: `http://localhost:8000/api`)

4. **Run development server**
   ```bash
   npm run dev
   ```

   Application available at: http://localhost:3000

---

## 📡 API Endpoints

### Core Routers
- **`/api/auth`** - Authentication (register, login, logout, sessions)
- **`/api/stock`** - Stock data (quotes, candles, metrics, search)
- **`/api/watchlist`** - Watchlist management
- **`/api/chatbot`** - AI chatbot with session management
- **`/api/news`** - Financial news
- **`/api/insights`** - AI-generated stock insights
- **`/api/company`** - Company analysis and comparisons
- **`/api/rag`** - RAG knowledge base management
- **`/api/health`** - Health check

Full API documentation: http://localhost:8000/docs (Swagger UI)

---

## 🎯 Core Capabilities

### Stock Data
- Real-time quotes and pricing
- Historical candlestick data
- Fundamental metrics and ratios
- Stock symbol search

### AI Chatbot
- Natural language queries
- Real-time data fetching via tools
- Watchlist integration
- Multi-turn conversations with memory
- RAG-powered knowledge base

### Watchlist
- Personal stock tracking
- Real-time price updates
- Add/remove stocks
- Watchlist analysis

### News & Insights
- Company-specific news
- General financial news
- AI-generated insights
- Sentiment analysis

---

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Protected API routes
- CORS configuration
- Email verification
- Session management

---

## 🧪 Development

### Backend
```bash
# Run with auto-reload
uvicorn app.main:app --reload

# Run production server
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Frontend
```bash
# Development
npm run dev

# Production build
npm run build
npm start
```

---

## 📝 Environment Variables

### Backend (.env)
```env
MONGODB_URL=mongodb://localhost:27017/financecopilot
FINNHUB_API_KEY=your_key
GEMINI_API_KEY=your_key
ALPHAVANTAGE_API_KEY=your_key
SECRET_KEY=your-secret-key
FRONTEND_ORIGIN=http://localhost:3000
CHROMA_PERSIST_DIR=./chroma_db
```

---

## 🚧 Current Status

### ✅ Implemented
- Real-time stock data fetching
- AI chatbot with LangChain
- Watchlist CRUD operations
- News aggregation
- User authentication
- RAG pipeline
- Company analysis
- Multi-provider API fallback

### 🔜 Future Enhancements
- Real-time alerts/notifications
- Portfolio tracking
- Advanced analytics and reporting
- Caching layer (Redis)
- Performance monitoring
- Docker deployment guides

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License



---

## 👤 Author

Built with ❤️ for better financial intelligence

---

**Note**: This project requires API keys for external services (Finnhub, Gemini, Alpha Vantage). Ensure you have valid API keys before running the application.