import { NextResponse } from 'next/server';

const THEME = (process.env.LOCATIONIQ_THEME || 'streets').trim() || 'streets';
const SUBDOMAINS = ['a', 'b', 'c'] as const;

export async function GET(
  _request: Request,
  context: { params: Promise<{ z: string; x: string; y: string }> },
) {
  const key = (process.env.LOCATIONIQ_KEY || '').trim();
  if (!key) {
    return NextResponse.json({ error: 'LOCATIONIQ_KEY is not configured on the server' }, { status: 503 });
  }

  const { z, x, y } = await context.params;
  if (!/^\d+$/.test(z) || !/^\d+$/.test(x) || !/^\d+$/.test(y)) {
    return NextResponse.json({ error: 'Invalid tile coordinates' }, { status: 400 });
  }

  const zi = Number(z);
  const xi = Number(x);
  const yi = Number(y);
  if (zi < 0 || zi > 22 || xi < 0 || yi < 0) {
    return NextResponse.json({ error: 'Tile out of range' }, { status: 400 });
  }

  // Rotate subdomain for upstream parallelism (LocationIQ expects a|b|c)
  const sub = SUBDOMAINS[(xi + yi) % SUBDOMAINS.length];
  const upstream = `https://${sub}-tiles.locationiq.com/v3/${encodeURIComponent(THEME)}/r/${zi}/${xi}/${yi}.png?key=${encodeURIComponent(key)}`;

  try {
    const res = await fetch(upstream, {
      headers: { 'User-Agent': 'AnalyzeIt-MapProxy/1.0' },
      // Edge/runtime caching of successful tiles
      next: { revalidate: 86400 },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream tile error (${res.status})` },
        { status: res.status === 401 || res.status === 403 ? 502 : res.status },
      );
    }
    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'image/png',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch tile' }, { status: 502 });
  }
}
