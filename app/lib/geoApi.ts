import { getAuthHeaders } from './auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface PlaceInfo {
  ok?: boolean;
  name: string;
  display_name?: string | null;
  country?: string | null;
  countrycode?: string;
  state?: string | null;
  lat: number;
  lon: number;
  error?: string;
}

export interface WeatherInfo {
  available: boolean;
  temperature_c?: number;
  feels_like_c?: number;
  humidity_pct?: number;
  wind_speed_kmh?: number;
  weather_code?: number;
  source?: string;
  error?: string;
}

export interface NewsArticle {
  title: string;
  url?: string;
  source?: string;
  seendate?: string;
}

export interface NewsInfo {
  available: boolean;
  query?: string;
  articles: NewsArticle[];
  source?: string;
  error?: string;
}

export interface MarketInfo {
  available: boolean;
  reason?: string;
  index_name?: string;
  index_symbol?: string;
  index_value?: {
    ok?: boolean;
    symbol?: string;
    price?: number;
    currency?: string;
    exchange?: string;
    change?: number | null;
    change_pct?: number | null;
  } | null;
  currency?: string;
  fx_rate_to_usd?: {
    ok?: boolean;
    currency?: string;
    rate_to_usd?: number;
    source?: string;
    as_of?: string;
  } | null;
}

export interface PlaceContext {
  ok: boolean;
  cached?: boolean;
  place: PlaceInfo;
  weather: WeatherInfo;
  news: NewsInfo;
  market: MarketInfo;
  chat_prompt?: string;
  error?: string;
}

export async function fetchPlaceContext(latitude: number, longitude: number): Promise<PlaceContext> {
  const res = await fetch(`${API_BASE}/v1/geo/context`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ latitude, longitude }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Place context failed (${res.status})`);
  }
  return res.json();
}
