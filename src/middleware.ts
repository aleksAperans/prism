import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Temporarily disable auth middleware for debugging
export function middleware(request: NextRequest) {
  console.log('🔍 Middleware Debug - Request Path:', request.nextUrl.pathname);
  
  // Allow all requests for now while debugging auth
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};