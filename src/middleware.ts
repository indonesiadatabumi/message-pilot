import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
    // Try reading token and admin status from cookies first, then fallback to headers/storage simulation
    const token = request.cookies.get('authToken')?.value || request.headers.get('Authorization')?.split(' ')[1];
    // For simulation, we might need to rely on client-side checks post-login or pass flags differently.
    // Middleware runs server-side and doesn't have direct access to localStorage.
    // Let's assume the login process sets a specific cookie or a claim in a real JWT for admin status.
    // For this simulation, we'll rely on the redirect logic within the login form itself
    // and protect the /admin routes here, assuming only admins should get there.

    const { pathname } = request.nextUrl;

    // Define public routes that don't require authentication
    const publicRoutes = ['/login']; // Add any other public routes like /register, /forgot-password, etc.

    // Define admin routes
    const adminRoutes = ['/admin', '/admin/dashboard', '/admin/users'];

    // Check if the current path is a public route
    const isPublicRoute = publicRoutes.some(route => pathname === route);
    const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));

    // If accessing a public route, allow access regardless of token status
    if (isPublicRoute) {
        // If logged in (has token) and trying to access login, redirect to dashboard (or admin dashboard if applicable)
        if (token) {
            // In a real app, decode JWT here to check role
            // For simulation, we can't easily know the role here without more complex state/cookie management.
            // Let's redirect all logged-in users trying to access /login to the general dashboard.
            // The login form itself will handle the initial redirect to /admin if the user is admin.
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

    // --- Admin Route Protection (Simulation) ---
    // If accessing an admin route, we need to verify if the user is an admin.
    // Since middleware can't easily access localStorage set by the client,
    // a real implementation would rely on:
    // 1. A specific cookie set during admin login.
    // 2. A role claim within the JWT token.
    // For simulation, we'll redirect away from /admin if a hypothetical 'isAdmin' cookie isn't set.
    const isAdmin = request.cookies.get('isAdmin')?.value === 'true';

    if (isAdminRoute && !isAdmin) {
        console.log('Middleware: Non-admin user attempting to access admin route. Redirecting to /dashboard.');
        // Redirect non-admins trying to access admin routes to the main dashboard
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // If token exists and accessing a non-public, non-admin route (or is admin accessing admin route), allow
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
