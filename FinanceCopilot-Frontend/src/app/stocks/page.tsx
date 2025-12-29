import { Suspense } from 'react'
import StocksClient from './stocks-client'

export default function StocksPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50/30 to-teal-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading stocks...</p>
        </div>
      </div>
    }>
      <StocksClient />
    </Suspense>
  )
}

