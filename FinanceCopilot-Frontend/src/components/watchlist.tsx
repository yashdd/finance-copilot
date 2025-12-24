'use client'
import { useState, useEffect, useRef } from 'react'
import apiClient from '@/lib/api-client'
import { Plus, Trash2, TrendingUp, TrendingDown, Loader2 } from 'lucide-react'

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

export function Watchlist() {
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newSymbol, setNewSymbol] = useState('')
  const [newName, setNewName] = useState('')
  const [suggestions, setSuggestions] = useState<SymbolSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searching, setSearching] = useState(false)
  const symbolInputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const fetchWatchlist = async () => {
    try {
      const res = await apiClient.get('/watchlist/all')
      setItems(res.data)
    } catch (error: any) {
      console.error('Error fetching watchlist:', error)
      if (error.response) {
        console.error('Response error:', error.response.status, error.response.data)
      } else if (error.request) {
        console.error('No response received. Is backend running?')
      } else {
        console.error('Error:', error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const searchSymbols = async (query: string) => {
    if (!query.trim() || query.length < 1) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    setSearching(true)
    try {
      const res = await apiClient.get('/stock/search', {
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
    setNewSymbol(value)
    
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

  useEffect(() => {
    fetchWatchlist()
    const interval = setInterval(fetchWatchlist, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        symbolInputRef.current &&
        !symbolInputRef.current.contains(event.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const addToWatchlist = async () => {
    if (!newSymbol.trim()) return
    try {
      await apiClient.post('/watchlist/add', {
        symbol: newSymbol.toUpperCase().trim(),
        name: newName.trim() || newSymbol.toUpperCase().trim()
      })
      setNewSymbol('')
      setNewName('')
      setSuggestions([])
      setShowSuggestions(false)
      fetchWatchlist()
    } catch (error) {
      console.error('Error adding to watchlist:', error)
    }
  }

  const removeFromWatchlist = async (symbol: string) => {
    try {
      await apiClient.delete(`/watchlist/remove/${symbol}`)
      fetchWatchlist()
    } catch (error) {
      console.error('Error removing from watchlist:', error)
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Watchlist</h2>
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-sm shadow-emerald-500/30">
          <TrendingUp size={18} className="text-white" />
        </div>
        <h2 className="text-base sm:text-lg font-semibold text-gray-800">Watchlist</h2>
      </div>

      <div className="mb-3 space-y-2">
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
            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
          />
          
          {/* Suggestions Dropdown */}
          {showSuggestions && (suggestions.length > 0 || searching) && (
            <div
              ref={suggestionsRef}
              className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto"
            >
              {searching ? (
                <div className="p-3 text-center text-gray-500 text-sm flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Searching...
                </div>
              ) : (
                suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectSuggestion(suggestion)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium text-gray-900 text-sm">
                      {suggestion.displaySymbol || suggestion.symbol}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {suggestion.description}
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
          placeholder="Company Name (optional)"
          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
          onKeyPress={(e) => e.key === 'Enter' && addToWatchlist()}
        />
        <button
          onClick={addToWatchlist}
          className="w-full px-4 py-2 sm:py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 shadow-sm shadow-emerald-500/30"
        >
          <Plus size={16} />
          Add Stock
        </button>
      </div>

      <div className="space-y-2 max-h-[300px] sm:max-h-[350px] overflow-y-auto">
        {items.length === 0 ? (
          <div className="text-center py-6 sm:py-8 text-gray-400 text-sm">
            No stocks in watchlist
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.symbol}
              className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl hover:shadow-md transition-all duration-200 border border-gray-100 group"
            >
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 text-sm">
                  {item.symbol}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {item.name}
                </div>
                {item.current_price && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-sm font-semibold text-gray-900">
                      ${item.current_price.toFixed(2)}
                    </span>
                    {item.change_percent !== undefined && (
                      <span
                        className={`text-xs font-medium flex items-center gap-1 px-2 py-0.5 rounded-full ${
                          item.change_percent >= 0
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {item.change_percent >= 0 ? (
                          <TrendingUp size={10} />
                        ) : (
                          <TrendingDown size={10} />
                        )}
                        {Math.abs(item.change_percent).toFixed(2)}%
                      </span>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => removeFromWatchlist(item.symbol)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

