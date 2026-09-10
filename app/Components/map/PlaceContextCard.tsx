'use client';

import type { TouchEvent, WheelEvent } from 'react';
import {
  IconCloud,
  IconNews,
  IconChartLine,
  IconMessageDots,
  IconX,
  IconLoader2,
  IconWind,
  IconWaveSawTool,
  IconPlane,
  IconSatellite,
  IconCalendarEvent,
  IconWorld,
  IconBulb,
  IconSun,
} from '@tabler/icons-react';
import type { PlaceContext } from '../../lib/geoApi';

interface PlaceContextCardProps {
  context: PlaceContext | null;
  loading?: boolean;
  error?: string | null;
  onClose?: () => void;
  onSendToChat?: (prompt: string) => void;
}

function weatherLabel(code?: number) {
  if (code == null) return '—';
  if (code === 0) return 'Clear';
  if (code <= 3) return 'Partly cloudy';
  if (code <= 48) return 'Fog';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Showers';
  if (code <= 99) return 'Storm';
  return `Code ${code}`;
}

function aqiLabel(aqi?: number) {
  if (aqi == null) return '—';
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Sensitive';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very unhealthy';
  return 'Hazardous';
}

function fmtPop(n?: number) {
  if (n == null) return '—';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function timeOnly(iso?: string) {
  if (!iso) return '—';
  const t = iso.includes('T') ? iso.split('T')[1] : iso;
  return t?.slice(0, 5) || '—';
}

export function PlaceContextCard({
  context,
  loading,
  error,
  onClose,
  onSendToChat,
}: PlaceContextCardProps) {
  if (!loading && !context && !error) return null;

  const place = context?.place;
  const weather = context?.weather;
  const news = context?.news;
  const market = context?.market;
  const aqi = context?.air_quality;
  const quakes = context?.earthquakes;
  const holidays = context?.holidays;
  const country = context?.country;
  const iss = context?.iss;
  const flights = context?.flights;
  const onThisDay = context?.on_this_day;
  const clock = weather?.local_clock;

  const stopScrollBleed = (event: WheelEvent | TouchEvent) => {
    event.stopPropagation();
  };

  return (
    <div className="app-card pointer-events-auto flex h-[min(78dvh,640px)] w-full max-w-md flex-col overflow-hidden shadow-xl">
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
        <div className="min-w-0">
          <h4 className="truncate font-serif text-base font-semibold text-[var(--text-primary)]">
            {loading ? 'Resolving place…' : (
              <>
                {country?.flag_emoji ? <span className="mr-1">{country.flag_emoji}</span> : null}
                {place?.name || 'Selected place'}
              </>
            )}
          </h4>
          <p className="truncate text-[10px] font-mono text-[var(--text-muted)]">
            {place?.country || place?.countrycode || '—'}
            {place ? ` · ${place.lat.toFixed(2)}°, ${place.lon.toFixed(2)}°` : ''}
            {clock?.available && clock.local_time ? ` · ${clock.local_time} local` : ''}
            {context?.cached ? ' · cached' : ''}
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
            aria-label="Close"
          >
            <IconX size={16} />
          </button>
        ) : null}
      </div>

      <div
        className="chat-scroll min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-3"
        onWheel={stopScrollBleed}
        onTouchMove={stopScrollBleed}
      >
        {loading ? (
          <div className="flex items-center gap-2 py-6 text-xs text-[var(--text-secondary)]">
            <IconLoader2 size={16} className="animate-spin text-[#E3836C]" />
            Fan-out: weather, AQI, news, markets, quakes, flights, ISS…
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="rounded-lg border border-[#B86450]/25 bg-[#B86450]/10 px-3 py-2 text-xs text-[#9B4D3B]">
            {error}
          </p>
        ) : null}

        {!loading && context ? (
          <>
            {(country?.available || holidays?.available) && (
              <div className="rounded-xl bg-[var(--surface-2)] p-2.5 text-[11px] text-[var(--text-secondary)]">
                <div className="mb-1 flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                  <IconWorld size={12} className="text-[#E3836C]" /> Civic
                </div>
                {country?.available ? (
                  <p>
                    {country.capital ? `Capital ${country.capital}` : null}
                    {country.population != null ? ` · Pop ${fmtPop(country.population)}` : null}
                    {country.languages?.length ? ` · ${country.languages.slice(0, 3).join(', ')}` : null}
                  </p>
                ) : null}
                {holidays?.available && holidays.today && holidays.today.length > 0 ? (
                  <p className="mt-1 text-[#E3836C]">
                    Holiday today: {holidays.today.map((h) => h.name).join(', ')}
                  </p>
                ) : holidays?.available && holidays.upcoming?.[0] ? (
                  <p className="mt-1">
                    Next holiday: {holidays.upcoming[0].name} ({holidays.upcoming[0].date})
                  </p>
                ) : null}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-[var(--surface-2)] p-2.5">
                <div className="mb-1 flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                  <IconCloud size={12} className="text-[#E3836C]" /> Weather
                </div>
                {weather?.available ? (
                  <>
                    <p className="text-lg font-semibold text-[var(--text-primary)]">
                      {weather.temperature_c != null ? `${Math.round(weather.temperature_c)}°C` : '—'}
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      {weatherLabel(weather.weather_code)}
                      {weather.humidity_pct != null ? ` · ${weather.humidity_pct}% RH` : ''}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                      <IconSun size={11} />
                      UV {weather.uv_index ?? '—'}
                      {weather.sunrise ? ` · ↑${timeOnly(weather.sunrise)}` : ''}
                      {weather.sunset ? ` ↓${timeOnly(weather.sunset)}` : ''}
                    </p>
                    {weather.day_length_hours != null ? (
                      <p className="text-[10px] text-[var(--text-muted)]">
                        Day length {weather.day_length_hours}h
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-[11px] text-[var(--text-muted)]">Unavailable</p>
                )}
              </div>

              <div className="rounded-xl bg-[var(--surface-2)] p-2.5">
                <div className="mb-1 flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                  <IconWind size={12} className="text-[#E3836C]" /> Air quality
                </div>
                {aqi?.available ? (
                  <>
                    <p className="text-lg font-semibold text-[var(--text-primary)]">
                      {aqi.us_aqi ?? aqi.european_aqi ?? '—'}
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      {aqiLabel(aqi.us_aqi)}
                      {aqi.pm2_5 != null ? ` · PM2.5 ${Math.round(aqi.pm2_5)}` : ''}
                    </p>
                  </>
                ) : (
                  <p className="text-[11px] text-[var(--text-muted)]">Unavailable</p>
                )}
              </div>

              <div className="rounded-xl bg-[var(--surface-2)] p-2.5">
                <div className="mb-1 flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                  <IconChartLine size={12} className="text-[#E3836C]" /> Market
                </div>
                {market?.available && market.index_value?.price != null ? (
                  <>
                    <p className="truncate text-[11px] font-medium text-[var(--text-primary)]">
                      {market.index_name}
                    </p>
                    <p className="text-sm font-semibold">
                      {Number(market.index_value.price).toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                      {market.index_value.change_pct != null ? (
                        <span
                          className={`ml-1 text-[11px] ${
                            market.index_value.change_pct >= 0 ? 'text-emerald-600' : 'text-red-500'
                          }`}
                        >
                          {market.index_value.change_pct >= 0 ? '+' : ''}
                          {market.index_value.change_pct}%
                        </span>
                      ) : null}
                    </p>
                    {market.fx_rate_to_usd?.rate_to_usd != null && market.currency && market.currency !== 'USD' ? (
                      <p className="text-[10px] text-[var(--text-muted)]">
                        1 {market.currency} ≈ {market.fx_rate_to_usd.rate_to_usd.toFixed(4)} USD
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {market?.reason === 'no_market_map' ? 'No index mapped' : 'Unavailable'}
                  </p>
                )}
              </div>

              <div className="rounded-xl bg-[var(--surface-2)] p-2.5">
                <div className="mb-1 flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                  <IconSatellite size={12} className="text-[#E3836C]" /> ISS
                </div>
                {iss?.available && iss.distance_km != null ? (
                  <>
                    <p className="text-lg font-semibold text-[var(--text-primary)]">
                      {Math.round(iss.distance_km).toLocaleString()} km
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Overhead distance right now
                    </p>
                  </>
                ) : (
                  <p className="text-[11px] text-[var(--text-muted)]">Unavailable</p>
                )}
              </div>
            </div>

            {(quakes?.available && (quakes.count ?? 0) > 0) || (flights?.available && (flights.count ?? 0) > 0) ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-[var(--surface-2)] p-2.5">
                  <div className="mb-1 flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                    <IconWaveSawTool size={12} className="text-[#E3836C]" /> Quakes (30d)
                  </div>
                  {quakes?.available && quakes.events.length > 0 ? (
                    <ul className="space-y-1 text-[10px] text-[var(--text-secondary)]">
                      {quakes.events.slice(0, 3).map((ev, i) => (
                        <li key={`${ev.time}-${i}`} className="truncate">
                          M{ev.mag} · {ev.distance_km != null ? `${Math.round(ev.distance_km)}km` : '—'}
                          {ev.place ? ` · ${ev.place}` : ''}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-[var(--text-muted)]">None nearby</p>
                  )}
                </div>
                <div className="rounded-xl bg-[var(--surface-2)] p-2.5">
                  <div className="mb-1 flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                    <IconPlane size={12} className="text-[#E3836C]" /> Flights
                  </div>
                  {flights?.available && flights.aircraft.length > 0 ? (
                    <ul className="space-y-1 text-[10px] text-[var(--text-secondary)]">
                      {flights.aircraft.slice(0, 3).map((ac, i) => (
                        <li key={`${ac.callsign}-${i}`} className="truncate">
                          {ac.callsign || 'Aircraft'} · {ac.distance_km != null ? `${Math.round(ac.distance_km)}km` : ''}
                          {ac.altitude_m != null ? ` · ${Math.round(ac.altitude_m)}m` : ''}
                        </li>
                      ))}
                      <li className="text-[var(--text-muted)]">{flights.count} in airspace</li>
                    </ul>
                  ) : (
                    <p className="text-[11px] text-[var(--text-muted)]">Quiet skies / rate-limited</p>
                  )}
                </div>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <div className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                <IconNews size={12} className="text-[#E3836C]" /> News
              </div>
              {news?.available && news.articles.length > 0 ? (
                <ul className="space-y-1.5">
                  {news.articles.slice(0, 3).map((art, idx) => (
                    <li key={`${art.url || art.title}-${idx}`} className="text-[11px] leading-snug">
                      {art.url ? (
                        <a
                          href={art.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[var(--text-primary)] underline-offset-2 hover:underline break-words"
                        >
                          {art.title}
                        </a>
                      ) : (
                        <span>{art.title}</span>
                      )}
                      {art.source ? (
                        <span className="ml-1 text-[var(--text-muted)]">· {art.source}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-[var(--text-muted)]">No recent headlines</p>
              )}
            </div>

            {onThisDay?.available && onThisDay.events.length > 0 ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                  <IconBulb size={12} className="text-[#E3836C]" /> On this day
                  <IconCalendarEvent size={11} className="opacity-50" />
                </div>
                <ul className="space-y-1.5">
                  {onThisDay.events.slice(0, 2).map((ev, idx) => (
                    <li key={`${ev.year}-${idx}`} className="text-[11px] leading-snug text-[var(--text-secondary)]">
                      <span className="font-mono text-[#E3836C]">{ev.year}</span> — {ev.text}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      {!loading && context && onSendToChat && context.chat_prompt ? (
        <div className="shrink-0 border-t border-[var(--border)] p-3">
          <button
            type="button"
            className="btn-primary flex w-full items-center justify-center gap-1.5"
            onClick={() => onSendToChat(context.chat_prompt!)}
          >
            <IconMessageDots size={14} />
            Send to chat
          </button>
        </div>
      ) : null}
    </div>
  );
}
