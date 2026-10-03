/**
 * The ~110 hub and catalog-source pins used to be individual page elements that MapLibre re-positioned on every
 * camera frame. As one GeoJSON layer they cost the GPU a draw call instead. Pure functions so the shape is tested
 * without a browser; PlaceMapLibre feeds the result to a <Source>.
 */

/** Pin diameter in px, matching the old DOM sizes. */
export function pinDiameter(point) {
  if (point.kind === 'hub') return 9;
  return point.tier === 'trusted' ? 7 : 5.5;
}

/** Only these kinds move into the map layer; live/place/event pins keep their pulse/label chrome. */
export function isLayerKind(kind) {
  return kind === 'hub' || kind === 'archive';
}

/**
 * @param {Array<{ name: string, lat: number, lon: number }>} hubs
 * @param {Array<{ id: string, lat: number, lon: number, label: string, kind: string, tier?: string, host?: string }>} points
 */
export function sourcePinFeatures(hubs, points) {
  const features = [];
  const seen = new Set();
  const push = (p) => {
    if (seen.has(p.id) || !Number.isFinite(p.lat) || !Number.isFinite(p.lon)) return;
    seen.add(p.id);
    features.push({
      type: 'Feature',
      properties: { id: p.id, kind: p.kind, label: p.label, tier: p.tier || '', r: pinDiameter(p) / 2 },
      geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
    });
  };
  for (const h of hubs || []) push({ id: `hub:${h.name}`, lat: h.lat, lon: h.lon, label: h.name, kind: 'hub' });
  for (const p of points || []) if (isLayerKind(p.kind)) push(p);
  return { type: 'FeatureCollection', features };
}

/**
 * Which layer pin is highlighted: the active hub, else the catalog point at the selected place.
 * @returns {string | null}
 */
export function selectedSourceId(selected, activeHub, points) {
  if (activeHub) return `hub:${activeHub}`;
  if (!selected) return null;
  const hit = (points || []).find(
    (p) =>
      isLayerKind(p.kind) &&
      p.lat === selected.lat &&
      p.lon === selected.lon &&
      (!selected.name || selected.name === p.label),
  );
  return hit ? hit.id : null;
}
