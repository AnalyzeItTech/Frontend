'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Map, { NavigationControl, Marker, type MapRef } from 'react-map-gl/maplibre';
import type { StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

/** Quick-jump hubs only — search still covers any place on Earth. */
export const GLOBE_HUBS = [
  { name: 'San Francisco', lat: 37.7749, lon: -122.4194 },
  { name: 'New York', lat: 40.7128, lon: -74.006 },
  { name: 'London', lat: 51.5074, lon: -0.1278 },
  { name: 'Frankfurt', lat: 50.1109, lon: 8.6821 },
  { name: 'Tokyo', lat: 35.6762, lon: 139.6503 },
  { name: 'Singapore', lat: 1.3521, lon: 103.8198 },
  { name: 'Mumbai', lat: 19.076, lon: 72.8777 },
  { name: 'Sydney', lat: -33.8688, lon: 151.2093 },
  { name: 'São Paulo', lat: -23.5505, lon: -46.6333 },
] as const;

const OPENFREEMAP_FALLBACK = 'https://tiles.openfreemap.org/styles/liberty';

export interface MapPlaceSelection {
  lat: number;
  lon: number;
  name?: string;
  country?: string;
}

interface PlaceMapLibreProps {
  onPlaceSelect?: (place: MapPlaceSelection) => void;
  selected?: MapPlaceSelection | null;
  activeHub?: string | null;
  onHubSelect?: (hub: (typeof GLOBE_HUBS)[number]) => void;
  flyTo?: { lat: number; lon: number; zoom?: number } | null;
  className?: string;
  onMapError?: (message: string) => void;
  onMapReady?: () => void;
}

type MapConfig = {
  provider: 'locationiq' | 'openfreemap';
  mapStyle: string | StyleSpecification;
};

export function PlaceMapLibre({
  onPlaceSelect,
  selected,
  activeHub,
  onHubSelect,
  flyTo,
  className = '',
  onMapError,
  onMapReady,
}: PlaceMapLibreProps) {
  const mapRef = useRef<MapRef | null>(null);
  const [config, setConfig] = useState<MapConfig | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/map/config')
      .then(async (res) => {
        if (!res.ok) throw new Error('Map config failed');
        return res.json() as Promise<MapConfig>;
      })
      .then((data) => {
        if (!cancelled) setConfig(data);
      })
      .catch(() => {
        if (!cancelled) {
          setConfig({ provider: 'openfreemap', mapStyle: OPENFREEMAP_FALLBACK });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleClick = useCallback(
    (event: { lngLat: { lng: number; lat: number } }) => {
      onPlaceSelect?.({ lat: event.lngLat.lat, lon: event.lngLat.lng });
    },
    [onPlaceSelect],
  );

  useEffect(() => {
    if (!flyTo) return;
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({
      center: [flyTo.lon, flyTo.lat],
      zoom: flyTo.zoom ?? Math.max(map.getZoom(), 5.5),
      duration: 1600,
      essential: true,
    });
  }, [flyTo]);

  if (!config) {
    return (
      <div className={`absolute inset-0 flex items-center justify-center bg-[var(--surface-2)] ${className}`}>
        <span className="font-mono text-xs text-[var(--text-muted)]">Preparing map…</span>
      </div>
    );
  }

  const usingLocationIq = config.provider === 'locationiq';

  return (
    <div className={`absolute inset-0 h-full w-full ${className}`}>
      <Map
        ref={mapRef}
        onClick={handleClick}
        mapStyle={config.mapStyle}
        initialViewState={{ longitude: 20, latitude: 18, zoom: 1.35 }}
        attributionControl={{ compact: true }}
        style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
        cursor="crosshair"
        onLoad={(evt) => {
          try {
            const map = evt.target as {
              setProjection?: (p: { type: string }) => void;
              setFog?: (fog: Record<string, unknown> | null) => void;
            };
            map.setProjection?.({ type: 'globe' });
            map.setFog?.({
              color: 'rgb(186, 210, 235)',
              'high-color': 'rgb(36, 92, 223)',
              'horizon-blend': 0.02,
              'space-color': 'rgb(11, 11, 25)',
              'star-intensity': 0.55,
            });
            onMapReady?.();
          } catch (err) {
            onMapError?.(err instanceof Error ? err.message : 'Could not enable globe projection');
          }
        }}
        onError={(evt) => {
          const msg = String(
            (evt as { error?: { message?: string } }).error?.message || 'Map failed to load',
          );
          onMapError?.(msg);
        }}
      >
        <NavigationControl position="top-right" showCompass />
        {GLOBE_HUBS.map((hub) => (
          <Marker
            key={hub.name}
            longitude={hub.lon}
            latitude={hub.lat}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              onHubSelect?.(hub);
            }}
          >
            <button
              type="button"
              title={hub.name}
              className={`h-3 w-3 rounded-full border-2 border-white shadow transition-transform hover:scale-125 ${
                activeHub === hub.name ? 'bg-[#E3836C] scale-125' : 'bg-[#E3836C]/90'
              }`}
              aria-label={`Fly to ${hub.name}`}
            />
          </Marker>
        ))}
        {selected ? (
          <Marker longitude={selected.lon} latitude={selected.lat} anchor="bottom" color="#E3836C" />
        ) : null}
      </Map>

      {!usingLocationIq ? (
        <div className="pointer-events-none absolute left-1/2 top-16 z-10 max-w-sm -translate-x-1/2 rounded-xl border border-amber-500/30 bg-amber-50/95 px-3 py-2 text-center text-[11px] text-amber-900 shadow-lg backdrop-blur">
          Set server-only <code className="font-mono">LOCATIONIQ_KEY</code> (not{' '}
          <code className="font-mono">NEXT_PUBLIC_*</code>) on Vercel. Showing OpenFreeMap fallback.
        </div>
      ) : null}

      <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-lg bg-[var(--surface)]/90 px-2 py-1 text-[10px] font-mono text-[var(--text-muted)] backdrop-blur">
        {usingLocationIq ? 'LocationIQ · proxied · MapLibre globe' : 'OpenFreeMap · MapLibre globe'} ·
        click anywhere
      </div>
    </div>
  );
}
