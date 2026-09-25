import { dedupePointsByHost, normalizeLatLon, resolveArchivePoints } from './dataQuality.mjs';
import type { SourcePoint, SourceTier } from './types';

/**
 * Default Globe "Sources" pins. Official agencies and statistical seats only.
 * Newsrooms and publisher HQs stay in the lookup table so chat citations can
 * still fly to an editorial seat — they are not painted as a live dataset.
 */
export const DEFAULT_SOURCE_PIN_HOSTS = new Set([
  'usgs.gov',
  'nasa.gov',
  'noaa.gov',
  'cdc.gov',
  'nih.gov',
  'who.int',
  'un.org',
  'worldbank.org',
  'imf.org',
  'oecd.org',
  'ec.europa.eu',
  'eurostat.ec.europa.eu',
  'esa.int',
  'copernicus.eu',
  'data.gov',
  'census.gov',
  'bls.gov',
  'bea.gov',
  'eia.gov',
  'federalreserve.gov',
  'sec.gov',
  'fda.gov',
  'epa.gov',
  'arxiv.org',
  'ourworldindata.org',
  'data.worldbank.org',
  'fred.stlouisfed.org',
  'openstreetmap.org',
  'open-meteo.com',
  'weather.gov',
  'metoffice.gov.uk',
  'ecmwf.int',
  'ipcc.ch',
  'unfccc.int',
  'iea.org',
  'irena.org',
  'fao.org',
  'wto.org',
  'ilo.org',
  'unesco.org',
  'unicef.org',
  'undp.org',
  'reliefweb.int',
  'sipri.org',
  'gov.uk',
  'ons.gov.uk',
  'rbi.org.in',
  'mospi.gov.in',
  'data.gov.in',
  'ibge.gov.br',
  'abs.gov.au',
  'stats.govt.nz',
  'stat.go.jp',
  'stats.gov.cn',
  'destatis.de',
  'insee.fr',
  'ine.es',
  'istat.it',
]);

/** Quick-jump hubs only — search still covers any place on Earth. */
export const GLOBE_HUBS = [
  { name: 'San Francisco', lat: 37.7749, lon: -122.4194 },
  { name: 'New York', lat: 40.7128, lon: -74.006 },
  { name: 'Mexico City', lat: 19.4326, lon: -99.1332 },
  { name: 'Toronto', lat: 43.6532, lon: -79.3832 },
  { name: 'London', lat: 51.5074, lon: -0.1278 },
  { name: 'Paris', lat: 48.8566, lon: 2.3522 },
  { name: 'Frankfurt', lat: 50.1109, lon: 8.6821 },
  { name: 'Cairo', lat: 30.0444, lon: 31.2357 },
  { name: 'Lagos', lat: 6.5244, lon: 3.3792 },
  { name: 'Nairobi', lat: -1.2921, lon: 36.8219 },
  { name: 'Johannesburg', lat: -26.2041, lon: 28.0473 },
  { name: 'Dubai', lat: 25.2048, lon: 55.2708 },
  { name: 'Mumbai', lat: 19.076, lon: 72.8777 },
  { name: 'Delhi', lat: 28.6139, lon: 77.209 },
  { name: 'Singapore', lat: 1.3521, lon: 103.8198 },
  { name: 'Jakarta', lat: -6.2088, lon: 106.8456 },
  { name: 'Tokyo', lat: 35.6762, lon: 139.6503 },
  { name: 'Seoul', lat: 37.5665, lon: 126.978 },
  { name: 'Sydney', lat: -33.8688, lon: 151.2093 },
  { name: 'São Paulo', lat: -23.5505, lon: -46.6333 },
  { name: 'Buenos Aires', lat: -34.6037, lon: -58.3816 },
] as const;

export interface CatalogEntry {
  host: string;
  label: string;
  lat: number;
  lon: number;
  tier: SourceTier;
}

