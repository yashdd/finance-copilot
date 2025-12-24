'use client'
import { WatchlistCarousel } from '@/components/watchlist-carousel'
import { Insights } from '@/components/insights'
import { News } from '@/components/news'
import { Chat } from '@/components/chat'
import { ProtectedRoute } from '@/components/protected-route'
import { Tp } from './tp'

export default function Dashboard() {
  return (
    <ProtectedRoute>
    <div className="h-screen bg-gradient-to-br from-gray-50 via-emerald-50/30 to-teal-50/30 flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col lg:flex-row gap-3 sm:gap-4 p-3 sm:p-4 min-h-0">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col gap-4 sm:gap-5 min-h-0 min-w-0">
          {/* Watchlist Carousel */}
          <div className="flex-shrink-0">
            <WatchlistCarousel />
          </div>

          {/* Insights Section - Moved down with more spacing */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <Insights />
          </div>
        </div>

        {/* Sidebar - News */}
        <div className="w-full lg:w-80 xl:w-96 flex-shrink-0 min-h-0 overflow-hidden">
          <News />
        </div>
      </div>

      {/* Floating Chat Component */}
      <Chat />
      {/* <Tp /> */}
    </div>
    </ProtectedRoute>
  )
}
