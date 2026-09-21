import * as THREE from 'three';

/**
 * Single geographic convention for the cinematic globe.
 *
 * Equirectangular texture (Natural Earth / GeoJSON lon,lat):
 *   u = (lon + 180) / 360     lon -180 → 0, lon 0 → 0.5, lon +180 → 1
 *   canvasY = (90 - lat) / 180  lat +90 at top of canvas
 *
 * THREE.SphereGeometry default UVs + CanvasTexture.flipY=true map that
 * canvas onto the sphere with:
 *   lon -180 at world -X (texture seam)
 *   lon 0 (Greenwich) at world +X
 *   north pole at +Y
 *
 * Pins, arcs, camera fly-to, and click picking MUST use latLonToVec /
 * vecToLatLon. Never rotate the earth mesh — only the camera — or land
 * and locations will slide off their coordinates.
 */

export function lonLatToCanvas(
  lon: number,
  lat: number,
  width: number,
  height: number,
): { x: number; y: number } {
  return {
    x: ((lon + 180) / 360) * width,
    y: ((90 - lat) / 180) * height,
  };
}

export function latLonToVec(lat: number, lon: number, r: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(r * Math.sin(phi) * Math.cos(theta)),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

export function vecToLatLon(point: THREE.Vector3): { lat: number; lon: number } {
  const n = point.clone().normalize();
  const phi = Math.acos(Math.max(-1, Math.min(1, n.y)));
  const theta = Math.atan2(n.z, -n.x);
  const lat = 90 - (phi * 180) / Math.PI;
  let lon = (theta * 180) / Math.PI - 180;
  if (lon < -180) lon += 360;
  if (lon > 180) lon -= 360;
  return { lat, lon };
}

/** Make successive longitudes continuous so rings that cross ±180 don't tear. */
export function unwrapRing(coords: Array<[number, number]>): Array<[number, number]> {
  if (coords.length === 0) return [];
  const out: Array<[number, number]> = [];
  let prevLon = coords[0][0];
  let offset = 0;
  for (const [lon, lat] of coords) {
    const d = lon - prevLon;
    if (d > 180) offset -= 360;
    else if (d < -180) offset += 360;
    out.push([lon + offset, lat]);
    prevLon = lon;
  }
  return out;
}

export function fillUnwrappedRing(
  ctx: CanvasRenderingContext2D,
  coords: Array<[number, number]>,
  width: number,
  height: number,
): void {
  const unwrapped = unwrapRing(coords);
  if (unwrapped.length < 3) return;
  for (const shift of [-360, 0, 360]) {
    ctx.beginPath();
    for (let i = 0; i < unwrapped.length; i += 1) {
      const [lon, lat] = unwrapped[i];
      const { x, y } = lonLatToCanvas(lon + shift, lat, width, height);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }
}

export function strokeUnwrappedRing(
  ctx: CanvasRenderingContext2D,
  coords: Array<[number, number]>,
  width: number,
  height: number,
): void {
  const unwrapped = unwrapRing(coords);
  if (unwrapped.length < 2) return;
  for (const shift of [-360, 0, 360]) {
    ctx.beginPath();
    for (let i = 0; i < unwrapped.length; i += 1) {
      const [lon, lat] = unwrapped[i];
      const { x, y } = lonLatToCanvas(lon + shift, lat, width, height);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }
}