/** HQ / editorial seats for research sources we actually cite — not decorative. */
const ENTRIES: CatalogEntry[] = [
  { host: 'usgs.gov', label: 'USGS', lat: 38.9109, lon: -77.3613, tier: 'trusted' },
  { host: 'nasa.gov', label: 'NASA', lat: 38.883, lon: -77.0163, tier: 'trusted' },
  { host: 'noaa.gov', label: 'NOAA', lat: 38.9916, lon: -77.0303, tier: 'trusted' },
  { host: 'cdc.gov', label: 'CDC', lat: 33.799, lon: -84.328, tier: 'trusted' },
  { host: 'nih.gov', label: 'NIH', lat: 39.004, lon: -77.101, tier: 'trusted' },
  { host: 'who.int', label: 'WHO', lat: 46.233, lon: 6.14, tier: 'trusted' },
  { host: 'un.org', label: 'United Nations', lat: 40.749, lon: -73.968, tier: 'trusted' },
  { host: 'worldbank.org', label: 'World Bank', lat: 38.899, lon: -77.042, tier: 'trusted' },
  { host: 'imf.org', label: 'IMF', lat: 38.899, lon: -77.044, tier: 'trusted' },
  { host: 'oecd.org', label: 'OECD', lat: 48.862, lon: 2.269, tier: 'trusted' },
  { host: 'ec.europa.eu', label: 'European Commission', lat: 50.843, lon: 4.382, tier: 'trusted' },
  { host: 'eurostat.ec.europa.eu', label: 'Eurostat', lat: 49.628, lon: 6.168, tier: 'trusted' },
  { host: 'esa.int', label: 'ESA', lat: 48.847, lon: 2.219, tier: 'trusted' },
  { host: 'copernicus.eu', label: 'Copernicus', lat: 50.85, lon: 4.35, tier: 'trusted' },
  { host: 'data.gov', label: 'Data.gov', lat: 38.883, lon: -77.016, tier: 'trusted' },
  { host: 'census.gov', label: 'US Census', lat: 38.846, lon: -76.936, tier: 'trusted' },
  { host: 'bls.gov', label: 'BLS', lat: 38.9, lon: -77.03, tier: 'trusted' },
  { host: 'bea.gov', label: 'BEA', lat: 38.895, lon: -77.03, tier: 'trusted' },
  { host: 'eia.gov', label: 'EIA', lat: 38.887, lon: -77.026, tier: 'trusted' },
  { host: 'federalreserve.gov', label: 'Federal Reserve', lat: 38.893, lon: -77.045, tier: 'trusted' },
  { host: 'sec.gov', label: 'SEC', lat: 38.897, lon: -77.007, tier: 'trusted' },
  { host: 'fda.gov', label: 'FDA', lat: 39.035, lon: -76.985, tier: 'trusted' },
  { host: 'epa.gov', label: 'EPA', lat: 38.876, lon: -77.029, tier: 'trusted' },
  { host: 'arxiv.org', label: 'arXiv', lat: 42.444, lon: -76.482, tier: 'trusted' },
  { host: 'nature.com', label: 'Nature', lat: 51.533, lon: -0.134, tier: 'trusted' },
  { host: 'science.org', label: 'Science', lat: 38.907, lon: -77.037, tier: 'trusted' },
  { host: 'sciencedirect.com', label: 'ScienceDirect', lat: 52.363, lon: 4.896, tier: 'trusted' },
  { host: 'springer.com', label: 'Springer', lat: 52.505, lon: 13.395, tier: 'trusted' },
  { host: 'wiley.com', label: 'Wiley', lat: 40.76, lon: -74.027, tier: 'candidate' },
  { host: 'cell.com', label: 'Cell', lat: 42.362, lon: -71.082, tier: 'trusted' },
  { host: 'nejm.org', label: 'NEJM', lat: 42.35, lon: -71.066, tier: 'trusted' },
  { host: 'thelancet.com', label: 'The Lancet', lat: 51.516, lon: -0.13, tier: 'trusted' },
  { host: 'ourworldindata.org', label: 'Our World in Data', lat: 51.757, lon: -1.254, tier: 'trusted' },
  { host: 'data.worldbank.org', label: 'World Bank Data', lat: 38.899, lon: -77.042, tier: 'trusted' },
  { host: 'tradingeconomics.com', label: 'Trading Economics', lat: 38.722, lon: -9.139, tier: 'candidate' },
  { host: 'fred.stlouisfed.org', label: 'FRED', lat: 38.628, lon: -90.19, tier: 'trusted' },
  { host: 'bloomberg.com', label: 'Bloomberg', lat: 40.761, lon: -73.997, tier: 'trusted' },
  { host: 'reuters.com', label: 'Reuters', lat: 51.505, lon: -0.09, tier: 'trusted' },
  { host: 'ft.com', label: 'Financial Times', lat: 51.514, lon: -0.095, tier: 'trusted' },
  { host: 'wsj.com', label: 'WSJ', lat: 40.756, lon: -73.991, tier: 'trusted' },
  { host: 'nytimes.com', label: 'NYT', lat: 40.756, lon: -73.99, tier: 'trusted' },
  { host: 'bbc.co.uk', label: 'BBC', lat: 51.518, lon: -0.144, tier: 'trusted' },
  { host: 'bbc.com', label: 'BBC', lat: 51.518, lon: -0.144, tier: 'trusted' },
  { host: 'theguardian.com', label: 'The Guardian', lat: 51.534, lon: -0.122, tier: 'trusted' },
  { host: 'apnews.com', label: 'AP', lat: 40.75, lon: -73.992, tier: 'trusted' },
  { host: 'aljazeera.com', label: 'Al Jazeera', lat: 25.325, lon: 51.441, tier: 'trusted' },
  { host: 'economist.com', label: 'The Economist', lat: 51.513, lon: -0.09, tier: 'trusted' },
  { host: 'wikipedia.org', label: 'Wikipedia', lat: 37.789, lon: -122.403, tier: 'candidate' },
  { host: 'wikidata.org', label: 'Wikidata', lat: 37.789, lon: -122.403, tier: 'candidate' },
  { host: 'github.com', label: 'GitHub', lat: 37.782, lon: -122.393, tier: 'candidate' },
  { host: 'openstreetmap.org', label: 'OpenStreetMap', lat: 52.52, lon: 13.405, tier: 'trusted' },
  { host: 'open-meteo.com', label: 'Open-Meteo', lat: 47.376, lon: 8.541, tier: 'trusted' },
  { host: 'weather.gov', label: 'NWS', lat: 38.993, lon: -77.03, tier: 'trusted' },
  { host: 'metoffice.gov.uk', label: 'Met Office', lat: 50.727, lon: -3.475, tier: 'trusted' },
  { host: 'ecmwf.int', label: 'ECMWF', lat: 51.421, lon: -0.951, tier: 'trusted' },
  { host: 'ipcc.ch', label: 'IPCC', lat: 46.22, lon: 6.14, tier: 'trusted' },
  { host: 'unfccc.int', label: 'UNFCCC', lat: 50.718, lon: 7.126, tier: 'trusted' },
  { host: 'iea.org', label: 'IEA', lat: 48.862, lon: 2.269, tier: 'trusted' },
  { host: 'irena.org', label: 'IRENA', lat: 24.453, lon: 54.377, tier: 'trusted' },
  { host: 'fao.org', label: 'FAO', lat: 41.883, lon: 12.489, tier: 'trusted' },
  { host: 'wto.org', label: 'WTO', lat: 46.22, lon: 6.14, tier: 'trusted' },
  { host: 'ilo.org', label: 'ILO', lat: 46.229, lon: 6.14, tier: 'trusted' },
  { host: 'unesco.org', label: 'UNESCO', lat: 48.85, lon: 2.306, tier: 'trusted' },
  { host: 'unicef.org', label: 'UNICEF', lat: 40.754, lon: -73.97, tier: 'trusted' },
  { host: 'undp.org', label: 'UNDP', lat: 40.751, lon: -73.97, tier: 'trusted' },
  { host: 'reliefweb.int', label: 'ReliefWeb', lat: 40.749, lon: -73.968, tier: 'trusted' },
  { host: 'acleddata.com', label: 'ACLED', lat: 38.907, lon: -77.037, tier: 'candidate' },
  { host: 'sipri.org', label: 'SIPRI', lat: 59.338, lon: 18.058, tier: 'trusted' },
  { host: 'rand.org', label: 'RAND', lat: 34.053, lon: -118.49, tier: 'trusted' },
  { host: 'brookings.edu', label: 'Brookings', lat: 38.909, lon: -77.051, tier: 'trusted' },
  { host: 'cfr.org', label: 'CFR', lat: 40.767, lon: -73.97, tier: 'trusted' },
  { host: 'chathamhouse.org', label: 'Chatham House', lat: 51.508, lon: -0.147, tier: 'trusted' },
  { host: 'statista.com', label: 'Statista', lat: 53.551, lon: 9.994, tier: 'candidate' },
  { host: 'macrotrends.net', label: 'Macrotrends', lat: 33.448, lon: -112.074, tier: 'candidate' },
  { host: 'investing.com', label: 'Investing.com', lat: 32.085, lon: 34.781, tier: 'candidate' },
  { host: 'yahoo.com', label: 'Yahoo Finance', lat: 37.417, lon: -122.025, tier: 'candidate' },
  { host: 'finance.yahoo.com', label: 'Yahoo Finance', lat: 37.417, lon: -122.025, tier: 'candidate' },
  { host: 'marketwatch.com', label: 'MarketWatch', lat: 40.756, lon: -73.991, tier: 'candidate' },
  { host: 'cnbc.com', label: 'CNBC', lat: 40.76, lon: -73.991, tier: 'candidate' },
  { host: 'npr.org', label: 'NPR', lat: 38.9, lon: -77.028, tier: 'trusted' },
  { host: 'pbs.org', label: 'PBS', lat: 38.9, lon: -77.04, tier: 'trusted' },
  { host: 'gov.uk', label: 'GOV.UK', lat: 51.504, lon: -0.127, tier: 'trusted' },
  { host: 'ons.gov.uk', label: 'ONS', lat: 51.455, lon: -0.97, tier: 'trusted' },
  { host: 'rbi.org.in', label: 'RBI', lat: 18.933, lon: 72.835, tier: 'trusted' },
  { host: 'mospi.gov.in', label: 'MoSPI', lat: 28.613, lon: 77.209, tier: 'trusted' },
  { host: 'data.gov.in', label: 'data.gov.in', lat: 28.613, lon: 77.209, tier: 'trusted' },
  { host: 'ibge.gov.br', label: 'IBGE', lat: -22.91, lon: -43.173, tier: 'trusted' },
  { host: 'abs.gov.au', label: 'ABS', lat: -35.297, lon: 149.131, tier: 'trusted' },
  { host: 'stats.govt.nz', label: 'Stats NZ', lat: -41.286, lon: 174.776, tier: 'trusted' },
  { host: 'stat.go.jp', label: 'Statistics Bureau JP', lat: 35.689, lon: 139.692, tier: 'trusted' },
  { host: 'stats.gov.cn', label: 'NBS China', lat: 39.904, lon: 116.407, tier: 'trusted' },
  { host: 'destatis.de', label: 'Destatis', lat: 50.082, lon: 8.244, tier: 'trusted' },
  { host: 'insee.fr', label: 'INSEE', lat: 48.821, lon: 2.307, tier: 'trusted' },
  { host: 'ine.es', label: 'INE Spain', lat: 40.445, lon: -3.692, tier: 'trusted' },
  { host: 'istat.it', label: 'Istat', lat: 41.907, lon: 12.497, tier: 'trusted' },
  { host: 'g1.globo.com', label: 'G1', lat: -22.952, lon: -43.211, tier: 'candidate' },
  { host: 'timesofindia.indiatimes.com', label: 'Times of India', lat: 19.076, lon: 72.877, tier: 'candidate' },
  { host: 'thehindu.com', label: 'The Hindu', lat: 13.083, lon: 80.27, tier: 'candidate' },
  { host: 'scmp.com', label: 'SCMP', lat: 22.278, lon: 114.175, tier: 'candidate' },
  { host: 'nikkei.com', label: 'Nikkei', lat: 35.687, lon: 139.763, tier: 'trusted' },
  { host: 'stripes.com', label: 'Stars and Stripes', lat: 38.907, lon: -77.037, tier: 'candidate' },
];

