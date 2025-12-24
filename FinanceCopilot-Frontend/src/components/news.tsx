'use client'
import { useState, useEffect } from 'react'
import apiClient from '@/lib/api-client'
import { Newspaper, ExternalLink, Clock, ArrowRight } from 'lucide-react'
import Link from 'next/link'

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

interface WatchlistItem {
  symbol: string
  name: string
  current_price?: number
  change_percent?: number
  added_at: string
}

export function News() {
  const [activeTab, setActiveTab] = useState<'latest' | 'watchlist'>('latest')
  const [latestNews, setLatestNews] = useState<NewsItem[]>([])
  const [watchlistNews, setWatchlistNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLatestNews = async () => {
    try {
      console.log('Fetching latest finance news')
      const res = await apiClient.get('/news/general?category=finance', {
        timeout: 10000
      })
      console.log('Latest news response:', res.data)
      setLatestNews((res.data || []).slice(0, 5)) // Limit to 5 items
    } catch (error: any) {
      console.error('Error fetching latest news:', error)
      setLatestNews([])
    }
  }

  const fetchWatchlistNews = async () => {
    try {
      // First, fetch watchlist
      const watchlistRes = await apiClient.get('/watchlist/all')
      const watchlist: WatchlistItem[] = watchlistRes.data || []

      // If watchlist is empty, set empty array
      if (watchlist.length === 0) {
        setWatchlistNews([])
        return
      }

      // Fetch company news for each item in watchlist (using both symbol and name)
      console.log('Fetching watchlist news for items:', watchlist.map(item => ({ symbol: item.symbol, name: item.name })))
      
      const newsPromises = watchlist.map(item => {
        // Try symbol first, then fallback to company name if symbol fails
        const symbolPromise = apiClient.get(`/news/company/${item.symbol}`, {
          timeout: 8000
        }).catch(err => {
          console.warn(`Failed to fetch news for symbol ${item.symbol}:`, err)
          return null // Return null to indicate failure
        })
        
        // If symbol fails and we have a company name, try searching by name
        return symbolPromise.then(result => {
          if (result && result.data && result.data.length > 0) {
            return result
          } else if (item.name && item.name.trim()) {
            // Fallback to company name search
            return apiClient.get(`/news/company-name/${encodeURIComponent(item.name)}`, {
              timeout: 8000
            }).catch(err => {
              console.warn(`Failed to fetch news for company name ${item.name}:`, err)
              return { data: [] } // Return empty array on error
            })
          } else {
            return { data: [] } // Return empty array if no name available
          }
        }).catch(err => {
          console.warn(`Failed to fetch news for ${item.symbol}/${item.name}:`, err)
          return { data: [] } // Return empty array on error
        })
      })

      const newsResults = await Promise.all(newsPromises)
      
      // Combine all news items and deduplicate by URL
      const allNews: NewsItem[] = []
      const seenUrls = new Set<string>()
      
      newsResults.forEach((result, index) => {
        const item = watchlist[index]
        const newsItems: NewsItem[] = result.data || []
        
        newsItems.forEach(newsItem => {
          // Deduplicate by URL
          if (!seenUrls.has(newsItem.url)) {
            seenUrls.add(newsItem.url)
            allNews.push(newsItem)
          }
        })
      })

      // Sort by published_at (most recent first) and limit to 5
      const sortedNews = allNews
        .sort((a, b) => b.published_at - a.published_at)
        .slice(0, 5)

      console.log('Watchlist news response:', sortedNews)
      setWatchlistNews(sortedNews)
    } catch (error: any) {
      console.error('Error fetching watchlist news:', error)
      setWatchlistNews([])
    }
  }

  const fetchAllNews = async () => {
    setLoading(true)
    setError(null)
    try {
      await Promise.all([fetchLatestNews(), fetchWatchlistNews()])
    } catch (error: any) {
      if (error.response) {
        setError(error.response.data?.detail || `Error: ${error.response.status}`)
      } else if (error.code === 'ECONNABORTED') {
        setError('Request timeout - backend may be slow')
      } else if (error.request) {
        setError('Cannot connect to backend')
      } else {
        setError('Failed to load news')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllNews()
    const interval = setInterval(fetchAllNews, 15 * 60 * 1000) // Refresh every 15 minutes
    return () => clearInterval(interval)
  }, [])

  // Refresh watchlist news when switching to watchlist tab
  useEffect(() => {
    if (activeTab === 'watchlist') {
      fetchWatchlistNews()
    }
  }, [activeTab])

  // Get current news based on active tab
  const currentNews = activeTab === 'latest' ? latestNews : watchlistNews

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return 'Just now'
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-sm">
            <Newspaper size={16} className="text-white" />
          </div>
          <h2 className="text-sm lg:text-base font-semibold text-gray-800">News</h2>
        </div>
        <Link
          href="/news"
          className="text-xs lg:text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 transition-colors"
        >
          View All
          <ArrowRight size={12} />
        </Link>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 mb-3 flex-shrink-0">
        <button
          onClick={() => setActiveTab('latest')}
          className={`flex-1 px-3 py-1.5 rounded-lg text-xs lg:text-sm font-medium transition-all ${
            activeTab === 'latest'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/30'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Latest
        </button>
        <button
          onClick={() => setActiveTab('watchlist')}
          className={`flex-1 px-3 py-1.5 rounded-lg text-xs lg:text-sm font-medium transition-all ${
            activeTab === 'watchlist'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/30'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Watchlist
        </button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto min-h-0">
        {loading ? (
          <div className="text-center py-4 text-gray-400 text-xs lg:text-sm">
            Loading news...
          </div>
        ) : error ? (
          <div className="text-center py-4">
            <p className="text-xs lg:text-sm text-red-600 font-medium mb-1">Warning: {error}</p>
            <p className="text-xs lg:text-sm text-red-500">Check if backend is running</p>
          </div>
        ) : currentNews.length === 0 ? (
          <div className="text-center py-4 text-gray-400 text-xs lg:text-sm">
            {activeTab === 'watchlist' 
              ? 'No watchlist news available. Add stocks to your watchlist to see related news.'
              : 'No news available'}
          </div>
        ) : (
          currentNews.map((item, idx) => (
            <a
              key={idx}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-2 bg-gray-50 rounded-lg hover:bg-gray-100 hover:shadow-sm transition-all duration-200 border border-gray-100 group"
            >
              <h3 className="font-medium text-gray-900 text-xs lg:text-sm line-clamp-2 group-hover:text-emerald-600 transition-colors mb-1">
                {item.title}
              </h3>
              <div className="flex items-center gap-2 text-xs lg:text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock size={10} />
                  {formatTime(item.published_at)}
                </span>
                <span className="text-gray-400">•</span>
                <span className="truncate">{item.source}</span>
              </div>
              {item.related_symbols && item.related_symbols.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {item.related_symbols.slice(0, 3).map((sym, i) => (
                    <span
                      key={i}
                      className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-medium"
                    >
                      {sym}
                    </span>
                  ))}
                </div>
              )}
            </a>
          ))
        )}
      </div>
    </div>
  )
}

