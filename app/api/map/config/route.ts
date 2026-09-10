import { NextResponse } from 'next/server';

const OPENFREEMAP =
  process.env.MAP_STYLE_FALLBACK_URL || 'https://tiles.openfreemap.org/styles/liberty';

/** Public map config — never includes LocationIQ credentials. */
export async function GET() {
  const key = (process.env.LOCATIONIQ_KEY || '').trim();
  if (!key) {
    return NextResponse.json({
      provider: 'openfreemap',
      mapStyle: OPENFREEMAP,
    });
  }
  return NextResponse.json({
    provider: 'locationiq',
    // Style is served by us; tiles hit our proxy (key stays server-side)
    mapStyle: '/api/map/style',
  });
}
