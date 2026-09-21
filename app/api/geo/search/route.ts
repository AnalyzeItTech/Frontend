import { NextResponse } from 'next/server';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:8000').replace(
  /\/$/,
  '',
);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q') || '';
  const limit = url.searchParams.get('limit') || '8';
  try {
    const upstream = await fetch(
      `${API_BASE}/v1/geo/search?q=${encodeURIComponent(q)}&limit=${encodeURIComponent(limit)}`,
      { headers: { Accept: 'application/json' }, cache: 'no-store' },
    );
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { 'Content-Type': upstream.headers.get('content-type') || 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Upstream unreachable';
    return NextResponse.json({ detail: `Place search proxy failed: ${msg}` }, { status: 502 });
  }
}
