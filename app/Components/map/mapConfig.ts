/**
 * Basemap config is static per theme. Every map mount (mini globe, full globe, theme flips) used to refetch it;
 * share one request per theme for the life of the page.
 */
export type MapConfig = { provider: 'locationiq' | 'openfreemap'; theme?: string; mapStyle: string };

const inflight = new Map<string, Promise<MapConfig>>();

export function loadMapConfig(theme: string): Promise<MapConfig> {
  let p = inflight.get(theme);
  if (!p) {
    p = fetch(`/api/map/config?theme=${encodeURIComponent(theme)}`).then(async (res) => {
      if (!res.ok) throw new Error('Map config failed');
      return (await res.json()) as MapConfig;
    });
    // A failed fetch must not be remembered, or the fallback style would be stuck until reload.
    p.catch(() => inflight.delete(theme));
    inflight.set(theme, p);
  }
  return p;
}
