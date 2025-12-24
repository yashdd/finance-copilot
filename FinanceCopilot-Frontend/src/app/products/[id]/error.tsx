'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to console or error reporting service
    console.error('Product detail page error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50/30 to-teal-50/30 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12 text-center max-w-md mx-4">
        {/* Error Icon */}
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={32} className="text-red-600" />
        </div>

        {/* Error Message */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Something went wrong!
        </h2>
        <p className="text-gray-600 mb-1">
          {error.message || 'An unexpected error occurred'}
        </p>
        
        {/* Error Details (only in development) */}
        {process.env.NODE_ENV === 'development' && error.digest && (
          <p className="text-xs text-gray-400 mt-2 mb-4">
            Error ID: {error.digest}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <button
            onClick={reset}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-sm shadow-emerald-500/30"
          >
            <RefreshCw size={18} />
            Try Again
          </button>
          <Link
            href="/products"
            className="flex-1 px-6 py-3 border-2 border-gray-200 hover:border-emerald-500 text-gray-700 hover:text-emerald-600 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft size={18} />
            Back to Products
          </Link>
        </div>

        {/* Error Boundary Info */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200 text-left">
          <h3 className="text-xs font-semibold text-gray-700 mb-2">📚 Next.js Error Handling:</h3>
          <p className="text-xs text-gray-600 mb-1">
            This is an <strong>Error Boundary</strong> using <code className="bg-gray-200 px-1 rounded">error.tsx</code>
          </p>
          <p className="text-xs text-gray-600 mb-1">
            File: <code className="bg-gray-200 px-1 rounded">/app/products/[id]/error.tsx</code>
          </p>
          <p className="text-xs text-gray-600">
            Catches errors from this route segment and its children
          </p>
        </div>
      </div>
    </div>
  )
}
