// Shareable globe scenes and the event timeline, as pure functions (no DOM, fully testable).
//
// A scene is the part of the globe state worth sharing: which layers are on, the time window,
// the visual mode, a camera, and the places in focus. It travels in the URL query string, so a
// link restores exactly what the sender saw. Everything decoded from a URL is untrusted.

export const LAYER_IDS = [
  'catalog', 'earthquakes', 'disasters', 'wildfires', 'storms', 'volcanoes',
  'weather', 'air_quality', 'markets', 'iss', 'space_weather', 'elevation',
];
export const DAY_OPTIONS = [1, 3, 7, 14, 30];
export const DATA_VIEWS = ['pins', 'heat', 'density', 'bars'];
export const PROJECTIONS = ['globe', 'mercator'];
export const MAX_SCENE_PLACES = 8;

const finite = (n) => typeof n === 'number' && Number.isFinite(n);
const r = (n, d) => Number(n.toFixed(d));

export function encodeScene(scene = {}) {
  const q = new URLSearchParams();
  const layers = (scene.layers || []).filter((l) => LAYER_IDS.includes(l));
  if (layers.length) q.set('layers', layers.join(','));
  if (DAY_OPTIONS.includes(scene.days) && scene.days !== 7) q.set('days', String(scene.days));
  if (DATA_VIEWS.includes(scene.view) && scene.view !== 'pins') q.set('view', scene.view);
  if (PROJECTIONS.includes(scene.projection) && scene.projection !== 'globe') q.set('proj', scene.projection);
  const places = (scene.places || [])
    .filter((p) => finite(p.lat) && finite(p.lon))
    .slice(0, MAX_SCENE_PLACES)
    .map((p) => `${encodeURIComponent(String(p.name || '').replace(/[|@]/g, ' ').slice(0, 60))}@${r(p.lat, 3)},${r(p.lon, 3)}`);
  if (places.length) q.set('places', places.join('|'));
  const c = scene.camera;
  if (c && finite(c.lat) && finite(c.lng) && finite(c.zoom)) q.set('at', `${r(c.lat, 3)},${r(c.lng, 3)},${r(c.zoom, 2)}`);
  return q.toString();
}

export function decodeScene(search = '') {
  const q = new URLSearchParams(String(search).replace(/^\?/, ''));
  const out = { layers: null, days: null, view: null, projection: null, places: [], camera: null };

  const layers = (q.get('layers') || '').split(',').map((s) => s.trim()).filter((l) => LAYER_IDS.includes(l));
  if (layers.length) out.layers = [...new Set(layers)];

  const days = Number(q.get('days'));
  if (DAY_OPTIONS.includes(days)) out.days = days;
  if (DATA_VIEWS.includes(q.get('view'))) out.view = q.get('view');
  if (PROJECTIONS.includes(q.get('proj'))) out.projection = q.get('proj');

  for (const chunk of (q.get('places') || '').split('|').slice(0, MAX_SCENE_PLACES)) {
    const m = /^(.*)@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/.exec(chunk);
    if (!m) continue;
    const lat = Number(m[2]);
    const lon = Number(m[3]);
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
    let name = '';
    try {
      name = decodeURIComponent(m[1]).slice(0, 60);
    } catch {
      name = '';
    }
    out.places.push({ name: name || `${lat.toFixed(2)}, ${lon.toFixed(2)}`, lat, lon });
  }

  const at = (q.get('at') || '').split(',').map(Number);
  if (at.length === 3 && at.every(finite) && Math.abs(at[0]) <= 90 && Math.abs(at[1]) <= 180) {
    out.camera = { lat: at[0], lng: at[1], zoom: Math.min(Math.max(at[2], 1), 18) };
  }
  return out;
}

/** Link to the full globe showing `places`, e.g. from a chat answer. */
export function globeLinkForPlaces(places, layers = ['earthquakes', 'disasters']) {
  const qs = encodeScene({ places, layers });
  return qs ? `/globe?${qs}` : '/globe';
}

// ── timeline ────────────────────────────────────────────────────────────────

/** Epoch ms of an event point (USGS `time` is ms; EONET/GDACS `date` is ISO), else null. */
export function eventEpoch(p) {
  if (!p) return null;
  // Overlay points carry the raw event fields under `meta` (see liveOverlays.mjs).
  const m = p.meta && typeof p.meta === 'object' ? p.meta : {};
  const t = p.time ?? p.timestamp ?? m.time ?? m.timestamp;
  if (finite(t)) return t < 1e11 ? t * 1000 : t; // seconds -> ms
  const d = p.date ?? p.when ?? m.date ?? m.when;
  if (typeof d === 'string') {
    const ms = Date.parse(d);
    if (Number.isFinite(ms)) return ms;
  }
  return null;
}

export function windowBounds(days, now = Date.now()) {
  const span = Math.max(1, days) * 86_400_000;
  return { start: now - span, end: now };
}

export function cursorTime(frac, bounds) {
  const f = Math.min(1, Math.max(0, Number.isFinite(frac) ? frac : 1));
  return bounds.start + f * (bounds.end - bounds.start);
}

/** Replay filter: events at or before the cursor. Undated points (hubs, sources) always stay. */
export function filterByCursor(points, cursorMs) {
  return points.filter((p) => {
    const t = eventEpoch(p);
    return t == null || t <= cursorMs;
  });
}

/** 0..1 age of an event relative to the cursor within the window (1 = brand new), for fading. */
export function recency(p, cursorMs, bounds) {
  const t = eventEpoch(p);
  if (t == null) return 1;
  const span = Math.max(1, cursorMs - bounds.start);
  return Math.min(1, Math.max(0, 1 - (cursorMs - t) / span));
}

export function formatCursor(ms, days) {
  const d = new Date(ms);
  return days <= 3
    ? d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
