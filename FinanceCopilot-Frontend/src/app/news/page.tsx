'use client'
import { useState, useEffect, useRef } from 'react'
import apiClient from '@/lib/api-client'
import { Newspaper, ExternalLink, Clock, Search, Filter, Loader2 } from 'lucide-react'
import { API_BASE } from '@/lib/api-config'

interface NewsItem {
  id?: number
  title: string
  source: string
  url: string
  summary?: string
  image?: string
  published_at: number
  related_symbols?: string[]
}

interface SymbolSuggestion {
  symbol: string
  description: string
  type?: string
  displaySymbol?: string
}

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'general' | 'company'>('general')
  const [symbol, setSymbol] = useState('AAPL')
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<SymbolSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searching, setSearching] = useState(false)
  const symbolInputRef = useRef<HTMLInputElement>(null)
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
    setSymbol(value)
    
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
    const selectedSymbol = suggestion.displaySymbol || suggestion.symbol
    setSymbol(selectedSymbol)
    setShowSuggestions(false)
    symbolInputRef.current?.blur()
    // Fetch news for the selected symbol
    if (filter === 'company') {
      fetchNews(selectedSymbol)
    }
  }

  const fetchNews = async (symbolToFetch?: string) => {
    const symbolToUse = symbolToFetch || symbol
    setLoading(true)
    try {
      let res
      if (filter === 'company') {
        res = await apiClient.get(`/news/company/${symbolToUse.toUpperCase()}`)
      } else {
        res = await apiClient.get('/news/general?category=finance')
      }
      setNews(res.data)
    } catch (error) {
      console.error('Error fetching news:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNews()
    const interval = setInterval(() => fetchNews(), 15 * 60 * 1000) // Refresh every 15 minutes
    return () => clearInterval(interval)
  }, [filter, symbol])

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

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return 'Just now'
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  const filteredNews = news.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.source.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50/30 to-teal-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
            Financial News
          </h1>
          <p className="text-sm sm:text-base lg:text-lg text-gray-600">
            Stay updated with the latest market news and insights
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Filter Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('general')}
                className={`px-4 py-2 rounded-xl text-sm lg:text-base font-medium transition-all ${
                  filter === 'general'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/30'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                General News
              </button>
              <button
                onClick={() => setFilter('company')}
                className={`px-4 py-2 rounded-xl text-sm lg:text-base font-medium transition-all ${
                  filter === 'company'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/30'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Company News
              </button>
            </div>

            {/* Symbol Input for Company News */}
            {filter === 'company' && (
              <div className="flex-1 relative">
                <input
                  ref={symbolInputRef}
                  type="text"
                  value={symbol}
                  onChange={(e) => handleSymbolChange(e.target.value)}
                  onFocus={() => symbol.trim().length > 0 && suggestions.length > 0 && setShowSuggestions(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (showSuggestions && suggestions.length > 0) {
                        selectSuggestion(suggestions[0])
                      } else {
                        fetchNews()
                      }
                    } else if (e.key === 'Escape') {
                      setShowSuggestions(false)
                    }
                  }}
                  placeholder="Symbol (e.g., AAPL)"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm lg:text-base"
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
            )}

            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search news..."
                className="w-full pl-12 pr-4 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm lg:text-base"
              />
            </div>
          </div>
        </div>

        {/* News List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-gray-600 lg:text-lg">Loading news...</p>
          </div>
        ) : filteredNews.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <Newspaper size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl lg:text-2xl font-semibold text-gray-800 mb-2">No news found</h3>
            <p className="text-gray-600 lg:text-lg">Try adjusting your filters or search query</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredNews.map((item, idx) => (
              <a
                key={idx}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-200 group"
              >
                {item.image && (
                  <div className="w-full h-48 bg-gray-100 rounded-xl mb-4 overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                )}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-semibold text-gray-900 text-base lg:text-lg line-clamp-2 group-hover:text-emerald-600 transition-colors flex-1">
                    {item.title}
                  </h3>
                  <ExternalLink size={16} className="text-gray-400 flex-shrink-0 mt-1" />
                </div>
                {item.summary && (
                  <p className="text-sm lg:text-base text-gray-600 mb-4 line-clamp-3">
                    {item.summary}
                  </p>
                )}
                <div className="flex items-center justify-between text-xs lg:text-sm text-gray-500 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <Clock size={12} />
                    <span>{formatTime(item.published_at)}</span>
                  </div>
                  <span className="font-medium">{item.source}</span>
                </div>
                {item.related_symbols && item.related_symbols.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.related_symbols.slice(0, 3).map((sym, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs lg:text-sm font-medium"
                      >
                        {sym}
                      </span>
                    ))}
                  </div>
                )}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

