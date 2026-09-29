import { searchPlaces } from '../../lib/geoApi';
import { normalizeLatLon } from './dataQuality.mjs';
import { lookupSourceHost } from './sourceCatalog';
import type { ChatRunIngest, SourcePoint } from './types';

function hostFromSource(src: { host: string; url?: string }): string {
  if (src.host) return src.host;
  if (!src.url) return '';
  try {
    return new URL(src.url).hostname;
  } catch {
    return src.url;
  }
}

export function pointsFromSources(
  sources: Array<{
    host: string;
    url?: string;
    title?: string;
    lat?: number;
    lng?: number;
    lon?: number;
    source_id?: string;
  }>,
): SourcePoint[] {
  const points: SourcePoint[] = [];
  const seen = new Set<string>();
  for (const src of sources) {
    const host = hostFromSource(src);
    const entry = lookupSourceHost(host);
    const explicit = normalizeLatLon(src.lat, src.lon ?? src.lng);
    const fallback = entry ? normalizeLatLon(entry.lat, entry.lon) : null;
    const coords = explicit || fallback;
    if (!coords) continue;
    const { lat, lon } = coords;
    const id = `live:${src.source_id || entry?.host || host || `${lat.toFixed(3)},${lon.toFixed(3)}`}`;
    if (seen.has(id)) continue;
    seen.add(id);
    points.push({
      id,
      lat,
      lon,
      label: src.title || entry?.label || host,
      host: entry?.host || host || undefined,
      source_id: src.source_id || entry?.host || host,
      kind: 'live',
      tier: entry?.tier || 'candidate',
      pulse: true,
    });
  }
  return points;
}

export async function pointFromCity(city: string): Promise<SourcePoint | null> {
  const q = city.trim();
  if (q.length < 2) return null;
  try {
    const hits = await searchPlaces(q, 3);
    const hit =
      hits.find((h) => h.name.toLowerCase() === q.toLowerCase()) ||
      hits.find((h) => q.toLowerCase().includes(h.name.toLowerCase())) ||
      hits[0];
    if (!hit) return null;
    return {
      id: `place:${hit.name}:${hit.lat.toFixed(3)}:${hit.lon.toFixed(3)}`,
      lat: hit.lat,
      lon: hit.lon,
      label: hit.name,
      kind: 'place',
      pulse: true,
    };
  } catch {
    return null;
  }
}

export async function pointFromQuery(query: string): Promise<SourcePoint | null> {
  const q = query.trim();
  if (q.length < 3) return null;
  try {
    const hits = await searchPlaces(q, 5);
    const lower = q.toLowerCase();
    const hit = hits.find((h) => {
      const name = h.name.toLowerCase();
      if (name.length < 3) return false;
      return new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(lower);
    });
    if (!hit) return null;
    return {
      id: `place:${hit.name}:${hit.lat.toFixed(3)}:${hit.lon.toFixed(3)}`,
      lat: hit.lat,
      lon: hit.lon,
      label: hit.name,
      kind: 'place',
      pulse: true,
    };
  } catch {
    return null;
  }
}

export async function resolveChatIngest(input: ChatRunIngest): Promise<SourcePoint[]> {
  const points: SourcePoint[] = [];
  const seen = new Set<string>();
  const add = (point: SourcePoint | null | undefined) => {
    if (!point || seen.has(point.id)) return;
    seen.add(point.id);
    points.push(point);
  };

  const direct = normalizeLatLon(input.lat, input.lon);
  if (direct) {
    add({
      id: `place:${direct.lat.toFixed(3)}:${direct.lon.toFixed(3)}`,
      lat: direct.lat,
      lon: direct.lon,
      label: input.name || `${direct.lat.toFixed(2)}°, ${direct.lon.toFixed(2)}°`,
      kind: 'place',
      pulse: true,
    });
  }

  if (input.city) add(await pointFromCity(input.city));
  if (input.query) add(await pointFromQuery(input.query));
  if (input.sources?.length) {
    for (const point of pointsFromSources(input.sources)) add(point);
  }
  return points;
}

export function calloutFor(point: SourcePoint): string {
  if (point.host) return `Pulling from ${point.host}…`;
  if (point.kind === 'place') return `Looking at ${point.label}…`;
  return point.label;
}
