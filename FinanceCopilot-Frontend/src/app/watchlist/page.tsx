'use client'
import { useState, useEffect, useRef } from 'react'
import axios, { AxiosError, isAxiosError } from 'axios'
import { Plus, Trash2, TrendingUp, TrendingDown, Search, RefreshCw, Loader2, AlertCircle, CheckCircle2, Brain, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { API_BASE } from '@/lib/api-config'
import apiClient from '@/lib/api-client'

interface WatchlistItem {
  symbol: string
  name: string
  current_price?: number
  change_percent?: number
  added_at: string
}

interface SymbolSuggestion {
  symbol: string
  description: string
  type?: string
  displaySymbol?: string
}

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [newSymbol, setNewSymbol] = useState('')
  const [newName, setNewName] = useState('')
  const [suggestions, setSuggestions] = useState<SymbolSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const symbolInputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Watchlist analyzer states
  const [analyzerResult, setAnalyzerResult] = useState<string | null>(null)
  const [analyzerLoading, setAnalyzerLoading] = useState(false)
  const [analyzerStatus, setAnalyzerStatus] = useState<string>('')
  const [showAnalyzer, setShowAnalyzer] = useState(false)

  const fetchWatchlist = async (): Promise<void> => {
    try {
      const res = await apiClient.get('/watchlist/all')
      setItems(res.data)
    } catch (error: unknown) {
      const err = error as AxiosError
      console.error('Error fetching watchlist:', err)
      if (isAxiosError(err)) {
        if (err.response) {
          console.error('Response error:', err.response.status, err.response.data)
        } else if (err.request) {
          console.error('No response received. Is backend running?')
        } else {
          console.error('Error:', err.message)
        }
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchWatchlist()
    const interval = setInterval(fetchWatchlist, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [])

  const searchSymbols = async (query: string): Promise<void> => {
    if (!query.trim() || query.length < 1) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    setSearching(true)
    try {
      const res = await axios.get(`${API_BASE}/stock/search`, {
        params: { q: query, limit: 8 }
      })
      setSuggestions(res.data)
      setShowSuggestions(res.data.length > 0)
    } catch (error: unknown) {
      console.error('Error searching symbols:', error)
      setSuggestions([])
      setShowSuggestions(false)
    } finally {
      setSearching(false)
    }
  }

  const handleSymbolChange = (value: string) => {
    setNewSymbol(value)
    setError(null)
    setSuccess(null)
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    // Debounce API calls - wait 300ms after user stops typing
    if (value.trim().length >= 1) {
      searchTimeoutRef.current = setTimeout(() => {
        searchSymbols(value)
      }, 300)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  const selectSuggestion = (suggestion: SymbolSuggestion) => {
    const symbol = suggestion.displaySymbol || suggestion.symbol
    setNewSymbol(symbol)
    setNewName(suggestion.description || '')
    setShowSuggestions(false)
    symbolInputRef.current?.blur()
  }

  const addToWatchlist = async (): Promise<void> => {
    if (!newSymbol.trim()) {
      setError('Please enter a stock symbol')
      return
    }

    setError(null)
    setSuccess(null)
    setShowSuggestions(false)

    try {
      await apiClient.post('/watchlist/add', {
        symbol: newSymbol.toUpperCase().trim(),
        name: newName.trim() || newSymbol.toUpperCase().trim()
      })
      setSuccess(`${newSymbol.toUpperCase()} added to watchlist!`)
      setNewSymbol('')
      setNewName('')
      setSuggestions([])
      fetchWatchlist()
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
    } catch (error: unknown) {
      const err = error as AxiosError
      console.error('Error adding to watchlist:', err)
      const errorMessage = isAxiosError(err)
        ? err.response?.data?.detail || err.message || 'Failed to add stock to watchlist'
        : 'Failed to add stock to watchlist'
      setError(errorMessage)
      
      // Clear error message after 5 seconds
      setTimeout(() => setError(null), 5000)
    }
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        symbolInputRef.current &&
        !symbolInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const removeFromWatchlist = async (symbol: string): Promise<void> => {
    try {
      await apiClient.delete(`/watchlist/remove/${symbol}`)
      fetchWatchlist()
    } catch (error: unknown) {
      console.error('Error removing from watchlist:', error)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchWatchlist()
  }

  const fetchWatchlistAnalysis = async (): Promise<void> => {
    if (items.length === 0) return
    
    setAnalyzerLoading(true)
    setAnalyzerResult(null)
    setShowAnalyzer(true)
    
    const statusMessages = [
      'Initializing AI agent for watchlist analysis...',
      'Fetching watchlist data...',
      'Gathering real-time quotes for all stocks...',
      'Collecting fundamental metrics...',
      'Fetching recent news for watchlist stocks...',
      'Analyzing price trends...',
      'Comparing portfolio performance...',
      'Synthesizing comprehensive analysis...',
      'Finalizing insights and recommendations...'
    ]
    
    let statusIndex = 0
    const statusInterval = setInterval(() => {
      if (statusIndex < statusMessages.length) {
        setAnalyzerStatus(statusMessages[statusIndex])
        statusIndex++
      }
    }, 2000)
    
    try {
      const res = await apiClient.post('/watchlist/analyze', {}, {
        timeout: 60000 // 60 seconds for agentic operations
      })
      clearInterval(statusInterval)
      setAnalyzerStatus('Analysis complete!')
      setAnalyzerResult(res.data.analysis)
    } catch (error: unknown) {
      clearInterval(statusInterval)
      const err = error as AxiosError
      console.error('Error fetching watchlist analysis:', err)
      const errorMsg = isAxiosError(err)
        ? err.response?.data?.detail || err.message || 'Failed to generate analysis'
        : 'Failed to generate analysis'
      setAnalyzerStatus(`Error: ${errorMsg}`)
      setAnalyzerResult(`Error: ${errorMsg}`)
    } finally {
      setAnalyzerLoading(false)
      setTimeout(() => setAnalyzerStatus(''), 3000)
    }
  }

  const filteredItems = items

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50/30 to-teal-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading watchlist...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50/30 to-teal-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-1">
              My Watchlist
            </h1>
            <p className="text-sm lg:text-base text-gray-600">
              Track your favorite stocks
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-3 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all disabled:opacity-50"
          >
            <RefreshCw size={20} className={`text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Add Stock Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg lg:text-xl font-semibold text-gray-800 mb-4">Add Stock to Watchlist</h2>
          
          {/* Success Message */}
          {success && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-700">
              <CheckCircle2 size={18} />
              <span className="text-sm">{success}</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle size={18} />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Symbol Input with Suggestions */}
            <div className="relative">
              <input
                ref={symbolInputRef}
                type="text"
                value={newSymbol}
                onChange={(e) => handleSymbolChange(e.target.value)}
                onFocus={() => newSymbol.trim().length > 0 && suggestions.length > 0 && setShowSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (showSuggestions && suggestions.length > 0) {
                      selectSuggestion(suggestions[0])
                    } else {
                      addToWatchlist()
                    }
                  } else if (e.key === 'Escape') {
                    setShowSuggestions(false)
                  }
                }}
                placeholder="Symbol (e.g., AAPL)"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
              
              {/* Suggestions Dropdown */}
              {showSuggestions && (suggestions.length > 0 || searching) && (
                <div
                  ref={suggestionsRef}
                  className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                >
                  {searching ? (
                    <div className="px-3 py-2 text-center text-sm text-gray-500">
                      <Loader2 size={14} className="animate-spin inline-block mr-2" />
                      Searching...
                    </div>
                  ) : (
                    suggestions.map((stock) => (
                      <button
                        key={stock.symbol}
                        onClick={() => selectSuggestion(stock)}
                        className="w-full px-3 py-2 text-left hover:bg-emerald-50 transition-colors text-sm border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold text-gray-900 block truncate">
                              {stock.displaySymbol || stock.symbol}
                            </span>
                            {stock.description && (
                              <span className="text-xs text-gray-500 truncate block mt-0.5">
                                {stock.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Company Name (auto-filled)"
              className="px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              onKeyPress={(e) => e.key === 'Enter' && addToWatchlist()}
            />
            <button
              onClick={addToWatchlist}
              disabled={!newSymbol.trim()}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-sm shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={20} />
              Add Stock
            </button>
          </div>
        </div>

        {/* Watchlist Analyzer Button */}
        {items.length > 0 && (
          <div className="mb-6 flex justify-end">
            <button
              onClick={fetchWatchlistAnalysis}
              disabled={analyzerLoading || items.length === 0}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-xl font-medium transition-all flex items-center gap-2 shadow-sm shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {analyzerLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain size={18} />
                  AI Analyze Watchlist
                </>
              )}
            </button>
          </div>
        )}

        {/* Watchlist Analyzer Results */}
        {showAnalyzer && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                <Sparkles size={18} className="text-white" />
              </div>
              <h3 className="text-lg lg:text-xl font-semibold text-gray-800">AI Watchlist Analysis</h3>
            </div>

            {analyzerLoading ? (
              <div className="text-center py-8">
                <Loader2 size={32} className="animate-spin text-purple-500 mx-auto mb-4" />
                <p className="text-gray-600 lg:text-lg font-medium mb-2">
                  AI agent is analyzing your {items.length} stocks...
                </p>
                {analyzerStatus && (
                  <div className="bg-purple-50 rounded-lg p-4 mt-4 max-w-md mx-auto">
                    <p className="text-sm text-purple-700 animate-pulse">{analyzerStatus}</p>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-4">This may take 30-60 seconds as the AI analyzes each stock</p>
              </div>
            ) : analyzerResult ? (
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 space-y-4">
                {analyzerResult
                  .replace(/\*\*/g, '') // Remove ** markdown
                  .replace(/__/g, '') // Remove __ markdown
                  .split('\n\n')
                  .filter((section: string) => section.trim().length > 0) // Remove empty sections
                  .map((section: string, idx: number) => {
                    const trimmed = section.trim();
                    const isSectionHeader = /^[A-Z][A-Z\s&]+$/.test(trimmed.split('\n')[0]);
                    
                    if (isSectionHeader) {
                      const [header, ...content] = trimmed.split('\n');
                      const contentText = content.join('\n').trim();
                      return (
                        <div key={idx}>
                          <h3 className="font-semibold text-purple-900 text-lg mt-2 mb-2">{header}</h3>
                          {contentText && (
                            <p className="text-sm text-gray-700 leading-relaxed">{contentText}</p>
                          )}
                        </div>
                      );
                    }
                    return (
                      <p key={idx} className="text-sm text-gray-700 leading-relaxed">
                        {trimmed}
                      </p>
                    );
                  })}
              </div>
            ) : null}
          </div>
        )}

        {/* Watchlist Grid */}
        {items.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <TrendingUp size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl lg:text-2xl font-semibold text-gray-800 mb-2">Your watchlist is empty</h3>
            <p className="text-gray-600 lg:text-lg mb-6">Add stocks to track their prices and performance</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <Search size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No stocks found</h3>
            <p className="text-gray-600">Try adjusting your search query</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredItems.map((item) => (
              <Link
                key={item.symbol}
                href={`/stocks?symbol=${item.symbol}`}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-200 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl lg:text-2xl font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">
                      {item.symbol}
                    </h3>
                    <p className="text-sm lg:text-base text-gray-500 truncate">{item.name}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      removeFromWatchlist(item.symbol)
                    }}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                
                {item.current_price && (
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl lg:text-3xl font-bold text-gray-900">
                        ${item.current_price.toFixed(2)}
                      </span>
                      {item.change_percent !== undefined && (
                        <span
                          className={`text-sm lg:text-base font-semibold flex items-center gap-1 px-2 py-1 rounded-lg ${
                            item.change_percent >= 0
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {item.change_percent >= 0 ? (
                            <TrendingUp size={14} />
                          ) : (
                            <TrendingDown size={14} />
                          )}
                          {Math.abs(item.change_percent).toFixed(2)}%
                        </span>
                      )}
                    </div>
                    <p className="text-xs lg:text-sm text-gray-500">
                      Added {new Date(item.added_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

