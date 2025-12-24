'use client'
import { Heart } from 'lucide-react'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Developed with passion by</span>
            <span className="font-semibold text-emerald-600"><a href="https://www.linkedin.com/in/yash-deshpande5//" target="_blank" rel="noopener noreferrer">Yash Deshpande</a></span>
          </div>
          <div className="text-sm text-gray-500">
            © {currentYear} FinanceCopilot. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  )
}

