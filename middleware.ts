import { NextResponse, type NextRequest } from 'next/server';
import { AUTH_COOKIE, SESSION_COOKIE, decideHostRequest, publicHost } from './app/lib/personalHost.mjs';

const PROTECTED_PREFIXES = [
  '/research',
  '/dashboard',
  '/globe',
  '/connectors',
  '/objects',
  '/profile',
  '/billing',
  '/new-project',
  '/project',
];

function hasSession(request: NextRequest): boolean {
  if (request.cookies.get(AUTH_COOKIE)?.value === '1') return true;
  return Boolean(request.cookies.get(SESSION_COOKIE)?.value);
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hostHeader = publicHost(request.headers.get('host'), request.headers.get('x-forwarded-host'));
  const decision = decideHostRequest({
    hostHeader,
    pathname,
    search,
    protocol: request.nextUrl.protocol,
    sessionCookie: request.cookies.get(SESSION_COOKIE)?.value || '',
  });

  if (decision.action === 'redirect' && decision.url) {
    return NextResponse.redirect(decision.url, decision.status);
  }

  if (decision.action === 'rewrite' && decision.slug) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    url.searchParams.set('slug', decision.slug);
    return NextResponse.rewrite(url);
  }

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

  if (needsAuth && !hasSession(request)) {
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
    '/',
    '/login',
    '/login/:path*',
    '/auth/:path*',
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
    '/project/:path*',
    '/project',
  ],
};
