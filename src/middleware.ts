import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // List of paths that require API key authentication
  const protectedPaths = [
    '/api/messages/send-template',
    '/api/messages/send-bulk',
    '/api/messages/send-private',
  ];

  if (protectedPaths.some(path => pathname.startsWith(path))) {
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new NextResponse(
        JSON.stringify({ success: false, error: 'Unauthorized: Missing or invalid token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.split(' ')[1];

    try {
      // Verify the JWT
      jwt.verify(token, JWT_SECRET);
      // The token is valid, so we can proceed.
      // We could also decode and add the payload to the request headers if needed.
      return NextResponse.next();

    } catch (error) {
      // The token is invalid (expired, wrong signature, etc.)
      console.error('JWT Verification Error:', error);
      return new NextResponse(
        JSON.stringify({ success: false, error: 'Unauthorized: Invalid token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // For all other paths, do nothing
  return NextResponse.next();
}
