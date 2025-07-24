import { auth } from '@/lib/auth';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  
  // Allow access to auth pages and API routes
  if (
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/'
  ) {
    return;
  }

  // Redirect to signin if not authenticated
  if (!req.auth) {
    return Response.redirect(new URL('/auth/signin', req.url));
  }
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};