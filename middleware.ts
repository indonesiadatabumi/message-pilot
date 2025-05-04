import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  // Try reading token from cookie first, then fallback to Authorization header
  const token = request.cookies.get('authToken')?.value || request.headers.get('Authorization')?.split(' ')[1];

  const { pathname } = request.nextUrl;

  // Define public routes that don't require authentication
  const publicRoutes = ['/login']; // Add any other public routes like /register, /forgot-password, etc.

  // Check if the current path is a public route
  const isPublicRoute = publicRoutes.some(route => pathname === route);

  // If accessing a public route, allow access regardless of token status
  if (isPublicRoute) {
    // If logged in (has token) and trying to access login, redirect to dashboard
    if (token && pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    // Otherwise, allow access to the public route
    return NextResponse.next();
  }

  // If accessing a non-public route and there's no token, redirect to login
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectedFrom', pathname); // Optional: pass original path
    return NextResponse.redirect(loginUrl);
  }

  // If token exists and accessing a non-public route, allow the request to proceed
  return NextResponse.next();
}

// Configure the matcher to run middleware on specific paths
export const config = {
  /*
   * Match all request paths except for the ones starting with:
   * - api (API routes)
   * - _next/static (static files)
   * - _next/image (image optimization files)
   * - favicon.ico (favicon file)
   */
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}