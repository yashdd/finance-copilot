'use client'
import { useState, useEffect } from 'react'
import apiClient from '@/lib/api-client'
import { TrendingUp, TrendingDown, ChevronRight, Plus, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { API_BASE } from '@/lib/api-config'

interface WatchlistItem {
  symbol: string
  name: string
  current_price?: number
  change_percent?: number
  added_at: string
}

export function WatchlistCarousel() {
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWatchlist = async () => {
    try {
      setError(null)
      console.log('Fetching watchlist from:', `${API_BASE}/watchlist/all`)
      const res = await apiClient.get('/watchlist/all')
      console.log('Watchlist response:', res.data)
      setItems(res.data || [])
    } catch (error: any) {
      console.error('Error fetching watchlist:', error)
      console.error('   URL attempted:', `${API_BASE}/watchlist/all`)
      if (error.response) {
        console.error('   Response status:', error.response.status)
        console.error('   Response data:', error.response.data)
      }
      if (error.code === 'ECONNABORTED') {
        setError('Request timeout - backend may be slow')
      } else if (error.request) {
        setError('Cannot connect to backend')
      } else {
        setError('Failed to load watchlist')
      }
      setItems([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWatchlist()
    const interval = setInterval(fetchWatchlist, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-sm">
              <TrendingUp size={18} className="text-white" />
            </div>
            <h2 className="text-xl lg:text-2xl font-semibold text-gray-800">My Watchlist</h2>
          </div>
        </div>
        <div className="h-24 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
        </div>
      </div>
    )
  }

  if (error) {
    // Extract port from API_BASE for error message
    const apiUrl = new URL(API_BASE)
    
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-sm">
              <TrendingUp size={18} className="text-white" />
            </div>
            <h2 className="text-xl lg:text-2xl font-semibold text-gray-800">My Watchlist</h2>
          </div>
        </div>
        <div className="h-24 bg-red-50 rounded-lg border border-red-200 flex items-center justify-center">
          <div className="text-center">
            <p className="text-xs lg:text-sm text-red-600 font-medium mb-1">Warning: {error}</p>
            <p className="text-xs lg:text-sm text-red-500">Check if backend is running on {apiUrl.host}</p>
          </div>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-sm">
              <TrendingUp size={18} className="text-white" />
            </div>
            <h2 className="text-xl lg:text-2xl font-semibold text-gray-800">My Watchlist</h2>
          </div>
        </div>
        <div className="h-24 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 rounded-lg border-2 border-dashed border-emerald-200 flex items-center justify-center group hover:border-emerald-300 hover:shadow-md transition-all duration-300">
          <Link 
            href="/watchlist" 
            className="flex items-center gap-3 px-6 py-3 text-emerald-700 hover:text-emerald-800 transition-all group"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-100 rounded-full blur-md opacity-50 group-hover:opacity-75 transition-opacity"></div>
              <div className="relative w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Plus size={20} className="text-white" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm lg:text-base">Add Stocks to Watchlist</span>
              <span className="text-xs lg:text-sm text-emerald-600 opacity-75">Start tracking your favorite stocks</span>
            </div>
            <ChevronRight size={18} className="text-emerald-600 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    )
  }

  // Show only first 5 items if <= 5, otherwise show all with animation
  const displayItems = items.length <= 5 ? items : [...items, ...items]
  const shouldAnimate = items.length > 5

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-sm">
              <TrendingUp size={18} className="text-white" />
            </div>
            <h2 className="text-xl lg:text-2xl font-semibold text-gray-800">My Watchlist</h2>
          </div>
        <Link
          href="/watchlist"
          className="text-xs lg:text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 transition-colors"
        >
          View All
          <ArrowRight size={12} />
        </Link>
      </div>

      {/* Stock Items */}
      <div className="relative h-36 overflow-x-auto overflow-y-hidden scrollbar-hide">
        <div className={`flex gap-3  ${shouldAnimate ? 'animate-scroll' : ''}`}>
          {displayItems.map((item, idx) => (
            <Link
              key={`${item.symbol}-${idx}`}
              href={`/stocks?symbol=${item.symbol}`}
              className="bg-white rounded-xl shadow-sm border border-gray-200 min-w-[160px] lg:min-w-[180px] h-36 hover:shadow-md hover:border-emerald-300 transition-all duration-200 group flex-shrink-0 p-4 flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-900 text-sm lg:text-base mb-0.5">{item.symbol}</div>
                  {item.name && (
                    <div className="text-xs text-gray-500 truncate">{item.name}</div>
                  )}
                </div>
                <ChevronRight size={14} className="text-gray-300 group-hover:text-emerald-600 transition-colors flex-shrink-0 ml-1" />
              </div>
              {item.current_price && (
                <div className="mt-2">
                  <div className="text-base lg:text-lg font-bold text-gray-900">
                    ${item.current_price.toFixed(2)}
                  </div>
                  {item.change_percent !== undefined && (
                    <div className="flex items-center gap-1 mt-1">
                      <span
                        className={`text-xs font-semibold flex items-center gap-0.5 px-1.5 py-0.5 rounded ${
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
                    </div>
                  )}
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

