'use client'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { ArrowLeft, Star, Calendar, MessageSquare, ThumbsUp } from 'lucide-react'

// Generate mock review data
const getReviewData = (productId: string, reviewId: string) => {
  const names = ['John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Williams', 'David Brown', 'Emily Davis', 'Chris Wilson', 'Lisa Anderson', 'Tom Taylor', 'Amy Martinez']
  const comments = [
    'Great product! Highly recommend.',
    'Excellent quality and fast delivery.',
    'Not bad, but could be better.',
    'Amazing value for money!',
    'Good product, meets expectations.',
    'Outstanding service and product quality.',
    'Satisfied with my purchase.',
    'Could use some improvements.',
    'Perfect for my needs!',
    'Very happy with this product.'
  ]

  const reviewNum = parseInt(reviewId)
  const rating = 3 + (reviewNum % 3) // 3-5 stars
  const nameIndex = reviewNum % names.length
  const commentIndex = reviewNum % comments.length

  return {
    id: reviewNum,
    productId: productId,
    author: names[nameIndex],
    rating: rating,
    comment: comments[commentIndex],
    date: new Date(2024, reviewNum % 12, (reviewNum % 28) + 1).toLocaleDateString(),
    helpful: Math.floor(reviewNum * 1.5),
    verified: reviewNum % 3 === 0, // Every 3rd review is verified
    helpfulCount: Math.floor(reviewNum * 2.3)
  }
}

export default function ReviewDetailPage() {
  const router = useRouter()
  const pathname = usePathname()
  
  // Extract IDs directly from pathname - most reliable method
  // Pathname format: /products/[productId]/reviews/[reviewId]
  // Example: /products/3/reviews/9
  const pathParts = pathname ? pathname.split('/').filter(Boolean) : []
  
  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log('Review Page - Pathname:', pathname)
    console.log('Review Page - Path parts:', pathParts)
  }
  
  const productId = pathParts[1] || '1' // Index 1 = productId
  const reviewIdStr = pathParts[3] || '1' // Index 3 = reviewId  
  const reviewIdNum = parseInt(reviewIdStr) || 1
  
  // Early return if pathname not ready or invalid structure
  if (!pathname || pathParts.length < 4 || pathParts[0] !== 'products' || pathParts[2] !== 'reviews') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50/30 to-teal-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading review...</p>
          {process.env.NODE_ENV === 'development' && (
            <p className="text-xs text-gray-400 mt-2">Pathname: {pathname || 'not available'}</p>
          )}
        </div>
      </div>
    )
  }

  // Validate review ID (1-100)
  if (isNaN(reviewIdNum) || reviewIdNum < 1 || reviewIdNum > 100) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50/30 to-teal-50/30 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center max-w-md">
          <MessageSquare size={48} className="mx-auto mb-4 text-gray-300" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Not Found</h2>
          <p className="text-gray-600 mb-6">Review ID must be between 1 and 100</p>
          <Link
            href={`/products/${productId}/reviews`}
            className="inline-block px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-medium transition-all"
          >
            Back to Reviews
          </Link>
        </div>
      </div>
    )
  }

  const review = getReviewData(productId, reviewIdNum.toString())

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50/30 to-teal-50/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Back Button */}
        <Link
          href={`/products/${productId}/reviews`}
          className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 mb-6 transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="font-medium">Back to Reviews</span>
        </Link>

        {/* Review Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6 pb-6 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {review.author.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">{review.author}</h1>
                  {review.verified && (
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium">
                      Verified
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar size={14} />
                    {review.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare size={14} />
                    Review #{review.id}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={24}
                    className={i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-600">{review.rating} out of 5</span>
            </div>
          </div>

          {/* Review Content */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Review</h2>
            <p className="text-gray-700 lg:text-lg leading-relaxed">
              {review.comment}
            </p>
          </div>

          {/* Helpful Section */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:border-emerald-500 hover:text-emerald-600 transition-all">
              <ThumbsUp size={18} />
              <span className="text-sm font-medium">Helpful</span>
            </button>
            <span className="text-sm text-gray-600">
              {review.helpfulCount} people found this review helpful
            </span>
          </div>

          {/* Navigation */}
          <div className="mt-8 pt-6 border-t border-gray-200 flex items-center justify-between">
            <Link
              href={`/products/${productId}/reviews/${Math.max(1, review.id - 1)}`}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ opacity: review.id === 1 ? 0.5 : 1 }}
            >
              ← Previous Review
            </Link>
            <span className="text-sm text-gray-500">
              Review {review.id} of 100
            </span>
            <Link
              href={`/products/${productId}/reviews/${Math.min(100, review.id + 1)}`}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ opacity: review.id === 100 ? 0.5 : 1 }}
            >
              Next Review →
            </Link>
          </div>

          {/* Route Info */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">📚 Next.js Nested Dynamic Routes:</h3>
            <p className="text-xs text-gray-600 mb-1">
              Route: <code className="bg-gray-200 px-1 rounded">/products/{productId}/reviews/{review.id}</code>
            </p>
            <p className="text-xs text-gray-600 mb-1">
              File: <code className="bg-gray-200 px-1 rounded">/app/products/[id]/reviews/[id]/page.tsx</code>
            </p>
            <p className="text-xs text-gray-600">
              Using useParams() to get reviewId, and pathname to get productId
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
