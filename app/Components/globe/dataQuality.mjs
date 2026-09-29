/**
 * Pure globe data-quality helpers (coords, layer freshness, catalog merge,
 * Ask source mapping, Stop/Retry release). Node test runner imports this
 * directly — keep it free of React and Next.
 */

export function parseCoord(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/**
 * Accept lat/lon (or lng/longitude). Swap only when latitude is outside
 * [-90, 90] and the pair is a valid coordinate the other way around.
 * @returns {{ lat: number, lon: number } | null}
 */
export function normalizeLatLon(latRaw, lonRaw) {
  let lat = parseCoord(latRaw);
  let lon = parseCoord(lonRaw);
  if (lat == null || lon == null) return null;
  if (Math.abs(lat) > 90 && Math.abs(lat) <= 180 && Math.abs(lon) <= 90) {
    const swapped = lat;
    lat = lon;
    lon = swapped;
  }
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
}

function eventHasIdentity(ev) {
  return Boolean(ev?.place || ev?.label || ev?.name || ev?.id || ev?.title);
}

/**
 * Coordinates safe to plot. Drops non-finite, out-of-range, and exact 0,0
 * sentinels that have no place/id (APIs often use null-island for missing).
 */
export function eventCoordinates(ev) {
  if (!ev || typeof ev !== 'object') return null;
  const coords = normalizeLatLon(
    ev.lat ?? ev.latitude,
    ev.lon ?? ev.lng ?? ev.longitude,
  );
  if (!coords) return null;
  if (coords.lat === 0 && coords.lon === 0 && !eventHasIdentity(ev)) return null;
  return coords;
}

export function pathCoordinates(points) {
  const out = [];
  for (const p of points || []) {
    const coords = normalizeLatLon(p?.lat ?? p?.latitude, p?.lon ?? p?.lng ?? p?.longitude);
    if (!coords) continue;
    if (coords.lat === 0 && coords.lon === 0) continue;
    out.push([coords.lon, coords.lat]);
  }
  return out;
}

/**
 * @param {Record<string, any> | null | undefined} payload
 * @returns {{ status: 'ok' | 'empty' | 'error', message: string | null, events: Array<Record<string, any>> | null, path: Array<any> | null }}
 */
export function interpretLayerPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return { status: 'error', message: 'Layer response missing', events: null, path: null };
  }
  if (payload.fetchError) {
    return { status: 'error', message: String(payload.fetchError), events: null, path: null };
  }
  if (payload.available === false || (typeof payload.error === 'string' && payload.error.trim())) {
    return {
      status: 'error',
      message: String(payload.error || 'Layer unavailable'),
      events: null,
      path: null,
    };
  }
  const events = Array.isArray(payload.events) ? payload.events : [];
  const path = Array.isArray(payload.path) ? payload.path : null;
  return {
    status: events.length ? 'ok' : 'empty',
    message: null,
    events,
    path,
  };
}

/**
 * A failed refresh must not wipe the last good events and pretend the layer is empty.
 * @param {{ events?: Array<any>, path?: Array<any> | null } | null | undefined} previous
 * @param {ReturnType<typeof interpretLayerPayload>} interpreted
 */
export function mergeLayerRefresh(previous, interpreted) {
  if (interpreted.status === 'error') {
    const kept = Array.isArray(previous?.events) ? previous.events : [];
    return {
      events: kept,
      path: previous?.path || null,
      status: kept.length ? 'stale' : 'error',
      message: interpreted.message,
    };
  }
  return {
    events: interpreted.events || [],
    path: interpreted.path,
    status: interpreted.status,
    message: null,
  };
}

/** Legend / chip copy. Never print "(0)" for a failed fetch. */
export function layerCountLabel(count, health) {
  const status = health?.status;
  const n = Number(count) || 0;
  if (status === 'error') return 'unavailable';
  if (status === 'stale') return n > 0 ? `${n} stale` : 'unavailable';
  if (status === 'loading') return '…';
  return String(n);
}

/**
 * Live registry wins when it returns any plottable rows. Hardcoded seats are
 * the offline fallback only — do not union a news dump back on top of the API.
 * @template {{ id?: string, host?: string }} T
 * @param {T[]} fallback
 * @param {T[] | null | undefined} registry
 * @returns {{ points: T[], origin: 'registry' | 'fallback' }}
 */
