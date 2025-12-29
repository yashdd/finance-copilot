'use client'
import { useState, useEffect } from 'react'
import axios from 'axios'
import apiClient from '@/lib/api-client'
import { API_BASE } from '@/lib/api-config'
import { Search, TrendingUp, TrendingDown, Activity, BarChart3, LineChart, AreaChart, Filter, Building2, Sparkles, Loader2, GitCompare, Brain } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { LineChart as RechartsLineChart, AreaChart as RechartsAreaChart, BarChart, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, Area, Bar, Legend, Scatter } from 'recharts'

interface StockQuote {
  symbol: string
  current_price: number
  change: number
  change_percent: number
  high: number
  low: number
  open: number
  previous_close: number
  volume: number
  timestamp: number
}

interface StockCandle {
  symbol: string
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface StockMetrics {
  symbol: string
  pe_ratio?: number
  eps?: number
  market_cap?: number
  dividend_yield?: number
  profit_margin?: number
  revenue_growth?: number
  price_to_book?: number
  debt_to_equity?: number
}

interface CompanyAnalysis {
  symbol: string
  name?: string
  sector?: string
  industry?: string
  metrics: {
    pe_ratio?: number
    eps?: number
    market_cap?: number
    dividend_yield?: number
    profit_margin?: number
    revenue_growth?: number
    price_to_book?: number
    debt_to_equity?: number
  }
  health_score?: number
  ai_summary?: string
}

type ChartType = 'line' | 'area' | 'ohlc' | 'candlestick' | 'scatter' | 'composed'
type TimePeriod = '1D' | '5D' | '1M' | '3M' | '6M' | '1Y' | 'ALL'
type Resolution = '1' | '5' | '15' | '30' | '60' | 'D' | 'W' | 'M'

export default function StocksClient() {
  const searchParams = useSearchParams()
  const [symbol, setSymbol] = useState(searchParams.get('symbol') || 'AAPL')
  const [currentSymbol, setCurrentSymbol] = useState(searchParams.get('symbol') || 'AAPL')
  const [quote, setQuote] = useState<StockQuote | null>(null)
  const [metrics, setMetrics] = useState<StockMetrics | null>(null)
  const [candles, setCandles] = useState<StockCandle[]>([])
  const [loading, setLoading] = useState(false)
  const [chartLoading, setChartLoading] = useState(false)
  const [companyAnalysis, setCompanyAnalysis] = useState<CompanyAnalysis | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [showAnalysis, setShowAnalysis] = useState(false)
  
  // Agentic analysis states
  const [agenticAnalysis, setAgenticAnalysis] = useState<string | null>(null)
  const [agenticAnalysisLoading, setAgenticAnalysisLoading] = useState(false)
  const [agenticAnalysisStatus, setAgenticAnalysisStatus] = useState<string>('')
  
  // Comparison states
  const [compareSymbol1, setCompareSymbol1] = useState('')
  const [compareSymbol2, setCompareSymbol2] = useState('')
  const [comparisonResult, setComparisonResult] = useState<string | null>(null)
  const [comparisonLoading, setComparisonLoading] = useState(false)
  const [comparisonStatus, setComparisonStatus] = useState<string>('')
  const [showComparison, setShowComparison] = useState(false)
  const [symbol2Suggestions, setSymbol2Suggestions] = useState<Array<{symbol: string; description: string}>>([])
  const [showSymbol2Suggestions, setShowSymbol2Suggestions] = useState(false)
  const [searchingSymbol2, setSearchingSymbol2] = useState(false)
  const [symbolSuggestions, setSymbolSuggestions] = useState<Array<{symbol: string; description: string}>>([])
  const [showSymbolSuggestions, setShowSymbolSuggestions] = useState(false)
  const [searchingSymbol, setSearchingSymbol] = useState(false)
  
  // Chart filters
  const [chartType, setChartType] = useState<ChartType>('line')
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('1M')
  const [resolution, setResolution] = useState<Resolution>('D')
  const [showVolume, setShowVolume] = useState(true)
  const [showOHLC, setShowOHLC] = useState(false)
  const [chartError, setChartError] = useState<string | null>(null)

  // Search for main stock symbol
  const searchMainSymbols = async (query: string) => {
    if (!query.trim() || query.length < 1) {
      setSymbolSuggestions([])
      setShowSymbolSuggestions(false)
      return
    }

    setSearchingSymbol(true)
    try {
      const res = await axios.get(`${API_BASE}/stock/search`, {
        params: { q: query, limit: 8 }
      })
      setSymbolSuggestions(res.data)
      setShowSymbolSuggestions(res.data.length > 0)
    } catch (error) {
      console.error('Error searching symbols:', error)
      setSymbolSuggestions([])
      setShowSymbolSuggestions(false)
    } finally {
      setSearchingSymbol(false)
    }
  }

  const handleSymbolInputChange = (value: string) => {
    setSymbol(value)
    if (value.trim()) {
      searchMainSymbols(value)
    } else {
      setSymbolSuggestions([])
      setShowSymbolSuggestions(false)
    }
  }

  const selectSymbol = (sym: string) => {
    setSymbol(sym)
    setCurrentSymbol(sym.toUpperCase())
    setShowSymbolSuggestions(false)
  }

  // Search for company symbols for comparison
  const searchCompanySymbols = async (query: string) => {
    if (!query.trim() || query.length < 1) {
      setSymbol2Suggestions([])
      setShowSymbol2Suggestions(false)
      return
    }

    setSearchingSymbol2(true)
    try {
      const res = await axios.get(`${API_BASE}/stock/search`, {
        params: { q: query, limit: 8 }
      })
      setSymbol2Suggestions(res.data)
      setShowSymbol2Suggestions(res.data.length > 0)
    } catch (error) {
      console.error('Error searching symbols:', error)
      setSymbol2Suggestions([])
      setShowSymbol2Suggestions(false)
    } finally {
      setSearchingSymbol2(false)
    }
  }

  const handleSymbol2Change = (value: string) => {
    setCompareSymbol2(value)
    if (value.trim()) {
      searchCompanySymbols(value)
    } else {
      setSymbol2Suggestions([])
      setShowSymbol2Suggestions(false)
    }
  }

  const selectSymbol2 = (symbol: string) => {
    setCompareSymbol2(symbol)
    setShowSymbol2Suggestions(false)
  }

  const getDaysFromPeriod = (period: TimePeriod): number => {
    switch (period) {
      case '1D': return 1
      case '5D': return 5
      case '1M': return 30
      case '3M': return 90
      case '6M': return 180
      case '1Y': return 365
      case 'ALL': return 365
      default: return 30
    }
  }

  const fetchStockData = async () => {
    if (!currentSymbol.trim()) return
    setLoading(true)
    try {
      const [quoteRes, metricsRes] = await Promise.all([
        apiClient.get(`/stock/quote/${currentSymbol.toUpperCase()}`),
        apiClient.get(`/stock/metrics/${currentSymbol.toUpperCase()}`)
      ])
      setQuote(quoteRes.data)
      setMetrics(metricsRes.data)
    } catch (error: any) {
      console.error('Error fetching stock data:', error)
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to fetch stock data'
      console.error('Error details:', errorMsg)
      setQuote(null)
      setMetrics(null)
    } finally {
      setLoading(false)
    }
  }

  const fetchCandleData = async () => {
    if (!currentSymbol.trim()) return
    setChartLoading(true)
    setChartError(null)
    try {
      const days = getDaysFromPeriod(timePeriod)
      
      // Validate resolution/period combinations
      const isIntraday = ['1', '5', '15', '30', '60'].includes(resolution)
      if (isIntraday && days > 30) {
        // Intraday resolutions typically only support up to 30 days
        setChartError(`Intraday resolution (${resolution} min) only supports up to 30 days. Please select a shorter time period.`)
        setCandles([])
        setChartLoading(false)
        return
      }
      
      console.log(`Fetching candle data for ${currentSymbol.toUpperCase()}: resolution=${resolution}, days=${days}`)
      const res = await apiClient.get(`/stock/candle/${currentSymbol.toUpperCase()}`, {
        params: {
          resolution: resolution,
          days: days
        }
      })
      console.log(`Received ${res.data?.length || 0} candles`)
      
      if (!res.data || res.data.length === 0) {
        setChartError(`No historical data available for ${currentSymbol.toUpperCase()} with these settings.`)
      } else {
        setChartError(null)
      }
      setCandles(res.data || [])
    } catch (error: any) {
      console.error('Error fetching candle data:', error)
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to fetch chart data'
      console.error('Error details:', errorMsg)
      setChartError(errorMsg)
      setCandles([])
    } finally {
      setChartLoading(false)
    }
  }

  useEffect(() => {
    fetchStockData()
  }, [currentSymbol])

  // Keep the first comparison symbol locked to the currently viewed symbol
  useEffect(() => {
    setCompareSymbol1(currentSymbol)
  }, [currentSymbol])

  useEffect(() => {
    fetchCandleData()
  }, [currentSymbol, timePeriod, resolution])

  // Format chart data
  const chartData = candles.map(candle => {
    const isUp = candle.close >= candle.open
    return {
      date: new Date(candle.timestamp * 1000).toLocaleDateString(),
      time: new Date(candle.timestamp * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      timestamp: candle.timestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
      // For candlestick chart visualization
      isUp,
      bodyHigh: Math.max(candle.open, candle.close),
      bodyLow: Math.min(candle.open, candle.close),
      // Separate up/down candles for better visualization
      upBody: isUp ? Math.max(candle.open, candle.close) : null,
      downBody: !isUp ? Math.min(candle.open, candle.close) : null,
      upBodyLow: isUp ? Math.min(candle.open, candle.close) : null,
      downBodyHigh: !isUp ? Math.max(candle.open, candle.close) : null,
      // Price change
      change: candle.close - candle.open,
      changePercent: ((candle.close - candle.open) / candle.open) * 100
    }
  })

  const handleSearch = () => {
    if (symbol.trim()) {
      setCurrentSymbol(symbol.toUpperCase())
    }
  }

  const formatNumber = (num?: number) => {
    if (!num) return 'N/A'
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`
    return `$${num.toFixed(2)}`
  }

  const fetchProperAnalysis = async () => {
    if (!currentSymbol.trim()) return
    setAgenticAnalysisLoading(true)
    setAgenticAnalysis(null)
    
    const statusMessages = [
      `Initializing thorough analysis for ${currentSymbol.toUpperCase()}...`,
      `Fetching real-time stock quote and market data...`,
      `Gathering fundamental metrics and financial ratios...`,
      `Collecting recent news and market sentiment...`,
      `Analyzing historical price trends and patterns...`,
      `Computing valuation metrics and comparisons...`,
      `Synthesizing comprehensive investment insights...`,
      `Finalizing detailed analysis report...`
    ]
    
    let statusIndex = 0
    const statusInterval = setInterval(() => {
      if (statusIndex < statusMessages.length) {
        setAgenticAnalysisStatus(statusMessages[statusIndex])
        statusIndex++
      }
    }, 1500)
    
    try {
      const res = await apiClient.post(`/company/analyze-agentic/${currentSymbol.toUpperCase()}`, {}, {
        timeout: 60000 // 60 seconds for thorough analysis
      })
      clearInterval(statusInterval)
      setAgenticAnalysisStatus('Analysis complete!')
      setAgenticAnalysis(res.data.analysis)
    } catch (error: any) {
      clearInterval(statusInterval)
      console.error('Error fetching analysis:', error)
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to generate analysis'
      setAgenticAnalysisStatus(`Error: ${errorMsg}`)
      setAgenticAnalysis(`Error: ${errorMsg}`)
    } finally {
      setAgenticAnalysisLoading(false)
      setTimeout(() => setAgenticAnalysisStatus(''), 3000)
    }
  }

  const fetchCompanyAnalysis = async () => {
    if (!currentSymbol.trim()) return
    setAnalysisLoading(true)
    setShowAnalysis(true)
    try {
      const res = await apiClient.get(`/company/analysis/${currentSymbol.toUpperCase()}`)
      setCompanyAnalysis(res.data)
    } catch (error: any) {
      console.error('Error fetching company analysis:', error)
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to fetch analysis'
      console.error('Error details:', errorMsg)
      setCompanyAnalysis(null)
    } finally {
      setAnalysisLoading(false)
    }
  }

  const fetchAgenticAnalysis = async () => {
    // Deprecated: use fetchProperAnalysis instead
    fetchProperAnalysis()
  }

  const fetchComparison = async () => {
    if (!compareSymbol2.trim()) return
    setComparisonLoading(true)
    setComparisonResult(null)
    setShowComparison(true)
    
    const symbol1Upper = currentSymbol.toUpperCase()
    const symbol2Upper = compareSymbol2.toUpperCase()
    
    const statusMessages = [
      'Initializing AI agent for comparison...',
      `Fetching ${symbol1Upper} real-time data...`,
      `Fetching ${symbol2Upper} real-time data...`,
      `Gathering ${symbol1Upper} fundamental metrics...`,
      `Gathering ${symbol2Upper} fundamental metrics...`,
      'Collecting news for both companies...',
      'Analyzing price trends...',
      'Comparing financial metrics...',
      'Synthesizing comprehensive comparison...',
      'Finalizing insights...'
    ]
    
    let statusIndex = 0
    const statusInterval = setInterval(() => {
      if (statusIndex < statusMessages.length) {
        setComparisonStatus(statusMessages[statusIndex])
        statusIndex++
      }
    }, 2000)
    
    try {
      const res = await apiClient.post('/company/compare', null, {
        params: {
          symbol1: symbol1Upper,
          symbol2: symbol2Upper
        },
        timeout: 60000 // 60 seconds for agentic operations
      })
      clearInterval(statusInterval)
      setComparisonStatus('Comparison complete!')
      setComparisonResult(res.data.comparison)
    } catch (error: any) {
      clearInterval(statusInterval)
      console.error('Error fetching comparison:', error)
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to generate comparison'
      setComparisonStatus(`Error: ${errorMsg}`)
      setComparisonResult(`Error: ${errorMsg}`)
    } finally {
      setComparisonLoading(false)
      setTimeout(() => setComparisonStatus(''), 3000)
    }
  }

  // Reset analysis when symbol changes
  useEffect(() => {
    setCompanyAnalysis(null)
    setShowAnalysis(false)
  }, [currentSymbol])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50/30 to-teal-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
            Stock Details
          </h1>
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={symbol}
                onChange={(e) => handleSymbolInputChange(e.target.value)}
                onFocus={() => symbol.trim() && setShowSymbolSuggestions(symbolSuggestions.length > 0)}
                placeholder="Enter stock symbol (e.g., AAPL)"
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              {showSymbolSuggestions && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 z-10 max-h-60 overflow-y-auto">
                  {symbolSuggestions.map((s) => (
                    <button
                      key={s.symbol}
                      onClick={() => selectSymbol(s.symbol)}
                      className="w-full text-left px-4 py-2 hover:bg-emerald-50 border-b border-gray-100 last:border-b-0 transition-colors"
                    >
                      <div className="font-semibold text-gray-900">{s.symbol}</div>
                      <div className="text-xs text-gray-500">{s.description}</div>
                    </button>
                  ))}
                  {symbolSuggestions.length === 0 && searchingSymbol && (
                    <div className="px-4 py-3 text-sm text-gray-500">Searching...</div>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={handleSearch}
              disabled={loading || !symbol.trim()}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-medium transition-all disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Search'}
            </button>
          </div>
        </div>

        {loading && !quote ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading stock data...</p>
          </div>
        ) : quote ? (
          <>
            {/* Price Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-1">{quote.symbol}</h2>
                  <p className="text-gray-600 lg:text-lg">Real-time quote</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl lg:text-4xl font-bold text-gray-900 mb-1">
                    ${quote.current_price.toFixed(2)}
                  </div>
                  <div className={`flex items-center gap-2 ${quote.change_percent >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {quote.change_percent >= 0 ? (
                      <TrendingUp size={20} />
                    ) : (
                      <TrendingDown size={20} />
                    )}
                    <span className="font-semibold text-base lg:text-lg">
                      {quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2)} ({quote.change_percent >= 0 ? '+' : ''}{quote.change_percent.toFixed(2)}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Price Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
                <div>
                  <p className="text-xs lg:text-sm text-gray-500 mb-1">Open</p>
                  <p className="font-semibold text-gray-900 text-base lg:text-lg">${quote.open.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs lg:text-sm text-gray-500 mb-1">High</p>
                  <p className="font-semibold text-emerald-600 text-base lg:text-lg">${quote.high.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs lg:text-sm text-gray-500 mb-1">Low</p>
                  <p className="font-semibold text-red-600 text-base lg:text-lg">${quote.low.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs lg:text-sm text-gray-500 mb-1">Volume</p>
                  <p className="font-semibold text-gray-900 text-base lg:text-lg">{quote.volume.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Chart Section */}
            {quote && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
                  <h3 className="text-lg lg:text-xl font-semibold text-gray-800 flex items-center gap-2">
                    <BarChart3 size={20} className="text-emerald-500" />
                    Price Chart
                  </h3>
                  
                  {/* Chart Filters */}
                  <div className="flex flex-wrap gap-2">
                    {/* Chart Type */}
                    <div className="flex gap-1 bg-gray-100 rounded-lg p-1 flex-wrap">
                      <button
                        onClick={() => setChartType('line')}
                        className={`px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                          chartType === 'line'
                            ? 'bg-white text-emerald-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                        title="Line Chart"
                      >
                        <LineChart size={12} className="inline-block" />
                      </button>
                      <button
                        onClick={() => setChartType('area')}
                        className={`px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                          chartType === 'area'
                            ? 'bg-white text-emerald-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                        title="Area Chart"
                      >
                        <AreaChart size={12} className="inline-block" />
                      </button>
                      <button
                        onClick={() => setChartType('ohlc')}
                        className={`px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                          chartType === 'ohlc'
                            ? 'bg-white text-emerald-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                        title="OHLC Bars"
                      >
                        <BarChart3 size={12} className="inline-block" />
                      </button>
                      <button
                        onClick={() => setChartType('candlestick')}
                        className={`px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                          chartType === 'candlestick'
                            ? 'bg-white text-emerald-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                        title="Candlestick"
                      >
                        <Activity size={12} className="inline-block" />
                      </button>
                      <button
                        onClick={() => setChartType('composed')}
                        className={`px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                          chartType === 'composed'
                            ? 'bg-white text-emerald-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                        title="Composed Chart"
                      >
                        <Filter size={12} className="inline-block" />
                      </button>
                    </div>

                    {/* Time Period */}
                    <select
                      value={timePeriod}
                      onChange={(e) => setTimePeriod(e.target.value as TimePeriod)}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg bg-white text-xs lg:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="1D">1 Day</option>
                      <option value="5D">5 Days</option>
                      <option value="1M">1 Month</option>
                      <option value="3M">3 Months</option>
                      <option value="6M">6 Months</option>
                      <option value="1Y">1 Year</option>
                      <option value="ALL">All</option>
                    </select>

                    {/* Resolution */}
                    <select
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value as Resolution)}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg bg-white text-xs lg:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="1">1 Min</option>
                      <option value="5">5 Min</option>
                      <option value="15">15 Min</option>
                      <option value="30">30 Min</option>
                      <option value="60">1 Hour</option>
                      <option value="D">Daily</option>
                      <option value="W">Weekly</option>
                      <option value="M">Monthly</option>
                    </select>

                    {/* Show Volume Toggle */}
                    <button
                      onClick={() => setShowVolume(!showVolume)}
                      className={`px-3 py-1.5 rounded-lg text-xs lg:text-sm font-medium transition-all ${
                        showVolume
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Volume
                    </button>
                  </div>
                </div>

                {/* Chart */}
                {chartLoading ? (
                  <div className="h-64 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                  </div>
                ) : chartData.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-gray-400 text-sm gap-3">
                    <BarChart3 size={32} className="text-gray-300" />
                    <p className="font-medium">No chart data available</p>
                    {chartError && (
                      <p className="text-xs text-red-500 text-center px-4 max-w-md bg-red-50 p-2 rounded-lg">
                        {chartError}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 text-center px-4 max-w-md">
                      Try adjusting the time period or resolution. Some symbols may not have historical data for certain periods.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 justify-center">
                      <button
                        onClick={() => {
                          setTimePeriod('1M')
                          setResolution('D')
                          setChartError(null)
                        }}
                        className="px-3 py-1.5 text-xs bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
                      >
                        Try 1 Month Daily
                      </button>
                      <button
                        onClick={() => {
                          setTimePeriod('1Y')
                          setResolution('W')
                          setChartError(null)
                        }}
                        className="px-3 py-1.5 text-xs bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
                      >
                        Try 1 Year Weekly
                      </button>
                      <button
                        onClick={() => {
                          setTimePeriod('3M')
                          setResolution('D')
                          setChartError(null)
                        }}
                        className="px-3 py-1.5 text-xs bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
                      >
                        Try 3 Months Daily
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="h-80 lg:h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      {chartType === 'line' ? (
                        <RechartsLineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis 
                            dataKey={resolution === 'D' || resolution === 'W' || resolution === 'M' ? 'date' : 'time'}
                            stroke="#6b7280"
                            fontSize={12}
                          />
                          <YAxis 
                            yAxisId="price"
                            stroke="#6b7280"
                            fontSize={12}
                            domain={['auto', 'auto']}
                          />
                          {showVolume && (
                            <YAxis 
                              yAxisId="volume"
                              orientation="right"
                              stroke="#9ca3af"
                              fontSize={12}
                            />
                          )}
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'white', 
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              fontSize: '12px'
                            }}
                            formatter={(value: any, name: string) => {
                              if (name === 'volume') {
                                return [value.toLocaleString(), 'Volume']
                              }
                              return [`$${Number(value).toFixed(2)}`, name.charAt(0).toUpperCase() + name.slice(1)]
                            }}
                          />
                          <Legend />
                          <Line 
                            yAxisId="price"
                            type="monotone" 
                            dataKey="close" 
                            stroke="#10b981" 
                            strokeWidth={2}
                            dot={false}
                            name="Close"
                          />
                          {showVolume && (
                            <Bar 
                              yAxisId="volume"
                              dataKey="volume" 
                              fill="#d1d5db" 
                              opacity={0.3}
                              name="Volume"
                            />
                          )}
                        </RechartsLineChart>
                      ) : chartType === 'area' ? (
                        <RechartsAreaChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis 
                            dataKey={resolution === 'D' || resolution === 'W' || resolution === 'M' ? 'date' : 'time'}
                            stroke="#6b7280"
                            fontSize={12}
                          />
                          <YAxis 
                            yAxisId="price"
                            stroke="#6b7280"
                            fontSize={12}
                            domain={['auto', 'auto']}
                          />
                          {showVolume && (
                            <YAxis 
                              yAxisId="volume"
                              orientation="right"
                              stroke="#9ca3af"
                              fontSize={12}
                            />
                          )}
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'white', 
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              fontSize: '12px'
                            }}
                            formatter={(value: any, name: string) => {
                              if (name === 'volume') {
                                return [value.toLocaleString(), 'Volume']
                              }
                              return [`$${Number(value).toFixed(2)}`, name.charAt(0).toUpperCase() + name.slice(1)]
                            }}
                          />
                          <Legend />
                          <Area 
                            yAxisId="price"
                            type="monotone" 
                            dataKey="close" 
                            stroke="#10b981" 
                            fill="#10b981"
                            fillOpacity={0.2}
                            strokeWidth={2}
                            name="Close"
                          />
                          {showVolume && (
                            <Bar 
                              yAxisId="volume"
                              dataKey="volume" 
                              fill="#d1d5db" 
                              opacity={0.3}
                              name="Volume"
                            />
                          )}
                        </RechartsAreaChart>
                      ) : chartType === 'ohlc' ? (
                        <ComposedChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis 
                            dataKey={resolution === 'D' || resolution === 'W' || resolution === 'M' ? 'date' : 'time'}
                            stroke="#6b7280"
                            fontSize={12}
                          />
                          <YAxis 
                            yAxisId="price"
                            stroke="#6b7280"
                            fontSize={12}
                            domain={['auto', 'auto']}
                          />
                          {showVolume && (
                            <YAxis 
                              yAxisId="volume"
                              orientation="right"
                              stroke="#9ca3af"
                              fontSize={12}
                            />
                          )}
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'white', 
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              fontSize: '12px'
                            }}
                            formatter={(value: any, name: string) => {
                              if (name === 'volume') {
                                return [value.toLocaleString(), 'Volume']
                              }
                              return [`$${Number(value).toFixed(2)}`, name.charAt(0).toUpperCase() + name.slice(1)]
                            }}
                          />
                          <Legend />
                          <Bar yAxisId="price" dataKey="high" fill="#10b981" name="High" />
                          <Bar yAxisId="price" dataKey="low" fill="#ef4444" name="Low" />
                          <Bar yAxisId="price" dataKey="open" fill="#3b82f6" name="Open" />
                          <Bar yAxisId="price" dataKey="close" fill="#10b981" name="Close" />
                          {showVolume && (
                            <Bar 
                              yAxisId="volume"
                              dataKey="volume" 
                              fill="#d1d5db" 
                              opacity={0.3}
                              name="Volume"
                            />
                          )}
                        </ComposedChart>
                      ) : chartType === 'candlestick' ? (
                        <ComposedChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis 
                            dataKey={resolution === 'D' || resolution === 'W' || resolution === 'M' ? 'date' : 'time'}
                            stroke="#6b7280"
                            fontSize={12}
                          />
                          <YAxis 
                            yAxisId="price"
                            stroke="#6b7280"
                            fontSize={12}
                            domain={['auto', 'auto']}
                          />
                          {showVolume && (
                            <YAxis 
                              yAxisId="volume"
                              orientation="right"
                              stroke="#9ca3af"
                              fontSize={12}
                            />
                          )}
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'white', 
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              fontSize: '12px'
                            }}
                            formatter={(value: any, name: string) => {
                              if (name === 'volume') {
                                return [value.toLocaleString(), 'Volume']
                              }
                              return [`$${Number(value).toFixed(2)}`, name.charAt(0).toUpperCase() + name.slice(1)]
                            }}
                          />
                          <Legend />
                          {/* Candlestick visualization: High-Low wicks and body bars */}
                          <Line yAxisId="price" type="monotone" dataKey="high" stroke="#6b7280" strokeWidth={1} dot={false} name="High" />
                          <Line yAxisId="price" type="monotone" dataKey="low" stroke="#6b7280" strokeWidth={1} dot={false} name="Low" />
                          {/* Up candles (green) */}
                          <Bar yAxisId="price" dataKey="upBody" fill="#10b981" name="Up" />
                          <Bar yAxisId="price" dataKey="upBodyLow" fill="#10b981" name="" />
                          {/* Down candles (red) */}
                          <Bar yAxisId="price" dataKey="downBody" fill="#ef4444" name="Down" />
                          <Bar yAxisId="price" dataKey="downBodyHigh" fill="#ef4444" name="" />
                          {showVolume && (
                            <Bar 
                              yAxisId="volume"
                              dataKey="volume" 
                              fill="#d1d5db" 
                              opacity={0.3}
                              name="Volume"
                            />
                          )}
                        </ComposedChart>
                      ) : chartType === 'composed' ? (
                        <ComposedChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis 
                            dataKey={resolution === 'D' || resolution === 'W' || resolution === 'M' ? 'date' : 'time'}
                            stroke="#6b7280"
                            fontSize={12}
                          />
                          <YAxis 
                            yAxisId="price"
                            stroke="#6b7280"
                            fontSize={12}
                            domain={['auto', 'auto']}
                          />
                          {showVolume && (
                            <YAxis 
                              yAxisId="volume"
                              orientation="right"
                              stroke="#9ca3af"
                              fontSize={12}
                            />
                          )}
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'white', 
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              fontSize: '12px'
                            }}
                            formatter={(value: any, name: string) => {
                              if (name === 'volume') {
                                return [value.toLocaleString(), 'Volume']
                              }
                              return [`$${Number(value).toFixed(2)}`, name.charAt(0).toUpperCase() + name.slice(1)]
                            }}
                          />
                          <Legend />
                          <Area 
                            yAxisId="price"
                            type="monotone" 
                            dataKey="close" 
                            fill="#10b981"
                            fillOpacity={0.2}
                            stroke="#10b981"
                            strokeWidth={2}
                            name="Close Price"
                          />
                          <Line 
                            yAxisId="price"
                            type="monotone" 
                            dataKey="high" 
                            stroke="#3b82f6" 
                            strokeWidth={1}
                            strokeDasharray="3 3"
                            dot={false}
                            name="High"
                          />
                          <Line 
                            yAxisId="price"
                            type="monotone" 
                            dataKey="low" 
                            stroke="#ef4444" 
                            strokeWidth={1}
                            strokeDasharray="3 3"
                            dot={false}
                            name="Low"
                          />
                          {showVolume && (
                            <Bar 
                              yAxisId="volume"
                              dataKey="volume" 
                              fill="#d1d5db" 
                              opacity={0.4}
                              name="Volume"
                            />
                          )}
                        </ComposedChart>
                      ) : chartType === 'scatter' ? (
                        <RechartsLineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis 
                            dataKey={resolution === 'D' || resolution === 'W' || resolution === 'M' ? 'date' : 'time'}
                            stroke="#6b7280"
                            fontSize={12}
                          />
                          <YAxis 
                            yAxisId="price"
                            stroke="#6b7280"
                            fontSize={12}
                            domain={['auto', 'auto']}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'white', 
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              fontSize: '12px'
                            }}
                            formatter={(value: any, name: string) => {
                              return [`$${Number(value).toFixed(2)}`, name.charAt(0).toUpperCase() + name.slice(1)]
                            }}
                          />
                          <Legend />
                          <Scatter 
                            yAxisId="price"
                            dataKey="close" 
                            fill="#10b981"
                            name="Close"
                          />
                          <Line 
                            yAxisId="price"
                            type="monotone" 
                            dataKey="close" 
                            stroke="#10b981" 
                            strokeWidth={1}
                            dot={false}
                            name="Trend"
                          />
                        </RechartsLineChart>
                      ) : (
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis 
                            dataKey={resolution === 'D' || resolution === 'W' || resolution === 'M' ? 'date' : 'time'}
                            stroke="#6b7280"
                            fontSize={12}
                          />
                          <YAxis 
                            yAxisId="price"
                            stroke="#6b7280"
                            fontSize={12}
                            domain={['auto', 'auto']}
                          />
                          {showVolume && (
                            <YAxis 
                              yAxisId="volume"
                              orientation="right"
                              stroke="#9ca3af"
                              fontSize={12}
                            />
                          )}
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'white', 
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              fontSize: '12px'
                            }}
                            formatter={(value: any, name: string) => {
                              if (name === 'volume') {
                                return [value.toLocaleString(), 'Volume']
                              }
                              if (name === 'high' || name === 'low' || name === 'open' || name === 'close') {
                                return [`$${Number(value).toFixed(2)}`, name.charAt(0).toUpperCase() + name.slice(1)]
                              }
                              return [value, name]
                            }}
                          />
                          <Legend />
                          <Bar yAxisId="price" dataKey="high" fill="#10b981" name="High" />
                          <Bar yAxisId="price" dataKey="low" fill="#ef4444" name="Low" />
                          <Bar yAxisId="price" dataKey="open" fill="#3b82f6" name="Open" />
                          <Bar yAxisId="price" dataKey="close" fill="#10b981" name="Close" />
                          {showVolume && (
                            <Bar 
                              yAxisId="volume"
                              dataKey="volume" 
                              fill="#d1d5db" 
                              opacity={0.3}
                              name="Volume"
                            />
                          )}
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}

