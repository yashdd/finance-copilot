// API Configuration
// Must be set via NEXT_PUBLIC_API_BASE_URL environment variable
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL

if (!apiBaseUrl) {
  throw new Error('NEXT_PUBLIC_API_BASE_URL environment variable is not set. Please configure it in your .env.local file or deployment settings.')
}

export const API_BASE = apiBaseUrl

// Debug: Log the API base URL (only in development)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('🔗 API Base URL:', API_BASE)
}
