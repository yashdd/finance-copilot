'use client'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { Search, TrendingUp, TrendingDown, Activity, BarChart3, LineChart, AreaChart, Filter, Building2, Sparkles, Loader2 } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { API_BASE } from '@/lib/api-config'
import { LineChart as RechartsLineChart, AreaChart as RechartsAreaChart, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, Area, Bar, Legend } from 'recharts'

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

type ChartType = 'line' | 'area' | 'candlestick'
type TimePeriod = '1D' | '5D' | '1M' | '3M' | '6M' | '1Y' | 'ALL'
type Resolution = '1' | '5' | '15' | '30' | '60' | 'D' | 'W' | 'M'

export default function StocksPage() {
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
  
  // Chart filters
  const [chartType, setChartType] = useState<ChartType>('line')
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('1M')
  const [resolution, setResolution] = useState<Resolution>('D')
  const [showVolume, setShowVolume] = useState(true)

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
        axios.get(`${API_BASE}/stock/quote/${currentSymbol.toUpperCase()}`),
        axios.get(`${API_BASE}/stock/metrics/${currentSymbol.toUpperCase()}`)
      ])
      setQuote(quoteRes.data)
      setMetrics(metricsRes.data)
    } catch (error) {
      console.error('Error fetching stock data:', error)
      setQuote(null)
      setMetrics(null)
    } finally {
      setLoading(false)
    }
  }

  const fetchCandleData = async () => {
    if (!currentSymbol.trim()) return
    setChartLoading(true)
    try {
      const days = getDaysFromPeriod(timePeriod)
      const res = await axios.get(`${API_BASE}/stock/candle/${currentSymbol.toUpperCase()}`, {
        params: {
          resolution: resolution,
          days: days
        }
      })
      setCandles(res.data || [])
    } catch (error) {
      console.error('Error fetching candle data:', error)
      setCandles([])
    } finally {
      setChartLoading(false)
    }
  }

  useEffect(() => {
    fetchStockData()
  }, [currentSymbol])

  useEffect(() => {
    fetchCandleData()
  }, [currentSymbol, timePeriod, resolution])

  // Format chart data
  const chartData = candles.map(candle => ({
    date: new Date(candle.timestamp * 1000).toLocaleDateString(),
    time: new Date(candle.timestamp * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    timestamp: candle.timestamp,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
    // For candlestick chart
    value: [candle.open, candle.close, candle.low, candle.high]
  }))

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

  const fetchCompanyAnalysis = async () => {
    if (!currentSymbol.trim()) return
    setAnalysisLoading(true)
    setShowAnalysis(true)
    try {
      const res = await axios.get(`${API_BASE}/company/analysis/${currentSymbol.toUpperCase()}`)
      setCompanyAnalysis(res.data)
    } catch (error) {
      console.error('Error fetching company analysis:', error)
      setCompanyAnalysis(null)
    } finally {
      setAnalysisLoading(false)
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
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="Enter stock symbol (e.g., AAPL)"
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
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
                    <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => setChartType('line')}
                        className={`px-3 py-1.5 rounded-md text-xs lg:text-sm font-medium transition-all ${
                          chartType === 'line'
                            ? 'bg-white text-emerald-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                        title="Line Chart"
                      >
                        <LineChart size={14} className="inline-block" />
                      </button>
                      <button
                        onClick={() => setChartType('area')}
                        className={`px-3 py-1.5 rounded-md text-xs lg:text-sm font-medium transition-all ${
                          chartType === 'area'
                            ? 'bg-white text-emerald-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                        title="Area Chart"
                      >
                        <AreaChart size={14} className="inline-block" />
                      </button>
                      <button
                        onClick={() => setChartType('candlestick')}
                        className={`px-3 py-1.5 rounded-md text-xs lg:text-sm font-medium transition-all ${
                          chartType === 'candlestick'
                            ? 'bg-white text-emerald-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                        title="Candlestick Chart"
                      >
                        <BarChart3 size={14} className="inline-block" />
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
                  <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
                    No chart data available
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
                  <button
                    onClick={fetchCompanyAnalysis}
                    disabled={analysisLoading}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-sm lg:text-base font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm shadow-emerald-500/30"
                  >
                    {analysisLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Building2 size={16} />
                        Company Analysis
                      </>
                    )}
                  </button>
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

            {/* Company Analysis Section */}
            {showAnalysis && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-sm">
                    <Building2 size={18} className="text-white" />
                  </div>
                  <h3 className="text-lg lg:text-xl font-semibold text-gray-800">AI Company Analysis</h3>
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

