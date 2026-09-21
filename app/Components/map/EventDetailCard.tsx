'use client';

import { IconPlane, IconSatellite, IconX } from '@tabler/icons-react';
import type { SourcePoint } from '../globe/types';

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
    if (meta.typecode) rows.push(['Type', String(meta.typecode)]);
    if (meta.category) rows.push(['Category', String(meta.category)]);
    if (meta.altitude_m != null) rows.push(['Altitude', `${Math.round(Number(meta.altitude_m))} m`]);
    if (meta.velocity_ms != null) {
      rows.push(['Speed', `${Math.round(Number(meta.velocity_ms) * 3.6)} km/h`]);
    }
    if (meta.track_deg != null) rows.push(['Track', `${Math.round(Number(meta.track_deg))}°`]);
    if (meta.hub) rows.push(['Near', String(meta.hub)]);
    if (meta.icao) rows.push(['ICAO', String(meta.icao)]);
  } else if (isSat) {
    if (meta.name || point.label) rows.push(['Name', String(meta.name || point.label)]);
    if (meta.norad_id != null) rows.push(['NORAD', String(meta.norad_id)]);
    if (meta.altitude_km != null) rows.push(['Altitude', `${Math.round(Number(meta.altitude_km))} km`]);
    if (meta.velocity_kms != null) {
      rows.push(['Velocity', `${Math.round(Number(meta.velocity_kms))} km/h`]);
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
        Live overlay — not a place lookup. Markers stay on the map while you inspect.
      </p>
    </div>
  );
}
