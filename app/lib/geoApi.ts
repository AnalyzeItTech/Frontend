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

export interface LocalClock {
  available: boolean;
  timezone?: string;
  local_time?: string;
  local_date?: string;
  utc_offset?: string;
  source?: string;
}

export interface WeatherInfo {
  available: boolean;
  temperature_c?: number;
  feels_like_c?: number;
  humidity_pct?: number;
  wind_speed_kmh?: number;
  weather_code?: number;
  uv_index?: number;
  uv_index_max?: number;
  sunrise?: string;
  sunset?: string;
  day_length_hours?: number;
  timezone?: string;
  local_clock?: LocalClock;
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

export interface AirQualityInfo {
  available: boolean;
  us_aqi?: number;
  european_aqi?: number;
  pm2_5?: number;
  pm10?: number;
  ozone?: number;
  source?: string;
  error?: string;
}

export interface EarthquakeEvent {
  mag?: number;
  place?: string;
  time?: number;
  url?: string;
  distance_km?: number | null;
}

export interface EarthquakesInfo {
  available: boolean;
  count?: number;
  events: EarthquakeEvent[];
  source?: string;
  window_days?: number;
  error?: string;
}

export interface HolidaysInfo {
  available: boolean;
  countrycode?: string;
  today?: Array<{ name?: string; date?: string }>;
  upcoming?: Array<{ name?: string; date?: string }>;
  source?: string;
  reason?: string;
  error?: string;
}

export interface CountryMetaInfo {
  available: boolean;
  common_name?: string;
  capital?: string;
  region?: string;
  subregion?: string;
  population?: number;
  languages?: string[];
  flag_emoji?: string;
  flag_png?: string;
  currencies?: string[];
  source?: string;
  error?: string;
}

export interface IssInfo {
  available: boolean;
  lat?: number;
  lon?: number;
  distance_km?: number;
  timestamp?: number;
  source?: string;
  error?: string;
}

export interface FlightInfo {
  callsign?: string | null;
  lat?: number;
  lon?: number;
  altitude_m?: number | null;
  velocity_ms?: number | null;
  distance_km?: number;
}

export interface FlightsInfo {
  available: boolean;
  count?: number;
  aircraft: FlightInfo[];
  source?: string;
  error?: string;
}

export interface OnThisDayEvent {
  year?: number;
  text?: string;
  title?: string;
}

export interface OnThisDayInfo {
  available: boolean;
  month?: number;
  day?: number;
  events: OnThisDayEvent[];
  source?: string;
  error?: string;
}

export interface PlaceContext {
  ok: boolean;
  cached?: boolean;
  place: PlaceInfo;
  weather: WeatherInfo;
  news: NewsInfo;
  market: MarketInfo;
  air_quality?: AirQualityInfo;
  earthquakes?: EarthquakesInfo;
  holidays?: HolidaysInfo;
  country?: CountryMetaInfo;
  iss?: IssInfo;
  flights?: FlightsInfo;
  on_this_day?: OnThisDayInfo;
  chat_prompt?: string;
  error?: string;
}

export interface GeoSearchHit {
  name: string;
  display_name?: string;
  country: string;
  region: string;
  lat: number;
  lon: number;
  feature?: string;
  category?: string;
  population?: number;
}

async function searchPlacesOpenMeteo(query: string, limit: number): Promise<GeoSearchHit[]> {
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=${limit}&language=en&format=json`,
  );
  if (!res.ok) return [];
  const data = (await res.json()) as {
    results?: Array<{
      name?: string;
      country?: string;
      admin1?: string;
      admin2?: string;
      latitude: number;
      longitude: number;
      feature_code?: string;
      population?: number;
    }>;
  };
  return (data.results || []).map((row) => {
    const name = String(row.name || '').trim();
    const country = row.country || '';
    const region = row.admin1 || row.admin2 || country || 'World';
    return {
      name,
      display_name: `${name}${country ? `, ${country}` : ''}`,
      country,
      region,
      lat: row.latitude,
      lon: row.longitude,
      feature: row.feature_code,
      population: row.population,
    };
  }).filter((h) => h.name);
}

/** World geocode: backend first, then Open-Meteo in the browser (cities / countries / landmarks). */
export async function searchPlaces(query: string, limit = 8): Promise<GeoSearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  try {
    const res = await fetch(
      `${API_BASE}/v1/geo/search?q=${encodeURIComponent(q)}&limit=${limit}`,
      { headers: getAuthHeaders() },
    );
    if (res.ok) {
      const data = (await res.json()) as { results?: GeoSearchHit[] };
      if (data.results && data.results.length > 0) return data.results;
    }
  } catch {
    /* fall through to Open-Meteo */
  }
  return searchPlacesOpenMeteo(q, limit);
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