export function resolveArchivePoints(fallback, registry) {
  const api = [];
  const seen = new Set();
  for (const point of registry || []) {
    const key = String(point?.host || point?.id || '').toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    api.push(point);
  }
  if (api.length) return { points: api, origin: 'registry' };
  return { points: fallback || [], origin: 'fallback' };
}

/** One pin per host. Colocated agencies stay — rounding must not hide a source. */
export function dedupePointsByHost(points) {
  const seen = new Set();
  const out = [];
  for (const point of points || []) {
    const key = String(point?.host || point?.id || '').toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(point);
  }
  return out;
}

export function metricOfPoint(point) {
  const m = point?.meta || {};
  const mag = Number(m.mag);
  if (Number.isFinite(mag)) {
    return { key: 'mag', label: 'Magnitude', score: mag, weight: Math.min(Math.max(mag, 0) / 8, 1) };
  }
  const aqi = Number(m.aqi);
  if (Number.isFinite(aqi)) {
    return { key: 'aqi', label: 'AQI', score: aqi, weight: Math.min(Math.max(aqi, 0) / 200, 1) };
  }
  const temp = Number(m.temperature_c);
  if (Number.isFinite(temp)) {
    return {
      key: 'temp',
      label: '°C',
      score: Math.abs(temp),
      weight: Math.min(Math.abs(temp) / 45, 1),
    };
  }
  const ch = Number(m.change_pct);
  if (Number.isFinite(ch)) {
    return {
      key: 'change',
      label: '|Δ%|',
      score: Math.abs(ch),
      weight: Math.min(Math.abs(ch) / 5, 1),
    };
  }
  const el = Number(m.elevation_m);
  if (Number.isFinite(el)) {
    return {
      key: 'elev',
      label: 'm',
      score: Math.abs(el),
      weight: Math.min(Math.abs(el) / 4500, 1),
    };
  }
  return null;
}

/** Rank only within one unit so M6.2 is not compared with elevation meters. */
export function strongestRows(points, limit = 8) {
  const groups = new Map();
  for (const point of points || []) {
    if (!point || point.kind === 'hub' || point.kind === 'archive') continue;
    const metric = metricOfPoint(point);
    if (!metric) continue;
    const list = groups.get(metric.key) || [];
    list.push({
      id: point.id,
      label: point.label,
      score: metric.score,
      unit: metric.label,
      key: metric.key,
    });
    groups.set(metric.key, list);
  }
  if (!groups.size) return { unit: '', rows: [] };
  let bestKey = null;
  let bestLen = -1;
  for (const [key, rows] of groups) {
    if (rows.length > bestLen) {
      bestKey = key;
      bestLen = rows.length;
    }
  }
  const rows = (groups.get(bestKey) || [])
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  return { unit: rows[0]?.unit || '', rows };
}

/**
 * Heat/density/bars weight. Archive HQ pins are not a measurement.
 * Events with no numeric metric still count as presence (0.45), not as 0.
 * @returns {number | null}
 */
export function eventDrawWeight(point) {
  if (!point || point.kind !== 'event') return null;
  const metric = metricOfPoint(point);
  return metric ? metric.weight : 0.45;
}

const ORBIT_KMS_MAX = 20;

/** `velocity_kms` is kilometers per second. Values above low-orbit speed are already km/h. */
export function formatSatelliteVelocity(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (Math.abs(n) > ORBIT_KMS_MAX) {
    return `${Math.round(n).toLocaleString('en-US')} km/h`;
  }
  const kmh = Math.round(n * 3600);
  return `${n.toFixed(2)} km/s (${kmh.toLocaleString('en-US')} km/h)`;
}

export function hostFromSourceFoundDetail(detail, explicitHost) {
  const explicit = typeof explicitHost === 'string' ? explicitHost.trim() : '';
  if (explicit.includes('.')) {
    return explicit
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .split('/')[0]
      .split(':')[0]
      .toLowerCase();
  }
  const raw = String(detail || '').trim();
  if (!raw) return '';
  const candidate = /^https?:\/\//i.test(raw) ? raw : raw.includes('/') ? `https://${raw}` : '';
  if (candidate) {
    try {
      return new URL(candidate).hostname.replace(/^www\./i, '').toLowerCase();
    } catch {
      /* not a URL */
    }
  }
  const token = raw.split(/\s+/).pop() || raw;
  const host = token
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .split('/')[0]
    .split(':')[0]
    .toLowerCase();
  return host.includes('.') ? host : '';
}

