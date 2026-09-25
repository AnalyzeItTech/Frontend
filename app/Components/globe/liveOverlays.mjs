/**
 * Pure helpers for globe live overlays (bug #7 regression surface).
 *
 * Live pins must stay independent of place selection/context. Kept as .mjs so
 * Node's built-in test runner can import without a TS harness.
 */

import { eventCoordinates, pathCoordinates } from './dataQuality.mjs';

/**
 * Map API events for one layer into SourcePoints. Does not accept place context.
 * @param {string} layerId
 * @param {Array<Record<string, any>>} events
 * @param {{ pulseMag?: number, host?: string }} [opts]
 * @returns {Array<Record<string, any>>}
 */
export function mapLayerEventsToPoints(layerId, events, opts = {}) {
  const points = [];
  const host = opts.host || layerId;
  for (const ev of events || []) {
    const coords = eventCoordinates(ev);
    if (!coords) continue;
    const mag = ev.mag != null ? Number(ev.mag) : null;
    const label =
      ev.label ||
      (mag != null ? `M${mag.toFixed(1)} · ${ev.place || layerId}` : ev.place || layerId);
    points.push({
      id: `${layerId}:${ev.id || `${coords.lat},${coords.lon}`}`,
      lat: coords.lat,
      lon: coords.lon,
      label,
      kind: 'event',
      host,
      pulse: opts.pulseMag != null && mag != null && mag >= opts.pulseMag,
      showLabel:
        host === 'iss'
          ? ev.type === 'iss' || Boolean(ev.norad_id === 25544)
          : host !== 'flights',
      category: ev.category,
      trackDeg: ev.track_deg != null ? Number(ev.track_deg) : undefined,
      meta: {
        type: ev.type,
        callsign: ev.callsign,
        altitude_m: ev.altitude_m,
        geo_altitude_m: ev.geo_altitude_m,
        velocity_ms: ev.velocity_ms,
        track_deg: ev.track_deg,
        vertical_rate_ms: ev.vertical_rate_ms,
        on_ground: ev.on_ground,
        squawk: ev.squawk,
        origin_country: ev.origin_country,
        last_seen: ev.last_seen,
        category: ev.category,
        icao: ev.icao,
        typecode: ev.typecode,
        registration: ev.registration,
        aircraft_desc: ev.aircraft_desc,
        altitude_km: ev.altitude_km,
        velocity_kms: ev.velocity_kms,
        norad_id: ev.norad_id,
        name: ev.name || ev.place,
        group: ev.group,
        hub: ev.hub,
        place: ev.place,
        route_available: ev.route_available,
        subtype: ev.subtype,
        r_scale: ev.r_scale,
        s_scale: ev.s_scale,
        g_scale: ev.g_scale,
        kp: ev.kp,
        flare_class: ev.flare_class,
        product_id: ev.product_id,
        issued: ev.issued,
        message: ev.message,
        alert_kind: ev.alert_kind,
        mag: mag,
        depth_km: ev.depth_km,
        time: ev.time,
        url: ev.url,
        title: ev.title || ev.label,
        temperature_c: ev.temperature_c,
        humidity_pct: ev.humidity_pct,
        weather_code: ev.weather_code,
        aqi: ev.aqi ?? ev.us_aqi ?? ev.european_aqi,
        index_name: ev.index_name,
        index_symbol: ev.index_symbol,
        currency: ev.currency,
        price: ev.price,
        change_pct: ev.change_pct,
        elevation_m: ev.elevation_m,
        date: ev.date,
        tsunami: ev.tsunami,
      },
    });
  }
  return points;
}

/**
 * Build overlay pins from enabled layers + API payloads.
 * Intentionally ignores place context / selected place — selecting a place must
 * not rebuild or wipe live flight & satellite pins (bug #7).
 *
 * @param {Record<string, boolean>} enabledLayers
 * @param {Record<string, { events?: Array<Record<string, any>>, path?: Array<{ lat?: number, lon?: number }> }>} layerPayloads
 * @returns {{ points: Array<Record<string, any>>, paths: Array<{ id: string, color?: string, coordinates: Array<[number, number]> }>, counts: Record<string, number> }}
 */
export function buildLiveOverlays(enabledLayers, layerPayloads) {
  const points = [];
  const counts = {};
  const paths = [];

  const push = (layerId, events, opts) => {
    if (!enabledLayers?.[layerId]) return;
    const mapped = mapLayerEventsToPoints(layerId, events || [], opts);
    counts[layerId] = mapped.length;
    points.push(...mapped);
  };

  push('earthquakes', layerPayloads?.earthquakes?.events, {
    host: 'earthquakes',
    pulseMag: 6,
  });
  push('disasters', layerPayloads?.disasters?.events, { host: 'disasters' });
  push('wildfires', layerPayloads?.wildfires?.events, { host: 'wildfires' });
  push('storms', layerPayloads?.storms?.events, { host: 'storms' });
  push('volcanoes', layerPayloads?.volcanoes?.events, { host: 'volcanoes' });
  push('weather', layerPayloads?.weather?.events, { host: 'weather' });
  push('air_quality', layerPayloads?.air_quality?.events, { host: 'air_quality' });
  push('markets', layerPayloads?.markets?.events, { host: 'markets' });
  push('flights', layerPayloads?.flights?.events, { host: 'flights' });
  push('iss', layerPayloads?.iss?.events, { host: 'iss' });
  push('space_weather', layerPayloads?.space_weather?.events, { host: 'space_weather' });
  push('elevation', layerPayloads?.elevation?.events, { host: 'elevation' });

  if (enabledLayers?.iss) {
    const coordinates = pathCoordinates(layerPayloads?.iss?.path || []);
    if (coordinates.length >= 2) {
      paths.push({
        id: 'iss-orbit',
        color: '#f43f5e',
        coordinates,
      });
    }
  }

  return { points, paths, counts };
}

/**
 * Catalog ∪ chat actives ∪ live overlays, deduped by id (first wins).
 * @template {{ id: string }} T
 * @param {T[]} catalog
 * @param {T[]} activePoints
 * @param {T[]} overlayPoints
 * @returns {T[]}
 */
export function mergeDisplayPoints(catalog, activePoints, overlayPoints) {
  const out = [];
  const seen = new Set();
  for (const p of [...(catalog || []), ...(activePoints || []), ...(overlayPoints || [])]) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
  }
  return out;
}

/**
 * Overlay event clicks must not reverse-geocode / load place context.
 * @param {{ event?: unknown } | null | undefined} place
 * @returns {boolean}
 */
export function selectionLoadsPlaceContext(place) {
  return !place?.event;
}

/** IDs that must never appear in live overlays (legacy place-context mix-ins). */
export const FORBIDDEN_OVERLAY_ID_PATTERNS = [
  /:selected:/,
  /^weather:selected/,
  /^market:selected/,
  /^flight:ctx:/,
  /^iss:ctx$/,
  /^flights:ctx:/,
];

/**
 * @param {Array<{ id?: string }>} points
 * @returns {boolean}
 */
export function overlaysContainPlaceContextExtras(points) {
  return (points || []).some((p) =>
    FORBIDDEN_OVERLAY_ID_PATTERNS.some((re) => re.test(String(p.id || ''))),
  );
}
