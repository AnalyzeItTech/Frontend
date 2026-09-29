'use client';

import { IconPlane, IconSatellite, IconX } from '@tabler/icons-react';
import { formatSatelliteVelocity } from '../globe/dataQuality.mjs';
import type { SourcePoint } from '../globe/types';

function fmtAltitude(meta: Record<string, unknown>): string | null {
  const m = meta.altitude_m != null ? Number(meta.altitude_m) : NaN;
  if (!Number.isFinite(m)) return null;
  const ft = Math.round(m / 0.3048);
  return `${ft.toLocaleString()} ft (${Math.round(m).toLocaleString()} m)`;
}

function fmtSpeed(meta: Record<string, unknown>): string | null {
  const ms = meta.velocity_ms != null ? Number(meta.velocity_ms) : NaN;
  if (!Number.isFinite(ms)) return null;
  const kt = Math.round(ms / 0.514444);
  const kmh = Math.round(ms * 3.6);
  return `${kt} kt (${kmh} km/h)`;
}

function fmtTrack(meta: Record<string, unknown>): string | null {
  const deg = meta.track_deg != null ? Number(meta.track_deg) : NaN;
  if (!Number.isFinite(deg)) return null;
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const idx = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
  return `${Math.round(deg)}° ${dirs[idx]}`;
}

function fmtVerticalRate(meta: Record<string, unknown>): string | null {
  const ms = meta.vertical_rate_ms != null ? Number(meta.vertical_rate_ms) : NaN;
  if (!Number.isFinite(ms) || Math.abs(ms) < 0.3) return null;
  const fpm = Math.round(ms / 0.00508);
  if (fpm > 0) return `+${fpm.toLocaleString()} ft/min`;
  return `${fpm.toLocaleString()} ft/min`;
}

function fmtLastSeen(meta: Record<string, unknown>): string | null {
  const ts = meta.last_seen != null ? Number(meta.last_seen) : NaN;
  if (!Number.isFinite(ts) || ts <= 0) return null;
  const ageSec = Math.max(0, Math.round(Date.now() / 1000 - ts));
  if (ageSec < 5) return 'just now';
  if (ageSec < 60) return `${ageSec}s ago`;
  if (ageSec < 3600) return `${Math.round(ageSec / 60)}m ago`;
  try {
    return new Date(ts * 1000).toLocaleString();
  } catch {
    return `${ageSec}s ago`;
  }
}

