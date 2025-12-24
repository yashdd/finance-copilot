'use client'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Star, User, Calendar, MessageSquare } from 'lucide-react'
import { useState, useMemo } from 'react'

// Generate mock reviews (1-100)
const generateMockReviews = (productId: string) => {
  const reviews = []
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

  for (let i = 1; i <= 100; i++) {
    const rating = Math.floor(Math.random() * 3) + 3 // 3-5 stars
    reviews.push({
      id: i,
      productId: productId,
      author: names[Math.floor(Math.random() * names.length)],
      rating: rating,
      comment: comments[Math.floor(Math.random() * comments.length)],
      date: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toLocaleDateString(),
      helpful: Math.floor(Math.random() * 50)
    })
  }
  return reviews
}

export default function ReviewsPage() {
  const params = useParams()
  const router = useRouter()
  const productId = params.id as string
  const [currentPage, setCurrentPage] = useState(1)
  const reviewsPerPage = 10

  const allReviews = useMemo(() => generateMockReviews(productId), [productId])
  
  // Pagination
  const totalPages = Math.ceil(allReviews.length / reviewsPerPage)
  const startIndex = (currentPage - 1) * reviewsPerPage
  const paginatedReviews = allReviews.slice(startIndex, startIndex + reviewsPerPage)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50/30 to-teal-50/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={`/products/${productId}`}
            className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 mb-4 transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="font-medium">Back to Product</span>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
                Product Reviews
              </h1>
              <p className="text-gray-600 lg:text-lg">
                {allReviews.length} total reviews
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Star className="text-yellow-400 fill-yellow-400" size={24} />
              <span className="text-2xl font-bold text-gray-900">
                {(allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length).toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Reviews List */}
        <div className="space-y-4 mb-6">
          {paginatedReviews.map((review) => (
            <Link
              key={review.id}
              href={`/products/${productId}/reviews/${review.id}`}
              className="block bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-emerald-300 transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {review.author.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{review.author}</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar size={12} />
                      <span>{review.date}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      className={i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                    />
                  ))}
                </div>
              </div>
              <p className="text-gray-700 mb-3 line-clamp-2">{review.comment}</p>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <MessageSquare size={12} />
                  Review #{review.id}
                </span>
                <span>{review.helpful} helpful</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Previous
            </button>
            
            <div className="flex items-center gap-1">
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      currentPage === pageNum
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm'
                        : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Next
            </button>
          </div>
        )}

        {/* Route Info */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">📚 Next.js Routing:</h3>
          <p className="text-xs text-gray-600 mb-1">
            Route: <code className="bg-gray-200 px-1 rounded">/products/{productId}/reviews</code>
          </p>
          <p className="text-xs text-gray-600">
            All 100 reviews are dynamically generated. Click any review to see detail page.
          </p>
        </div>
      </div>
    </div>
  )
}
