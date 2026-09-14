import { NextResponse, type NextRequest } from 'next/server';

const AUTH_COOKIE = 'analyzeit_auth';
const APEX_HOSTS = new Set(['analyzeit.in', 'www.analyzeit.in', 'localhost', '127.0.0.1']);

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

function extractSubdomain(hostHeader: string | null): string | null {
  if (!hostHeader) return null;
  const host = hostHeader.split(':')[0].toLowerCase();
  if (APEX_HOSTS.has(host) || host.endsWith('.vercel.app') || host.endsWith('.localhost')) {
    // Allow local testing via foo.localhost
    if (host.endsWith('.localhost') && host !== 'localhost') {
      const sub = host.slice(0, -'.localhost'.length);
      if (sub && sub !== 'www') return sub;
    }
    return null;
  }
  if (host.endsWith('.analyzeit.in')) {
    const sub = host.slice(0, -'.analyzeit.in'.length);
    if (sub && sub !== 'www' && sub !== 'app' && !sub.includes('.')) return sub;
  }
  return null;
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const subdomain = extractSubdomain(request.headers.get('host'));

  // Personal dashboard bookmark: rewrite slug.analyzeit.in → /dashboard?slug=
  if (subdomain && (pathname === '/' || pathname === '/dashboard')) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    url.searchParams.set('slug', subdomain);
    const rewritten = NextResponse.rewrite(url);
    if (request.cookies.get(AUTH_COOKIE)?.value !== '1') {
      const login = request.nextUrl.clone();
      login.pathname = '/login';
      login.search = '';
      login.searchParams.set('next', `/dashboard?slug=${encodeURIComponent(subdomain)}`);
      return NextResponse.redirect(login);
    }
    return rewritten;
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
    '/',
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