export function EventDetailCard({
  point,
  onClose,
}: {
  point: SourcePoint;
  onClose?: () => void;
}) {
  const meta = point.meta || {};
  const isFlight = point.host === 'flights';
  const isSat = point.host === 'iss' || meta.type === 'satellite' || meta.type === 'iss';
  const isSpaceWeather =
    point.host === 'space_weather' || meta.type === 'space_weather';

  const rows: Array<[string, string]> = [];
  if (isFlight) {
    if (meta.callsign) rows.push(['Callsign', String(meta.callsign)]);
    if (meta.registration) rows.push(['Registration', String(meta.registration)]);
    if (meta.icao) rows.push(['ICAO24', String(meta.icao)]);
    if (meta.typecode) rows.push(['Type code', String(meta.typecode)]);
    if (meta.aircraft_desc) rows.push(['Aircraft', String(meta.aircraft_desc)]);
    if (meta.category && meta.category !== 'unknown') {
      rows.push(['Category', String(meta.category)]);
    }
    if (meta.on_ground === true) rows.push(['Status', 'On ground / taxi']);
    else if (meta.on_ground === false) rows.push(['Status', 'Airborne']);
    const alt = fmtAltitude(meta);
    if (alt) rows.push(['Altitude', alt]);
    const spd = fmtSpeed(meta);
    if (spd) rows.push(['Ground speed', spd]);
    const track = fmtTrack(meta);
    if (track) rows.push(['Heading', track]);
    const vrate = fmtVerticalRate(meta);
    if (vrate) rows.push(['Climb/descent', vrate]);
    if (meta.squawk) rows.push(['Squawk', String(meta.squawk)]);
    if (meta.origin_country) {
      rows.push(['Registered in', String(meta.origin_country)]);
    }
    if (meta.hub) rows.push(['Sample region', String(meta.hub)]);
    const seen = fmtLastSeen(meta);
    if (seen) rows.push(['Last position', seen]);
    rows.push([
      'Route / OD',
      'Not on free ADS-B — position + speed only (no airline itinerary)',
    ]);
  } else if (isSat) {
    if (meta.name || point.label) rows.push(['Name', String(meta.name || point.label)]);
    if (meta.norad_id != null) rows.push(['NORAD', String(meta.norad_id)]);
    if (meta.altitude_km != null) rows.push(['Altitude', `${Math.round(Number(meta.altitude_km))} km`]);
    if (meta.velocity_kms != null) {
      const velocity = formatSatelliteVelocity(meta.velocity_kms);
      if (velocity) rows.push(['Velocity', velocity]);
    }
    if (meta.group) rows.push(['Catalog', String(meta.group)]);
  } else if (isSpaceWeather) {
    if (meta.subtype) rows.push(['Kind', String(meta.subtype)]);
    if (meta.r_scale != null || meta.s_scale != null || meta.g_scale != null) {
      rows.push([
        'NOAA scales',
        `R${meta.r_scale ?? '—'} · S${meta.s_scale ?? '—'} · G${meta.g_scale ?? '—'}`,
      ]);
    }
    if (meta.kp != null) rows.push(['Kp', String(meta.kp)]);
    if (meta.flare_class) rows.push(['Flare', String(meta.flare_class)]);
    if (meta.product_id) rows.push(['Product', String(meta.product_id)]);
    if (meta.alert_kind) rows.push(['Scale class', String(meta.alert_kind)]);
    if (meta.issued) rows.push(['Issued', String(meta.issued)]);
    if (meta.message) rows.push(['Message', String(meta.message).slice(0, 280)]);
    if (meta.place) rows.push(['Marker', String(meta.place)]);
  } else {
    if (meta.place && String(meta.place) !== point.label) rows.push(['Place', String(meta.place)]);
    if (meta.mag != null && Number.isFinite(Number(meta.mag))) {
      rows.push(['Magnitude', `M${Number(meta.mag).toFixed(1)}`]);
    }
    if (meta.depth_km != null && Number.isFinite(Number(meta.depth_km))) {
      rows.push(['Depth', `${Math.round(Number(meta.depth_km))} km`]);
    }
    if (meta.tsunami === 1 || meta.tsunami === true) rows.push(['Tsunami', 'Flagged by USGS']);
    if (meta.temperature_c != null && Number.isFinite(Number(meta.temperature_c))) {
      rows.push(['Temperature', `${Math.round(Number(meta.temperature_c))}°C`]);
    }
    if (meta.humidity_pct != null && Number.isFinite(Number(meta.humidity_pct))) {
      rows.push(['Humidity', `${Math.round(Number(meta.humidity_pct))}%`]);
    }
    if (meta.aqi != null && Number.isFinite(Number(meta.aqi))) {
      rows.push(['Air quality', `AQI ${Math.round(Number(meta.aqi))}`]);
    }
    if (meta.index_name) rows.push(['Index', String(meta.index_name)]);
    if (meta.price != null && Number.isFinite(Number(meta.price))) {
      const ccy = meta.currency ? `${meta.currency} ` : '';
      const ch =
        meta.change_pct != null && Number.isFinite(Number(meta.change_pct))
          ? ` (${Number(meta.change_pct) >= 0 ? '+' : ''}${Number(meta.change_pct).toFixed(1)}%)`
          : '';
      rows.push(['Last', `${ccy}${Number(meta.price).toLocaleString(undefined, { maximumFractionDigits: 2 })}${ch}`]);
    }
    if (meta.elevation_m != null && Number.isFinite(Number(meta.elevation_m))) {
      rows.push(['Elevation', `${Math.round(Number(meta.elevation_m)).toLocaleString()} m`]);
    }
    if (meta.category) rows.push(['Category', String(meta.category)]);
    if (meta.date) rows.push(['Observed', String(meta.date).replace('T', ' ').slice(0, 16)]);
    if (meta.time != null && Number.isFinite(Number(meta.time))) {
      const ms = Number(meta.time) > 1e12 ? Number(meta.time) : Number(meta.time) * 1000;
      try {
        rows.push(['When', new Date(ms).toLocaleString()]);
      } catch {
        /* ignore bad timestamps */
      }
    }
    if (typeof meta.url === 'string' && meta.url.startsWith('http')) {
      rows.push(['Source', meta.url.replace(/^https?:\/\//, '').slice(0, 48)]);
    }
  }
  rows.push(['Coordinates', `${point.lat.toFixed(3)}°, ${point.lon.toFixed(3)}°`]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            {isFlight ? 'Aircraft' : isSat ? 'Satellite' : isSpaceWeather ? 'Space weather' : 'Event'}
          </p>
          <h2 className="truncate font-serif text-lg text-[var(--text-primary)]">{point.label}</h2>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-xl ${
              isFlight
                ? 'bg-[#0ea5e9]/15 text-[#0ea5e9]'
                : isSpaceWeather
                  ? 'bg-[#14b8a6]/15 text-[#14b8a6]'
                  : 'bg-[#f43f5e]/15 text-[#f43f5e]'
            }`}
          >
            {isFlight ? <IconPlane size={18} /> : <IconSatellite size={18} />}
          </span>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
              aria-label="Close"
            >
              <IconX size={16} />
            </button>
          ) : null}
        </div>
      </div>
      <dl className="flex-1 space-y-2 overflow-y-auto p-4">
        {rows.map(([k, v]) => (
          <div
            key={k}
            className="flex items-baseline justify-between gap-3 rounded-lg bg-[var(--surface-2)] px-3 py-2"
          >
            <dt className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">{k}</dt>
            <dd className="text-right text-sm font-medium text-[var(--text-primary)]">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="border-t border-[var(--border)] px-4 py-2 text-[11px] text-[var(--text-muted)]">
        {isFlight
          ? 'Live ADS-B / OpenSky position — origin & destination need a separate schedule API.'
          : 'Live overlay — not a place lookup. Markers stay on the map while you inspect.'}
      </p>
    </div>
  );
}
