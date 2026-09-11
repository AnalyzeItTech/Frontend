import { NextResponse, type NextRequest } from 'next/server';

const AUTH_COOKIE = 'analyzeit_auth';

const PROTECTED_PREFIXES = [
  '/research',
  '/dashboard',
  '/globe',
  '/connectors',
  '/objects',
  '/profile',
  '/billing',
  '/new-project',
  '/home',
];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Case-sensitive legacy path only — avoids Vercel next.config case-insensitive loop.
  if (pathname === '/Dashboard' || pathname.startsWith('/Dashboard/')) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/Dashboard/, '/dashboard');
    return NextResponse.redirect(url);
  }


  const needsAuth = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`) ||
      pathname.toLowerCase() === prefix.toLowerCase() ||
      pathname.toLowerCase().startsWith(`${prefix.toLowerCase()}/`),
  );

  if (needsAuth && request.cookies.get(AUTH_COOKIE)?.value !== '1') {
    const login = request.nextUrl.clone();
    login.pathname = '/login';
    login.search = '';
    login.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/research/:path*',
    '/research',
    '/dashboard/:path*',
    '/dashboard',
    '/Dashboard/:path*',
    '/Dashboard',
    '/globe/:path*',
    '/globe',
    '/connectors/:path*',
    '/connectors',
    '/objects/:path*',
    '/objects',
    '/profile/:path*',
    '/profile',
    '/billing/:path*',
    '/billing',
    '/new-project/:path*',
    '/new-project',
    '/home/:path*',
    '/home',
  ],
};