/**
 * Map a tool_progress source_found payload into a citation the globe can place.
 * Does not invent https:// URLs from a path segment.
 */
export function sourceFromProgressPayload(payload) {
  const nested =
    payload?.progress && typeof payload.progress === 'object' ? payload.progress : {};
  const detail =
    typeof payload?.detail === 'string'
      ? payload.detail
      : typeof nested.detail === 'string'
        ? nested.detail
        : '';
  const explicitHost =
    typeof payload?.host === 'string'
      ? payload.host
      : typeof nested.host === 'string'
        ? nested.host
        : '';
  const host = hostFromSourceFoundDetail(detail, explicitHost);
  const urlRaw =
    typeof payload?.url === 'string'
      ? payload.url
      : typeof nested.url === 'string'
        ? nested.url
        : '';
  let url = '';
  if (urlRaw.startsWith('http://') || urlRaw.startsWith('https://')) url = urlRaw;
  else if (host) url = `https://${host}`;
  if (!host && !url) return null;
  const coords = normalizeLatLon(
    payload?.lat ?? nested.lat,
    payload?.lon ?? payload?.lng ?? nested.lon ?? nested.lng,
  );
  const title = typeof payload?.title === 'string' ? payload.title : '';
  const sourceId =
    typeof payload?.source_id === 'string'
      ? payload.source_id
      : typeof nested.source_id === 'string'
        ? nested.source_id
        : undefined;
  const category =
    typeof payload?.category === 'string'
      ? payload.category
      : typeof nested.category === 'string'
        ? nested.category
        : undefined;
  return {
    host: host || '',
    url: url || undefined,
    title,
    ...(coords ? { lat: coords.lat, lng: coords.lon } : {}),
    ...(sourceId ? { source_id: sourceId } : {}),
    ...(category ? { category } : {}),
  };
}

export function globeAskPrompt(prompt, places) {
  const base = String(prompt || '').trim() || 'Analyze this place';
  const bits = [];
  for (const place of places || []) {
    const coords = normalizeLatLon(place?.lat, place?.lon);
    if (!coords) continue;
    const name = String(place?.name || 'Place').trim() || 'Place';
    const country = place?.country ? `, ${place.country}` : '';
    bits.push(`${name}${country} @ ${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`);
  }
  if (!bits.length) return base;
  const line = `Pinned places: ${bits.join('; ')}.`;
  if (base.includes(line)) return base;
  return `${base}\n\n${line}`;
}

export function stoppedAssistantMessage(message, opts = {}) {
  const timedOut = Boolean(opts.timedOut);
  const prior = typeof message?.content === 'string' ? message.content.trim() : '';
  const content = prior
    ? prior
    : timedOut
      ? 'Timed out waiting for the agent. Try again — cold starts can take a minute.'
      : 'Stopped.';
  return {
    ...(message || {}),
    content,
    streaming: false,
    status: undefined,
    stopped: true,
    canRetry: true,
  };
}

export function messageOffersRetry(message) {
  if (!message || message.role === 'user' || message.streaming) return false;
  if (message.softFail) return true;
  if (message.toolError) return true;
  if (message.stopped || message.canRetry) return true;
  return false;
}

/**
 * Chat mini-globe shows this run's pins only. Full globe adds the catalog
 * when that layer is on, then live overlays.
 */
export function selectDisplayPoints({
  variant,
  showCatalog,
  archivePoints,
  activePoints,
  overlayPoints,
  cap,
}) {
  if (variant === 'mini') {
    const pins = [];
    const seen = new Set();
    for (const point of activePoints || []) {
      if (!point?.id || seen.has(point.id)) continue;
      seen.add(point.id);
      pins.push(point);
    }
    const limit = Number(cap);
    if (Number.isFinite(limit) && limit > 0 && pins.length > limit) {
      return pins.slice(pins.length - limit);
    }
    return pins;
  }
  const catalog = showCatalog ? archivePoints || [] : [];
  const out = [];
  const seen = new Set();
  for (const point of [...catalog, ...(activePoints || []), ...(overlayPoints || [])]) {
    if (!point?.id || seen.has(point.id)) continue;
    seen.add(point.id);
    out.push(point);
  }
  return out;
}
