import { NextResponse } from 'next/server';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:8000').replace(
  /\/$/,
  '',
);

/** Same-origin proxy — browser never talks to Render directly (avoids CORS / Load failed). */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${API_BASE}/v1/geo/context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const text = await upstream.text();
    const contentType = upstream.headers.get('content-type') || 'application/json';
    return new NextResponse(text, {
      status: upstream.status,
      headers: { 'Content-Type': contentType },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Upstream unreachable';
    return NextResponse.json({ detail: `Place context proxy failed: ${msg}` }, { status: 502 });
  }
}
