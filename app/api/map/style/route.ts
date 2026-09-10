import { NextResponse } from 'next/server';

/**
 * MapLibre style that points raster tiles at our proxy.
 * LOCATIONIQ_KEY never leaves the server (used only in /api/map/tiles).
 * Pass ?theme=dark|streets|light to match app theme.
 */
export async function GET(request: Request) {
  const key = (process.env.LOCATIONIQ_KEY || '').trim();
  if (!key) {
    return NextResponse.json({ error: 'LOCATIONIQ_KEY is not configured' }, { status: 503 });
  }

  const url = new URL(request.url);
  const themeRaw = (url.searchParams.get('theme') || '').trim().toLowerCase();
  const theme = themeRaw === 'dark' || themeRaw === 'light' || themeRaw === 'streets' ? themeRaw : 'streets';

  const origin = url.origin;
  const tileUrl = `${origin}/api/map/tiles/{z}/{x}/{y}?theme=${encodeURIComponent(theme)}`;

  const style = {
    version: 8,
    name: `locationiq-raster-${theme}`,
    projection: { type: 'globe' },
    sources: {
      'locationiq-tiles': {
        type: 'raster',
        tiles: [tileUrl],
        tileSize: 256,
        maxzoom: 18,
        attribution:
          '<a href="https://locationiq.com/?ref=maps" target="_blank" rel="noreferrer">© LocationIQ</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a>',
      },
    },
    layers: [
      {
        id: 'locationiq-layer',
        type: 'raster',
        source: 'locationiq-tiles',
        minzoom: 0,
        maxzoom: 22,
      },
    ],
  };

  return NextResponse.json(style, {
    headers: {
      'Cache-Control': 'public, max-age=300',
    },
  });
}
