/** Browser calls same-origin Next proxies so CORS / wrong API host cannot break Globe. */
const GEO_CONTEXT_URL = '/api/geo/context';
const GEO_SEARCH_URL = '/api/geo/search';
const GEO_EVENTS_URL = '/api/geo/events';

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

export interface WeatherDay {
  date?: string;
  weather_code?: number | null;
  temp_max_c?: number | null;
  temp_min_c?: number | null;
  precip_mm?: number | null;
  uv_index_max?: number | null;
  wind_max_kmh?: number | null;
}

export interface WeatherHour {
  time?: string;
  temp_c?: number | null;
  precip_prob?: number | null;
  weather_code?: number | null;
}

export interface WeatherInfo {
  available: boolean;
  temperature_c?: number;
  feels_like_c?: number;
  humidity_pct?: number;
  wind_speed_kmh?: number;
  wind_direction_deg?: number;
  precipitation_mm?: number;
  cloud_cover_pct?: number;
  pressure_hpa?: number;
  visibility_m?: number;
  weather_code?: number;
  uv_index?: number;
  uv_index_max?: number;
  sunrise?: string;
  sunset?: string;
  day_length_hours?: number;
  timezone?: string;
  local_clock?: LocalClock;
  forecast_daily?: WeatherDay[];
  forecast_hourly?: WeatherHour[];
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
  count?: number;
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
  no2?: number;
  so2?: number;
  co?: number;
  source?: string;
  error?: string;
}

export interface EarthquakeEvent {
  id?: string;
  mag?: number;
  place?: string;
  time?: number;
  url?: string;
  lat?: number;
  lon?: number;
  depth_km?: number | null;
  distance_km?: number | null;
  tsunami?: number;
  type?: string;
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
  official_name?: string;
  capital?: string;
  capitals?: string[];
  region?: string;
  subregion?: string;
  population?: number;
  area_km2?: number;
  languages?: string[];
  flag_emoji?: string;
  flag_png?: string;
  currencies?: string[];
  currency_names?: Record<string, string | undefined>;
  timezones?: string[];
  borders?: string[];
  tld?: string[];
  calling_codes?: string[];
  independent?: boolean;
  un_member?: boolean;
  car_side?: string;
  source?: string;
  error?: string;
}

export interface ElevationInfo {
  available: boolean;
  elevation_m?: number | null;
  source?: string;
  error?: string;
}

export interface WikipediaSummary {
  title?: string;
  extract?: string;
  description?: string;
  url?: string;
  thumbnail?: string;
  coordinates?: { lat?: number; lon?: number };
}

export interface WikipediaNearby {
  title?: string;
  distance_m?: number;
  lat?: number;
  lon?: number;
  url?: string;
}

export interface WikipediaInfo {
  available: boolean;
  summary?: WikipediaSummary | null;
  nearby?: WikipediaNearby[];
  source?: string;
  reason?: string;
  error?: string;
}

export interface PoiItem {
  name: string;
  kind?: string;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
}

export interface PoisInfo {
  available: boolean;
  count?: number;
  pois: PoiItem[];
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
  elevation?: ElevationInfo;
  news: NewsInfo;
  market: MarketInfo;
  air_quality?: AirQualityInfo;
  earthquakes?: EarthquakesInfo;
  holidays?: HolidaysInfo;
  country?: CountryMetaInfo;
  iss?: IssInfo;
  flights?: FlightsInfo;
  on_this_day?: OnThisDayInfo;
  wikipedia?: WikipediaInfo;
  pois?: PoisInfo;
  layers_available?: number;
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

/** World geocode: same-origin proxy first, then Open-Meteo in the browser. */
export async function searchPlaces(query: string, limit = 8): Promise<GeoSearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  try {
    const res = await fetch(`${GEO_SEARCH_URL}?q=${encodeURIComponent(q)}&limit=${limit}`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const data = (await res.json()) as { results?: GeoSearchHit[] };
      if (data.results && data.results.length > 0) return data.results;
    }
  } catch {
    /* fall through to Open-Meteo */
  }
  return searchPlacesOpenMeteo(q, limit);
}

const PLACE_CONTEXT_TIMEOUT_MS = 20_000;
const GLOBE_EVENTS_TIMEOUT_MS = 20_000;

function combineSignals(parent: AbortSignal | undefined, timeoutMs: number): {
  signal: AbortSignal;
  clear: () => void;
  timedOut: () => boolean;
} {
  const controller = new AbortController();
  let didTimeout = false;
  const timer = setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, timeoutMs);
  const onAbort = () => controller.abort();
  if (parent?.aborted) controller.abort();
  else parent?.addEventListener('abort', onAbort, { once: true });
  return {
    signal: controller.signal,
    clear: () => {
      clearTimeout(timer);
      parent?.removeEventListener('abort', onAbort);
    },
    timedOut: () => didTimeout && !parent?.aborted,
  };
}

