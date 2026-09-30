import { NextResponse } from 'next/server';

function sessionToken(request: Request): string {
  const header = request.headers.get('authorization') || '';
  if (header.toLowerCase().startsWith('bearer ')) return header.slice(7).trim();
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.split(';').map((p) => p.trim()).find((p) => p.startsWith('analyzeit_session='));
  return match ? decodeURIComponent(match.slice('analyzeit_session='.length)) : '';
}

async function forward(request: Request, path: string[]) {
  const token = sessionToken(request);
  if (!token) {
    return NextResponse.json({ detail: 'Sign in required' }, { status: 401 });
  }
  const internal = process.env.INTERNAL_API_KEY || '';
  if (!internal) {
    return NextResponse.json({ detail: 'INTERNAL_API_KEY is not set on the frontend server' }, { status: 503 });
  }
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const who = await fetch(`${base}/v1/admin/whoami`, { headers: { Authorization: `Bearer ${token}` } });
  const whoBody = await who.json().catch(() => ({}));
  if (!who.ok || !whoBody.is_admin) {
    return NextResponse.json({ detail: 'This account is not on the admin allowlist' }, { status: 403 });
  }
  const url = new URL(request.url);
  const target = `${base}/internal/admin/${path.join('/')}${url.search}`;
  const init: RequestInit = {
    method: request.method,
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Key': internal,
      'X-Operator': String(whoBody.email || 'ops-console'),
    },
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.text();
  }
  const upstream = await fetch(target, init);
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('content-type') || 'application/json' },
  });
}

export async function GET(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return forward(request, path);
}

export async function POST(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return forward(request, path);
}
