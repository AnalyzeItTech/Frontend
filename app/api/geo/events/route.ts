import { NextResponse } from 'next/server';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:8000').replace(
  /\/$/,
  '',
);

/** Worldwide live overlays (earthquakes, …) for the Globe map. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const qs = url.searchParams.toString();
  try {
    const upstream = await fetch(`${API_BASE}/v1/geo/events${qs ? `?${qs}` : ''}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('content-type') || 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Upstream unreachable';
    return NextResponse.json({ detail: `Globe events proxy failed: ${msg}` }, { status: 502 });
  }
}