const BY_HOST = new Map(ENTRIES.map((e) => [e.host, e]));

export function normalizeHost(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .split(':')[0];
}

export function lookupSourceHost(host: string): CatalogEntry | null {
  const h = normalizeHost(host);
  if (!h) return null;
  const direct = BY_HOST.get(h);
  if (direct) return direct;
  const parts = h.split('.');
  for (let i = 1; i < parts.length - 1; i += 1) {
    const candidate = parts.slice(i).join('.');
    const hit = BY_HOST.get(candidate);
    if (hit) return hit;
  }
  if (parts.length >= 2) {
    const root = parts.slice(-2).join('.');
    const hit = BY_HOST.get(root);
    if (hit) return hit;
  }
  return null;
}

export function catalogArchivePoints(opts?: { mode?: 'curated' | 'all' }): SourcePoint[] {
  const mode = opts?.mode ?? 'curated';
  const points: SourcePoint[] = [];
  for (const entry of ENTRIES) {
    if (mode === 'curated' && !DEFAULT_SOURCE_PIN_HOSTS.has(entry.host)) continue;
    const coords = normalizeLatLon(entry.lat, entry.lon);
    if (!coords) continue;
    points.push({
      id: `archive:${entry.host}`,
      lat: coords.lat,
      lon: coords.lon,
      label: entry.label,
      host: entry.host,
      source_id: entry.host,
      kind: 'archive',
      tier: entry.tier,
      pulse: false,
    });
  }
  return dedupePointsByHost(points) as SourcePoint[];
}

