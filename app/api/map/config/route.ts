import { NextResponse } from 'next/server';

const OPENFREEMAP_LIGHT =
  process.env.MAP_STYLE_FALLBACK_URL || 'https://tiles.openfreemap.org/styles/liberty';
const OPENFREEMAP_DARK =
  process.env.MAP_STYLE_FALLBACK_DARK_URL || 'https://tiles.openfreemap.org/styles/dark';

/** Public map config — never includes LocationIQ credentials. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const themeRaw = (url.searchParams.get('theme') || '').trim().toLowerCase();
  const isDark = themeRaw === 'dark';
  const tileTheme = isDark ? 'dark' : 'streets';

  const key = (process.env.LOCATIONIQ_KEY || '').trim();
  if (!key) {
    return NextResponse.json({
      provider: 'openfreemap',
      theme: isDark ? 'dark' : 'light',
      mapStyle: isDark ? OPENFREEMAP_DARK : OPENFREEMAP_LIGHT,
    });
  }
  return NextResponse.json({
    provider: 'locationiq',
    theme: tileTheme,
    // Style is served by us; tiles hit our proxy (key stays server-side)
    mapStyle: `/api/map/style?theme=${encodeURIComponent(tileTheme)}`,
  });
}