            {/* Metrics */}
            {metrics && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg lg:text-xl font-semibold text-gray-800 flex items-center gap-2">
                    <Activity size={20} className="text-emerald-500" />
                    Fundamental Metrics
                  </h3>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={fetchProperAnalysis}
                      disabled={agenticAnalysisLoading}
                      className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-xl text-sm lg:text-base font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm shadow-purple-500/30"
                    >
                      {agenticAnalysisLoading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Brain size={16} />
                          Proper Analysis
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {metrics.pe_ratio && (
                    <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl">
                      <p className="text-xs lg:text-sm text-gray-600 mb-1">P/E Ratio</p>
                      <p className="text-xl lg:text-2xl font-bold text-gray-900">{metrics.pe_ratio.toFixed(2)}</p>
                    </div>
                  )}
                  {metrics.eps && (
                    <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl">
                      <p className="text-xs lg:text-sm text-gray-600 mb-1">EPS</p>
                      <p className="text-xl lg:text-2xl font-bold text-gray-900">${metrics.eps.toFixed(2)}</p>
                    </div>
                  )}
                  {metrics.market_cap && (
                    <div className="p-4 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl">
                      <p className="text-xs lg:text-sm text-gray-600 mb-1">Market Cap</p>
                      <p className="text-xl lg:text-2xl font-bold text-gray-900">{formatNumber(metrics.market_cap)}</p>
                    </div>
                  )}
                  {metrics.dividend_yield && (
                    <div className="p-4 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl">
                      <p className="text-xs lg:text-sm text-gray-600 mb-1">Dividend Yield</p>
                      <p className="text-xl lg:text-2xl font-bold text-gray-900">{(metrics.dividend_yield * 100).toFixed(2)}%</p>
                    </div>
                  )}
                  {metrics.profit_margin && (
                    <div className="p-4 bg-gradient-to-br from-teal-50 to-green-50 rounded-xl">
                      <p className="text-xs lg:text-sm text-gray-600 mb-1">Profit Margin</p>
                      <p className="text-xl lg:text-2xl font-bold text-gray-900">{(metrics.profit_margin * 100).toFixed(2)}%</p>
                    </div>
                  )}
                  {metrics.revenue_growth && (
                    <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl">
                      <p className="text-xs lg:text-sm text-gray-600 mb-1">Revenue Growth</p>
                      <p className="text-xl lg:text-2xl font-bold text-gray-900">{(metrics.revenue_growth * 100).toFixed(2)}%</p>
                    </div>
                  )}
                  {metrics.price_to_book && (
                    <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl">
                      <p className="text-xs lg:text-sm text-gray-600 mb-1">Price to Book</p>
                      <p className="text-xl lg:text-2xl font-bold text-gray-900">{metrics.price_to_book.toFixed(2)}</p>
                    </div>
                  )}
                  {metrics.debt_to_equity && (
                    <div className="p-4 bg-gradient-to-br from-teal-50 to-green-50 rounded-xl">
                      <p className="text-xs lg:text-sm text-gray-600 mb-1">Debt to Equity</p>
                      <p className="text-xl lg:text-2xl font-bold text-gray-900">{metrics.debt_to_equity.toFixed(2)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Agentic AI Analysis Section */}
            {agenticAnalysis !== null && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                    <Brain size={18} className="text-white" />
                  </div>
                  <h3 className="text-lg lg:text-xl font-semibold text-gray-800">AI Agentic Deep Analysis</h3>
                </div>

                {agenticAnalysisLoading ? (
                  <div className="text-center py-8">
                    <Loader2 size={32} className="animate-spin text-purple-500 mx-auto mb-4" />
                    <p className="text-gray-600 lg:text-lg font-medium mb-2">AI agent is analyzing {currentSymbol}...</p>
                    {agenticAnalysisStatus && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mt-4 max-w-md mx-auto">
                        <p className="text-sm text-purple-700 animate-pulse">{agenticAnalysisStatus}</p>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-4">This may take 30-60 seconds as the AI fetches real-time data</p>
                  </div>
                ) : agenticAnalysis ? (
                  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200">
                    <div className="prose prose-sm max-w-none">
                      <p className="text-sm lg:text-base text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {agenticAnalysis}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* Company Comparison Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center shadow-sm">
                  <GitCompare size={18} className="text-white" />
                </div>
                <h3 className="text-lg lg:text-xl font-semibold text-gray-800">Compare Companies</h3>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">First Company (current)</label>
                    <input
                      type="text"
                      value={currentSymbol}
                      readOnly
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Second Company</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={compareSymbol2}
                        onChange={(e) => handleSymbol2Change(e.target.value)}
                        onFocus={() => compareSymbol2.trim() && setShowSymbol2Suggestions(symbol2Suggestions.length > 0)}
                        placeholder="e.g., MSFT"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {showSymbol2Suggestions && (
                        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 z-10 max-h-48 overflow-y-auto">
                          {symbol2Suggestions.map((suggestion) => (
                            <button
                              key={suggestion.symbol}
                              onClick={() => selectSymbol2(suggestion.symbol)}
                              className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
                            >
                              <div className="font-medium text-gray-900">{suggestion.symbol}</div>
                              <div className="text-xs text-gray-500">{suggestion.description}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={fetchComparison}
                  disabled={comparisonLoading || !compareSymbol2.trim()}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm shadow-blue-500/30"
                >
                  {comparisonLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Comparing...
                    </>
                  ) : (
                    <>
                      <GitCompare size={18} />
                      Compare Companies
                    </>
                  )}
                </button>
              </div>

              {comparisonLoading && (
                <div className="mt-6 text-center py-8 bg-blue-50 rounded-xl border border-blue-200">
                  <Loader2 size={32} className="animate-spin text-blue-500 mx-auto mb-4" />
                  <p className="text-gray-600 lg:text-lg font-medium mb-2">
                    Comparing {compareSymbol1.toUpperCase()} vs {compareSymbol2.toUpperCase()}...
                  </p>
                  {comparisonStatus && (
                    <div className="bg-white border border-blue-200 rounded-lg p-4 mt-4 max-w-md mx-auto">
                      <p className="text-sm text-blue-700 animate-pulse">{comparisonStatus}</p>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-4">This may take 30-60 seconds as the AI fetches data for both companies</p>
                </div>
              )}

              {showComparison && comparisonResult && !comparisonLoading && (
                <div className="mt-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
                  <div className="flex items-center gap-2 mb-4">
                    <GitCompare size={18} className="text-blue-600" />
                    <h4 className="text-base lg:text-lg font-semibold text-gray-800">
                      {compareSymbol1.toUpperCase()} vs {compareSymbol2.toUpperCase()}
                    </h4>
                  </div>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-sm lg:text-base text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {comparisonResult}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Company Analysis Section */}
            {showAnalysis && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-sm">
                    <Building2 size={18} className="text-white" />
                  </div>
                  <h3 className="text-lg lg:text-xl font-semibold text-gray-800">Quick Company Analysis</h3>
                </div>

                {analysisLoading ? (
                  <div className="text-center py-8">
                    <Loader2 size={32} className="animate-spin text-emerald-500 mx-auto mb-4" />
                    <p className="text-gray-600 lg:text-lg">Analyzing company fundamentals...</p>
                  </div>
                ) : companyAnalysis ? (
                  <div className="space-y-6">
                    {/* Health Score */}
                    {companyAnalysis.health_score !== undefined && (
                      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm lg:text-base font-semibold text-gray-700">Financial Health Score</span>
                          <span className="text-2xl lg:text-3xl font-bold text-emerald-700">
                            {(companyAnalysis.health_score * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 mt-3">
                          <div
                            className={`h-3 rounded-full transition-all ${
                              companyAnalysis.health_score >= 0.7
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-600'
                                : companyAnalysis.health_score >= 0.5
                                ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
                                : 'bg-gradient-to-r from-red-400 to-red-600'
                            }`}
                            style={{ width: `${companyAnalysis.health_score * 100}%` }}
                          />
                        </div>
                        <p className="text-xs lg:text-sm text-gray-600 mt-2">
                          {companyAnalysis.health_score >= 0.7
                            ? 'Strong financial health'
                            : companyAnalysis.health_score >= 0.5
                            ? 'Moderate financial health'
                            : 'Weak financial health'}
                        </p>
                      </div>
                    )}

                    {/* AI Summary */}
                    {companyAnalysis.ai_summary && (
                      <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border border-gray-200">
                        <div className="flex items-center gap-2 mb-3">
                          <Sparkles size={18} className="text-emerald-500" />
                          <h4 className="text-base lg:text-lg font-semibold text-gray-800">AI Analysis Summary</h4>
                        </div>
                        <p className="text-sm lg:text-base text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {companyAnalysis.ai_summary}
                        </p>
                      </div>
                    )}

                    {/* Company Info */}
                    {(companyAnalysis.name || companyAnalysis.sector || companyAnalysis.industry) && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {companyAnalysis.name && (
                          <div className="p-4 bg-gray-50 rounded-xl">
                            <p className="text-xs lg:text-sm text-gray-500 mb-1">Company Name</p>
                            <p className="text-sm lg:text-base font-semibold text-gray-900">{companyAnalysis.name}</p>
                          </div>
                        )}
                        {companyAnalysis.sector && (
                          <div className="p-4 bg-gray-50 rounded-xl">
                            <p className="text-xs lg:text-sm text-gray-500 mb-1">Sector</p>
                            <p className="text-sm lg:text-base font-semibold text-gray-900">{companyAnalysis.sector}</p>
                          </div>
                        )}
                        {companyAnalysis.industry && (
                          <div className="p-4 bg-gray-50 rounded-xl">
                            <p className="text-xs lg:text-sm text-gray-500 mb-1">Industry</p>
                            <p className="text-sm lg:text-base font-semibold text-gray-900">{companyAnalysis.industry}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm lg:text-base">Click "Company Analysis" button above to get AI-powered analysis</p>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <Search size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Search for a stock</h3>
            <p className="text-gray-600">Enter a stock symbol above to view details</p>
          </div>
        )}
      </div>
    </div>
  )
}

