
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  // Read token and admin status from cookies set during login
  const token = request.cookies.get('authToken')?.value;
  const isAdminCookie = request.cookies.get('isAdmin')?.value;
  const isAdmin = isAdminCookie === 'true'; // Convert cookie value to boolean

  const { pathname } = request.nextUrl;
  console.log(`[Middleware] Path: ${pathname}, Token: ${token ? 'Present' : 'Absent'}, IsAdminCookie: ${isAdminCookie}, IsAdmin: ${isAdmin}`);

  // Define public routes that don't require authentication
  const publicRoutes = ['/login']; // Add any other public routes like /register, /forgot-password, etc.

  // Define admin routes
  const adminRoutes = ['/admin', '/admin/dashboard', '/admin/users']; // Ensure '/admin' itself is included if it's a valid route

  // Check if the current path is a public route
  const isPublicRoute = publicRoutes.some(route => pathname === route);
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));

  // === Handling Public Routes (like /login) ===
  if (isPublicRoute) {
    // If logged in (has token) and trying to access a public route like /login:
    if (token) {
      // Redirect logged-in users away from login page based on their role
      const redirectUrl = isAdmin ? '/admin/dashboard' : '/dashboard';
      console.log(`[Middleware] User is logged in (isAdmin=${isAdmin}) and accessing public route ${pathname}. Redirecting to ${redirectUrl}.`);
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }
    // Otherwise (not logged in), allow access to the public route
    console.log(`[Middleware] User is not logged in. Allowing access to public route ${pathname}.`);
    return NextResponse.next();
  }

  // === Handling Non-Public Routes ===

  // If accessing a non-public route and there's NO token, redirect to login
  if (!token) {
    console.log(`[Middleware] No token found for accessing protected route ${pathname}. Redirecting to login.`);
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectedFrom', pathname); // Optional: pass original path
    return NextResponse.redirect(loginUrl);
  }

  // --- At this point, the user has a token and is accessing a protected route ---

  // Protect Admin Routes: Redirect non-admins trying to access admin routes
  if (isAdminRoute && !isAdmin) {
    console.log(`[Middleware] Non-admin user (isAdmin=${isAdmin}) attempting to access ADMIN route ${pathname}. Redirecting to /dashboard.`);
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Redirect Admins from Regular User Dashboard: If an admin lands on /dashboard, send them to /admin/dashboard
  if (pathname === '/dashboard' && isAdmin) {
    console.log(`[Middleware] ADMIN user (isAdmin=${isAdmin}) accessing USER dashboard ${pathname}. Redirecting to /admin/dashboard.`);
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  // Redirect Regular Users from Admin Routes (redundant with isAdminRoute check, but safe)
  // This case might be hit if an admin somehow gets demoted while having an admin URL open
  if (isAdminRoute && !isAdmin) {
    console.log(`[Middleware] Double-check: Non-admin user somehow past initial check for admin route ${pathname}. Redirecting to /dashboard.`);
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }


  // If none of the above conditions caused a redirect, allow access
  console.log(`[Middleware] Allowing access for user (isAdmin=${isAdmin}) to protected route ${pathname}.`);
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