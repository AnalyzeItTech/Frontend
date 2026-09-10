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
  IconBook,
  IconMapPin,
  IconMountain,
} from '@tabler/icons-react';
import type { PlaceContext } from '../../lib/geoApi';

interface PlaceContextCardProps {
  context: PlaceContext | null;
  loading?: boolean;
  error?: string | null;
  onClose?: () => void;
  onSendToChat?: (prompt: string) => void;
}

function weatherLabel(code?: number | null) {
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

function shortDate(iso?: string) {
  if (!iso) return '—';
  return iso.slice(5, 10);
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
  const elevation = context?.elevation;
  const wikipedia = context?.wikipedia;
  const pois = context?.pois;
  const clock = weather?.local_clock;

  const stopScrollBleed = (event: WheelEvent | TouchEvent) => {
    event.stopPropagation();
  };

  return (
    <div className="app-card pointer-events-auto flex max-h-[min(78dvh,640px)] w-full max-w-md flex-col overflow-hidden shadow-xl">
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
            {elevation?.available && elevation.elevation_m != null
              ? ` · ${Math.round(elevation.elevation_m)} m`
              : ''}
            {context?.layers_available != null ? ` · ${context.layers_available} layers` : ''}
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
            Fan-out: weather, elevation, AQI, news, wiki, POIs, markets, quakes, flights, ISS…
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="rounded-lg border border-[#B86450]/25 bg-[#B86450]/10 px-3 py-2 text-xs text-[#9B4D3B]">
            {error}
          </p>
        ) : null}

        {!loading && context ? (
          <>
            {wikipedia?.available && wikipedia.summary?.extract ? (
              <div className="rounded-xl bg-[var(--surface-2)] p-2.5 text-[11px] text-[var(--text-secondary)]">
                <div className="mb-1 flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                  <IconBook size={12} className="text-[#E3836C]" /> Wikipedia
                </div>
                <p className="leading-snug text-[var(--text-primary)]">
                  {wikipedia.summary.extract.slice(0, 420)}
                  {wikipedia.summary.extract.length > 420 ? '…' : ''}
                </p>
                {wikipedia.summary.url ? (
                  <a
                    href={wikipedia.summary.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-[10px] text-[#E3836C] underline-offset-2 hover:underline"
                  >
                    Full article
                  </a>
                ) : null}
                {wikipedia.nearby && wikipedia.nearby.length > 0 ? (
                  <p className="mt-1.5 text-[10px] text-[var(--text-muted)]">
                    Nearby pages:{' '}
                    {wikipedia.nearby
                      .slice(0, 5)
                      .map((n) => n.title)
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                ) : null}
              </div>
            ) : null}

            {(country?.available || holidays?.available || elevation?.available) && (
              <div className="rounded-xl bg-[var(--surface-2)] p-2.5 text-[11px] text-[var(--text-secondary)]">
                <div className="mb-1 flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                  <IconWorld size={12} className="text-[#E3836C]" /> Civic
                </div>
                {country?.available ? (
                  <>
                    <p>
                      {country.capital ? `Capital ${country.capital}` : null}
                      {country.population != null ? ` · Pop ${fmtPop(country.population)}` : null}
                      {country.area_km2 != null ? ` · ${Math.round(country.area_km2).toLocaleString()} km²` : null}
                    </p>
                    <p className="mt-0.5">
                      {country.region}
                      {country.subregion ? ` / ${country.subregion}` : ''}
                      {country.languages?.length ? ` · ${country.languages.join(', ')}` : ''}
                    </p>
                    <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                      {country.currencies?.length ? `CCY ${country.currencies.join(', ')}` : ''}
                      {country.calling_codes?.length ? ` · ${country.calling_codes.slice(0, 3).join(' ')}` : ''}
                      {country.car_side ? ` · drive ${country.car_side}` : ''}
                      {country.tld?.length ? ` · ${country.tld[0]}` : ''}
                    </p>
                  </>
                ) : null}
                {elevation?.available && elevation.elevation_m != null ? (
                  <p className="mt-1 flex items-center gap-1">
                    <IconMountain size={11} className="text-[#E3836C]" />
                    Elevation {Math.round(elevation.elevation_m)} m
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
                      {weather.feels_like_c != null ? ` · feels ${Math.round(weather.feels_like_c)}°` : ''}
                      {weather.humidity_pct != null ? ` · ${weather.humidity_pct}% RH` : ''}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                      <IconSun size={11} />
                      UV {weather.uv_index ?? '—'}
                      {weather.wind_speed_kmh != null ? ` · wind ${Math.round(weather.wind_speed_kmh)}` : ''}
                      {weather.pressure_hpa != null ? ` · ${Math.round(weather.pressure_hpa)} hPa` : ''}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      {weather.sunrise ? `↑${timeOnly(weather.sunrise)}` : ''}
                      {weather.sunset ? ` ↓${timeOnly(weather.sunset)}` : ''}
                      {weather.day_length_hours != null ? ` · ${weather.day_length_hours}h day` : ''}
                    </p>
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
                    <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                      {aqi.pm10 != null ? `PM10 ${Math.round(aqi.pm10)}` : ''}
                      {aqi.ozone != null ? ` · O₃ ${Math.round(aqi.ozone)}` : ''}
                      {aqi.no2 != null ? ` · NO₂ ${Math.round(aqi.no2)}` : ''}
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

            {weather?.available && weather.forecast_daily && weather.forecast_daily.length > 0 ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                  <IconSun size={12} className="text-[#E3836C]" /> 7-day forecast
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {weather.forecast_daily.slice(0, 7).map((day, i) => (
                    <div
                      key={day.date || `d-${i}`}
                      className="rounded-lg bg-[var(--surface-2)] px-1 py-1.5 text-center"
                    >
                      <p className="text-[9px] font-mono text-[var(--text-muted)]">{shortDate(day.date)}</p>
                      <p className="text-[10px] font-semibold text-[var(--text-primary)]">
                        {day.temp_max_c != null ? Math.round(day.temp_max_c) : '—'}°
                      </p>
                      <p className="text-[9px] text-[var(--text-muted)]">
                        {day.temp_min_c != null ? Math.round(day.temp_min_c) : '—'}°
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-[var(--surface-2)] p-2.5">
                <div className="mb-1 flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                  <IconWaveSawTool size={12} className="text-[#E3836C]" /> Quakes (30d)
                </div>
                {quakes?.available && quakes.events.length > 0 ? (
                  <ul className="space-y-1 text-[10px] text-[var(--text-secondary)]">
                    {quakes.events.slice(0, 8).map((ev, i) => (
                      <li key={`${ev.time}-${i}`} className="truncate">
                        M{ev.mag}
                        {ev.depth_km != null ? ` · ${Math.round(Number(ev.depth_km))}km deep` : ''}
                        {ev.distance_km != null ? ` · ${Math.round(ev.distance_km)}km` : ''}
                        {ev.place ? ` · ${ev.place}` : ''}
                      </li>
                    ))}
                    {(quakes.count ?? 0) > 8 ? (
                      <li className="text-[var(--text-muted)]">+{(quakes.count ?? 0) - 8} more</li>
                    ) : null}
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
                    {flights.aircraft.slice(0, 6).map((ac, i) => (
                      <li key={`${ac.callsign}-${i}`} className="truncate">
                        {ac.callsign || 'Aircraft'} ·{' '}
                        {ac.distance_km != null ? `${Math.round(ac.distance_km)}km` : ''}
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

            {pois?.available && pois.pois.length > 0 ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                  <IconMapPin size={12} className="text-[#E3836C]" /> Nearby POIs
                  <span className="normal-case tracking-normal text-[var(--text-muted)]">
                    ({pois.count ?? pois.pois.length})
                  </span>
                </div>
                <ul className="space-y-1">
                  {pois.pois.slice(0, 12).map((p, idx) => (
                    <li key={`${p.name}-${idx}`} className="text-[11px] leading-snug text-[var(--text-secondary)]">
                      <span className="text-[var(--text-primary)]">{p.name}</span>
                      {p.kind ? <span className="ml-1 text-[var(--text-muted)]">· {p.kind}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <div className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                <IconNews size={12} className="text-[#E3836C]" /> News
                {news?.count != null ? (
                  <span className="normal-case tracking-normal">({news.count})</span>
                ) : null}
              </div>
              {news?.available && news.articles.length > 0 ? (
                <ul className="space-y-1.5">
                  {news.articles.slice(0, 12).map((art, idx) => (
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
                  {onThisDay.events.slice(0, 5).map((ev, idx) => (
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