export function hubPoints(): SourcePoint[] {
  return GLOBE_HUBS.map((hub) => ({
    id: `hub:${hub.name}`,
    lat: hub.lat,
    lon: hub.lon,
    label: hub.name,
    kind: 'hub' as const,
    pulse: false,
  }));
}

/** Catalog HQ pins from GET /v1/sources (near-static). Not project-scoped usage. */
export async function fetchRegistryPoints(): Promise<SourcePoint[]> {
  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  try {
    const { getAuthHeaders } = await import('../../lib/auth');
    const res = await fetch(`${api}/v1/sources`, { headers: getAuthHeaders() });
    if (!res.ok) return catalogArchivePoints();
    const data = (await res.json()) as {
      sources?: Array<{
        source_id?: string;
        title?: string;
        domain?: string;
        lat?: number;
        lng?: number;
        lon?: number;
        category?: string;
      }>;
    };
    const points: SourcePoint[] = [];
    for (const row of data.sources || []) {
      const coords = normalizeLatLon(row.lat, row.lng ?? row.lon);
      if (!coords) continue;
      const host = row.domain || row.source_id || '';
      if (!host) continue;
      const known = lookupSourceHost(host);
      points.push({
        id: `archive:${row.source_id || host}`,
        lat: coords.lat,
        lon: coords.lon,
        label: row.title || known?.label || host,
        host,
        source_id: row.source_id,
        kind: 'archive',
        tier: known?.tier || 'candidate',
        pulse: false,
      });
    }
    return resolveArchivePoints(catalogArchivePoints(), points).points as SourcePoint[];
  } catch {
    return catalogArchivePoints();
  }
}
