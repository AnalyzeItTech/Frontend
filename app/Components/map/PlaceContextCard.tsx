'use client';

import { IconCloud, IconNews, IconChartLine, IconMessageDots, IconX, IconLoader2 } from '@tabler/icons-react';
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

  return (
    <div className="app-card pointer-events-auto w-full max-w-md space-y-3 p-4 shadow-xl">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="truncate font-serif text-base font-semibold text-[var(--text-primary)]">
            {loading ? 'Resolving place…' : place?.name || 'Selected place'}
          </h4>
          <p className="truncate text-[10px] font-mono text-[var(--text-muted)]">
            {place?.country || place?.countrycode || '—'}
            {place ? ` · ${place.lat.toFixed(2)}°, ${place.lon.toFixed(2)}°` : ''}
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

      {loading ? (
        <div className="flex items-center gap-2 py-4 text-xs text-[var(--text-secondary)]">
          <IconLoader2 size={16} className="animate-spin text-[#E3836C]" />
          Fetching weather, news, and markets…
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-lg border border-[#B86450]/25 bg-[#B86450]/10 px-3 py-2 text-xs text-[#9B4D3B]">
          {error}
        </p>
      ) : null}

      {!loading && context ? (
        <>
          <div className="grid grid-cols-2 gap-2 border-t border-[var(--border)] pt-3">
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
                  ) : market.currency === 'USD' ? (
                    <p className="text-[10px] text-[var(--text-muted)]">USD</p>
                  ) : null}
                </>
              ) : (
                <p className="text-[11px] text-[var(--text-muted)]">
                  {market?.reason === 'no_market_map' ? 'No index mapped' : 'Unavailable'}
                </p>
              )}
            </div>
          </div>

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
                        className="text-[var(--text-primary)] underline-offset-2 hover:underline"
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

          {onSendToChat && context.chat_prompt ? (
            <button
              type="button"
              className="btn-primary flex w-full items-center justify-center gap-1.5"
              onClick={() => onSendToChat(context.chat_prompt!)}
            >
              <IconMessageDots size={14} />
              Send to chat
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
