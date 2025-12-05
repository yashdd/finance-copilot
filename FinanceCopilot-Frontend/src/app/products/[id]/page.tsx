'use client'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Package, DollarSign, AlertTriangle } from 'lucide-react'

// Mock product details
const productDetails: Record<string, { name: string; price: number; description: string; features: string[] }> = {
  '1': {
    name: 'Premium Stock Analysis',
    price: 99,
    description: 'Get comprehensive stock analysis with AI-powered insights and detailed financial metrics.',
    features: ['Real-time data', 'AI insights', 'Historical analysis', 'Risk assessment']
  },
  '2': {
    name: 'AI Investment Advisor',
    price: 149,
    description: 'Personalized investment recommendations powered by advanced AI algorithms.',
    features: ['Portfolio optimization', 'Risk management', 'Market predictions', '24/7 support']
  },
  '3': {
    name: 'Real-time Market Data',
    price: 79,
    description: 'Access live market data with instant updates and comprehensive coverage.',
    features: ['Live prices', 'Volume data', 'Market trends', 'API access']
  },
  '4': {
    name: 'Portfolio Tracker Pro',
    price: 59,
    description: 'Track and manage your investment portfolio with advanced analytics.',
    features: ['Multi-asset tracking', 'Performance metrics', 'Tax reporting', 'Mobile app']
  },
  
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const productId = params.id as string
  
  // Function to trigger an error (for testing)
  const triggerError = () => {
    throw new Error('Error triggered by button click! This demonstrates error.tsx handling.')
  }
  
  // Simulate an error for demonstration (e.g., when ID is 'error')
  if (productId === 'error') {
    throw new Error('Simulated error: This is a test error to demonstrate error.tsx!')
  }

  // Simulate API error for certain IDs
  if (productId === 'api-error') {
    throw new Error('Failed to fetch product data from API')
  }
  
  const product = productDetails[productId]

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50/30 to-teal-50/30 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center max-w-md">
          <Package size={48} className="mx-auto mb-4 text-gray-300" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Product Not Found</h2>
          <p className="text-gray-600 mb-6">Product ID: {productId}</p>
          <button
            onClick={() => router.push('/products')}
            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-medium transition-all"
          >
            Back to Products
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50/30 to-teal-50/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Back Button */}
        <Link
          href="/products"
          className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 mb-6 transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="font-medium">Back to Products</span>
        </Link>

        {/* Product Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                <Package size={32} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                  {product.name}
                </h1>
                <div className="flex items-center gap-2">
                  <DollarSign size={20} className="text-emerald-600" />
                  <span className="text-2xl lg:text-3xl font-bold text-emerald-600">
                    ${product.price}
                  </span>
                </div>
              </div>
            </div>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium">
              Product ID: {productId}
            </span>
          </div>

          {/* Description */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Description</h2>
            <p className="text-gray-600 lg:text-lg leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* Features */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Features</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {product.features.map((feature, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg border border-emerald-100"
                >
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <span className="text-gray-700 font-medium">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Dynamic Route Info */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">📚 Next.js Routing Concept:</h3>
            <p className="text-xs text-gray-600 mb-2">
              This is a <strong>Dynamic Route</strong> using <code className="bg-gray-200 px-1 rounded">[id]</code>
            </p>
            <p className="text-xs text-gray-600 mb-2">
              File path: <code className="bg-gray-200 px-1 rounded">/app/products/[id]/page.tsx</code>
            </p>
            <p className="text-xs text-gray-600">
              URL: <code className="bg-gray-200 px-1 rounded">/products/{productId}</code>
            </p>
            <p className="text-xs text-gray-600 mt-2">
              Access params with: <code className="bg-gray-200 px-1 rounded">useParams()</code> hook
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <button className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-medium transition-all shadow-sm shadow-emerald-500/30">
              Add to Cart
            </button>
            <Link
              href={`/products/${productId}/reviews`}
              className="px-6 py-3 border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 rounded-xl font-medium transition-all text-center"
            >
              View Reviews (100)
            </Link>
            <button
              onClick={() => router.push('/products')}
              className="px-6 py-3 border-2 border-gray-200 hover:border-emerald-500 text-gray-700 hover:text-emerald-600 rounded-xl font-medium transition-all"
            >
              Browse More Products
            </button>
          </div>

          {/* Error Testing Section */}
          <div className="mt-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <h3 className="text-sm font-semibold text-yellow-800 mb-2">🧪 Test Error Handling:</h3>
            <p className="text-xs text-yellow-700 mb-3">
              Try visiting these URLs to see error.tsx in action:
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              <Link
                href="/products/error"
                className="px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-lg text-xs font-medium hover:bg-yellow-200 transition-colors"
              >
                /products/error
              </Link>
              <Link
                href="/products/api-error"
                className="px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-lg text-xs font-medium hover:bg-yellow-200 transition-colors"
              >
                /products/api-error
              </Link>
            </div>
            <p className="text-xs text-yellow-600 mb-2">
              Or click the button below to trigger an error:
            </p>
            <button
              onClick={triggerError}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors flex items-center gap-2"
            >
              <AlertTriangle size={14} />
              Trigger Error
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

