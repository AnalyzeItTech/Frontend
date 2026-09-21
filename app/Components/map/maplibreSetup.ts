'use client';

import { setWorkerUrl } from 'maplibre-gl';

let configured = false;

/** MapLibre v6 GeoJSON (ISS orbit line) needs a same-origin worker under Next.js. */
export function ensureMapLibreWorker() {
  if (configured || typeof window === 'undefined') return;
  try {
    setWorkerUrl(`${window.location.origin}/maplibre/maplibre-gl-worker.mjs`);
    configured = true;
  } catch {
    /* older bundles */
  }
}

/** True when a lat/lon faces the camera (map center) on a globe — hide far-side hits. */
export function isFrontFacing(
  camLat: number,
  camLng: number,
  lat: number,
  lng: number,
  /** cos(central angle); ~0 = limb, >0 = front hemisphere */
  minCos = 0.08,
): boolean {
  const φ1 = (lat * Math.PI) / 180;
  const λ1 = (lng * Math.PI) / 180;
  const φ2 = (camLat * Math.PI) / 180;
  const λ2 = (camLng * Math.PI) / 180;
  const cos =
    Math.sin(φ1) * Math.sin(φ2) + Math.cos(φ1) * Math.cos(φ2) * Math.cos(λ1 - λ2);
  return cos > minCos;
}