/** Full Globe page only. Chat mini-globe must not call this. */
export async function fetchPlaceContext(
  latitude: number,
  longitude: number,
  opts?: { signal?: AbortSignal },
): Promise<PlaceContext> {
  const linked = combineSignals(opts?.signal, PLACE_CONTEXT_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(GEO_CONTEXT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      signal: linked.signal,
      body: JSON.stringify({ latitude, longitude }),
    });
  } catch (err) {
    if (linked.timedOut()) {
      throw new Error('Place context timed out. Retry to load this place again.');
    }
    if (opts?.signal?.aborted) {
      throw err;
    }
    const msg = err instanceof Error ? err.message : 'Network error';
    throw new Error(
      msg === 'Load failed' || msg === 'Failed to fetch'
        ? 'Could not reach place context API. Check network and API URL.'
        : msg,
    );
  } finally {
    linked.clear();
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail = body && typeof body === 'object' ? (body as { detail?: unknown }).detail : null;
    const detailText =
      typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail
              .map((d) =>
                typeof d === 'object' && d && 'msg' in d ? String((d as { msg: unknown }).msg) : String(d),
              )
              .join('; ')
          : null;
    throw new Error(detailText || `Place context failed (${res.status})`);
  }
  return res.json();
}

export interface GlobeLayerEvents {
  available?: boolean;
  layer?: string;
  count?: number;
  events?: Array<{
    id?: string;
    lat?: number;
    lon?: number;
    place?: string;
    label?: string;
    mag?: number;
    type?: string;
    time?: number;
    url?: string;
    temperature_c?: number;
    callsign?: string | null;
    altitude_m?: number | null;
    geo_altitude_m?: number | null;
    velocity_ms?: number | null;
    track_deg?: number | null;
    vertical_rate_ms?: number | null;
    on_ground?: boolean | null;
    squawk?: string | null;
    origin_country?: string | null;
    last_seen?: number | null;
    category?: string | null;
    icao?: string | null;
    typecode?: string | null;
    registration?: string | null;
    aircraft_desc?: string | null;
    hub?: string | null;
    route_available?: boolean;
    elevation_m?: number;
    us_aqi?: number;
    european_aqi?: number;
    index_name?: string;
    index_symbol?: string;
    price?: number;
    change_pct?: number;
  }>;
  path?: Array<{ lat: number; lon: number; timestamp?: number }>;
  source?: string;
  error?: string;
  window_days?: number;
  min_magnitude?: number;
}

export interface GlobeEventsResponse {
  ok: boolean;
  cached?: boolean;
  layers: {
    earthquakes?: GlobeLayerEvents;
    disasters?: GlobeLayerEvents;
    wildfires?: GlobeLayerEvents;
    storms?: GlobeLayerEvents;
    volcanoes?: GlobeLayerEvents;
    weather?: GlobeLayerEvents;
    air_quality?: GlobeLayerEvents;
    markets?: GlobeLayerEvents;
    flights?: GlobeLayerEvents;
    iss?: GlobeLayerEvents;
    space_weather?: GlobeLayerEvents;
    elevation?: GlobeLayerEvents;
  };
}

/** Worldwide overlays for Globe layers (USGS earthquakes, …). */
export async function fetchGlobeEvents(opts?: {
  layers?: string[];
  minMagnitude?: number;
  days?: number;
  signal?: AbortSignal;
}): Promise<GlobeEventsResponse> {
  const params = new URLSearchParams();
  params.set('layers', (opts?.layers || ['earthquakes']).join(','));
  if (opts?.minMagnitude != null) params.set('min_magnitude', String(opts.minMagnitude));
  if (opts?.days != null) params.set('days', String(opts.days));
  const linked = combineSignals(opts?.signal, GLOBE_EVENTS_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${GEO_EVENTS_URL}?${params.toString()}`, {
      cache: 'no-store',
      signal: linked.signal,
    });
  } catch (err) {
    if (linked.timedOut()) throw new Error('Globe layer timed out');
    throw err;
  } finally {
    linked.clear();
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail =
      body && typeof body === 'object' && 'detail' in body
        ? String((body as { detail: unknown }).detail)
        : null;
    throw new Error(detail || `Globe events failed (${res.status})`);
  }
  return res.json();
}
