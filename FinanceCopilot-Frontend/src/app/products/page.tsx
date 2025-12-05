'use client'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Package, ArrowRight, Search } from 'lucide-react'
import Loading from './loading'

// Mock products data
const mockProducts = [
  { id: 1, name: 'Premium Stock Analysis', price: 99, category: 'analysis' },
  { id: 2, name: 'AI Investment Advisor', price: 149, category: 'ai' },
  { id: 3, name: 'Real-time Market Data', price: 79, category: 'data' },
  { id: 4, name: 'Portfolio Tracker Pro', price: 59, category: 'tracking' },
  { id: 5, name: 'Advanced Charting Tools', price: 129, category: 'tools' },
]

export default function ProductsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  
  // Simulate 3 second loading delay
  useEffect(() => {
    // STEP 1: This runs FIRST when component mounts
    // Set a timeout to hide loading after 3 seconds
    const timer = setTimeout(() => {
      // STEP 2: This runs AFTER 3 seconds (only if component still mounted)
      console.log('⏰ Timeout completed - hiding loading')
      setIsLoading(false)
    }, 3000)

    // STEP 3: Cleanup function - This ALWAYS runs when component unmounts
    // This happens when you navigate to another page, even if timeout hasn't completed
    return () => {
      console.log('🧹 Cleanup running - clearing timeout (navigated away)')
      clearTimeout(timer) // Prevents setIsLoading from running after component is gone
    }
  }, []) // Empty array means: run once on mount, cleanup on unmount
  
  // Get query parameters
  const category = searchParams.get('category')
  const search = searchParams.get('search')
  
  // Filter products based on query params
  const filteredProducts = mockProducts.filter(product => {
    if (category && product.category !== category) return false
    if (search && !product.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // Function to update URL with query params (without page reload)
  const updateQuery = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`/products?${params.toString()}`)
  }

  // Show loading state - use the loading.tsx component
  if (isLoading) {
    return <Loading />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50/30 to-teal-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
            Products
          </h1>
          <p className="text-gray-600 lg:text-lg">
            Practice Next.js Routing Concepts
          </p>
        </div>

        {/* Routing Examples Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Next.js Routing Concepts Demonstrated:</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-4 bg-emerald-50 rounded-lg">
              <strong className="text-emerald-700">1. Static Routes:</strong>
              <p className="text-gray-600 mt-1">/products (this page)</p>
            </div>
            <div className="p-4 bg-teal-50 rounded-lg">
              <strong className="text-teal-700">2. Dynamic Routes:</strong>
              <p className="text-gray-600 mt-1">/products/[id] - Click any product</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <strong className="text-green-700">3. Query Parameters:</strong>
              <p className="text-gray-600 mt-1">?category=ai&search=analysis</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-lg">
              <strong className="text-emerald-700">4. Programmatic Navigation:</strong>
              <p className="text-gray-600 mt-1">Using router.push() and Link</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Filters (Query Parameters)</h3>
          
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search products..."
                value={search || ''}
                onChange={(e) => updateQuery('search', e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => updateQuery('category', '')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                !category
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {['analysis', 'ai', 'data', 'tracking', 'tools'].map((cat) => (
              <button
                key={cat}
                onClick={() => updateQuery('category', cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                  category === cat
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Current URL Display */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Current URL:</p>
            <code className="text-xs text-emerald-600 break-all">
              /products{category ? `?category=${category}` : ''}{search ? `${category ? '&' : '?'}search=${search}` : ''}
            </code>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-emerald-300 transition-all duration-200 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                  <Package size={24} className="text-white" />
                </div>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium capitalize">
                  {product.category}
                </span>
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors">
                {product.name}
              </h3>
              
              <div className="flex items-center justify-between mt-4">
                <span className="text-2xl font-bold text-gray-900">
                  ${product.price}
                </span>
                <div className="flex items-center gap-2 text-emerald-600 group-hover:gap-3 transition-all">
                  <span className="text-sm font-medium">View Details</span>
                  <ArrowRight size={18} />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <Package size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No products found</h3>
            <p className="text-gray-600">Try adjusting your filters</p>
          </div>
        )}

        {/* Navigation Examples */}
        <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Navigation Examples:</h3>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/products/1"
              className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-200 transition-colors"
            >
              Link to Product #1
            </Link>
            <button
              onClick={() => router.push('/products/2')}
              className="px-4 py-2 bg-teal-100 text-teal-700 rounded-lg text-sm font-medium hover:bg-teal-200 transition-colors"
            >
              router.push() to Product #2
            </button>
            <button
              onClick={() => router.replace('/products?category=ai')}
              className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors"
            >
              router.replace() with query
            </button>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              router.back()
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
