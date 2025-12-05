'use client'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react'
import { API_BASE } from '@/lib/api-config'

interface WatchlistItem {
  symbol: string
  name: string
  current_price?: number
  change_percent?: number
  added_at: string
}

export function Watchlist() {
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newSymbol, setNewSymbol] = useState('')
  const [newName, setNewName] = useState('')

  const fetchWatchlist = async () => {
    try {
      const res = await axios.get(`${API_BASE}/watchlist/all`)
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

  useEffect(() => {
    fetchWatchlist()
    const interval = setInterval(fetchWatchlist, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [])

  const addToWatchlist = async () => {
    if (!newSymbol.trim()) return
    try {
      await axios.post(`${API_BASE}/watchlist/add`, {
        symbol: newSymbol.toUpperCase(),
        name: newName || newSymbol.toUpperCase()
      })
      setNewSymbol('')
      setNewName('')
      fetchWatchlist()
    } catch (error) {
      console.error('Error adding to watchlist:', error)
    }
  }

  const removeFromWatchlist = async (symbol: string) => {
    try {
      await axios.delete(`${API_BASE}/watchlist/remove/${symbol}`)
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
        <input
          type="text"
          value={newSymbol}
          onChange={(e) => setNewSymbol(e.target.value)}
          placeholder="Symbol (e.g., AAPL)"
          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
          onKeyPress={(e) => e.key === 'Enter' && addToWatchlist()}
        />
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

