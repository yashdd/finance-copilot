import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Next.js Middleware
 * Prevents authenticated users from accessing login/register pages
 * Redirects them to dashboard if they try to access auth pages
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Check if user is trying to access login or register pages
  const isAuthPage = pathname === '/login' || pathname === '/register'
  
  if (isAuthPage) {
    // Check if user has access token in cookies or headers
    // Note: In Next.js middleware, we check cookies since localStorage is client-side only
    const accessToken = request.cookies.get('access_token')?.value || 
                       request.headers.get('authorization')?.replace('Bearer ', '')
    
    // If token exists, user is authenticated - redirect to dashboard
    if (accessToken) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }
  
  return NextResponse.next()
}

// Configure which routes this middleware should run on
export const config = {
  matcher: ['/login', '/register']
}


