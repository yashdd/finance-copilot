'use client'
import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { Sparkles, Loader2, AlertCircle } from 'lucide-react'
import { API_BASE } from '@/lib/api-config'

interface Insight {
  symbol: string
  summary: string
  generated_at: string
  key_points?: string[]
}

interface SymbolSuggestion {
  symbol: string
  description: string
  type?: string
  displaySymbol?: string
}

export function Insights() {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(false)
  const [symbol, setSymbol] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<SymbolSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const searchSymbols = async (query: string) => {
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
    } catch (error) {
      console.error('Error searching symbols:', error)
      setSuggestions([])
      setShowSuggestions(false)
    } finally {
      setSearching(false)
    }
  }

  const handleSymbolChange = (value: string) => {
    setSymbol(value)
    setError(null)
    
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

  const selectSuggestion = (selectedSymbol: string) => {
    setSymbol(selectedSymbol)
    setShowSuggestions(false)
    inputRef.current?.blur()
  }

  const fetchInsight = async () => {
    if (!symbol.trim()) {
      setError('Please enter a stock symbol')
      return
    }
    
    setLoading(true)
    setError(null)
    setShowSuggestions(false)
    
    try {
      const res = await axios.get(`${API_BASE}/insights/${symbol.toUpperCase()}`)
      const newInsight = res.data
      const symbolUpper = symbol.toUpperCase()
      
      // Replace existing insight for same symbol, or add new one
      setInsights(prevInsights => {
        // Remove existing insight for this symbol
        const filtered = prevInsights.filter(insight => insight.symbol !== symbolUpper)
        // Add new insight at the beginning, keep max 5 insights
        return [newInsight, ...filtered].slice(0, 5)
      })
      setSymbol('') // Clear input after successful fetch
    } catch (error: any) {
      console.error('Error fetching insights:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to fetch insights'
      
      // Check if it's an invalid symbol error
      if (errorMessage.toLowerCase().includes('invalid') || 
          errorMessage.toLowerCase().includes('not found') ||
          errorMessage.toLowerCase().includes('no quote data')) {
        setError(`Invalid symbol "${symbol.toUpperCase()}". Please enter a valid stock symbol (e.g., AAPL, MSFT, TSLA).`)
      } else {
        setError(`Error: ${errorMessage}`)
      }
    } finally {
      setLoading(false)
    }
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-green-500 rounded-lg flex items-center justify-center shadow-sm">
          <Sparkles size={16} className="text-white" />
        </div>
        <h2 className="text-xl lg:text-2xl font-semibold text-gray-800">AI Insights</h2>
      </div>

      <div className="mb-3 relative flex-shrink-0">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={symbol}
              onChange={(e) => handleSymbolChange(e.target.value)}
              onFocus={() => symbol.trim().length > 0 && suggestions.length > 0 && setShowSuggestions(true)}
              placeholder="Enter symbol"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-xs lg:text-sm uppercase"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  if (showSuggestions && suggestions.length > 0) {
                    selectSuggestion(suggestions[0].displaySymbol || suggestions[0].symbol)
                  } else {
                    fetchInsight()
                  }
                }
              }}
            />
            
            {/* Suggestions Dropdown */}
            {showSuggestions && (suggestions.length > 0 || searching) && (
              <div
                ref={suggestionsRef}
                className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto"
              >
                {searching ? (
                  <div className="px-3 py-2 text-center text-xs lg:text-sm text-gray-500">
                    <Loader2 size={14} className="animate-spin inline-block mr-2" />
                    Searching...
                  </div>
                ) : (
                  suggestions.map((stock) => (
                    <button
                      key={stock.symbol}
                      onClick={() => selectSuggestion(stock.displaySymbol || stock.symbol)}
                      className="w-full px-3 py-2 text-left hover:bg-emerald-50 transition-colors text-xs lg:text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <span className="font-semibold text-gray-900">{stock.displaySymbol || stock.symbol}</span>
                          {stock.description && (
                            <span className="text-xs lg:text-sm text-gray-500 ml-2 truncate block">{stock.description}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <button
            onClick={fetchInsight}
            disabled={loading || !symbol.trim()}
            className="px-3 py-2 bg-gradient-to-r from-emerald-400 to-green-500 hover:from-emerald-500 hover:to-green-600 text-white rounded-lg text-xs lg:text-sm font-medium transition-all disabled:opacity-50 shadow-sm"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : 'Go'}
          </button>
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="mt-2 flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle size={14} className="text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs lg:text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto min-h-0">
        {insights.length === 0 && !loading ? (
          <div className="text-center py-6 text-gray-400 text-xs lg:text-sm">
            Enter a symbol and click "Go" for AI insights
          </div>
        ) : (
          insights.map((insight, idx) => (
            <div
              key={idx}
              className="p-3 bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg border border-emerald-200"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="font-bold text-emerald-700 text-xs lg:text-sm px-2 py-0.5 bg-white rounded">
                  {insight.symbol}
                </span>
                <span className="text-xs lg:text-sm text-gray-500">
                  {new Date(insight.generated_at).toLocaleTimeString()}
                </span>
              </div>
              {insight.key_points && insight.key_points.length > 0 && (
                <div className="space-y-1">
                  {insight.key_points.slice(0, 3).map((point, i) => (
                    <div key={i} className="text-xs lg:text-sm text-gray-700 flex items-start gap-1.5">
                      <div className="w-1 h-1 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0"></div>
                      <span className="leading-relaxed">{point}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

