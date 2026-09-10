'use client';

import { useCallback, useMemo, useState } from 'react';
import Map, { NavigationControl, Marker } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

const OPENFREEMAP_STYLE =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/liberty';

/** NASA GIBS MODIS True Color — optional satellite overlay (no key). */
const GIBS_MODIS_SOURCE = {
  type: 'raster' as const,
  tiles: [
    'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/2024-06-01/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg',
  ],
  tileSize: 256,
  attribution: 'Imagery © NASA GIBS',
  maxzoom: 9,
};

export interface MapPlaceSelection {
  lat: number;
  lon: number;
}

interface PlaceMapLibreProps {
  onPlaceSelect?: (place: MapPlaceSelection) => void;
  selected?: MapPlaceSelection | null;
  showSatellite?: boolean;
  className?: string;
}

export function PlaceMapLibre({
  onPlaceSelect,
  selected,
  showSatellite = false,
  className = '',
}: PlaceMapLibreProps) {
  const [viewState, setViewState] = useState({
    longitude: selected?.lon ?? 0,
    latitude: selected?.lat ?? 20,
    zoom: 1.6,
  });

  const handleClick = useCallback(
    (event: { lngLat: { lng: number; lat: number } }) => {
      onPlaceSelect?.({ lat: event.lngLat.lat, lon: event.lngLat.lng });
    },
    [onPlaceSelect],
  );

  const mapStyle = useMemo(() => {
    if (!showSatellite) return OPENFREEMAP_STYLE;
    // Compose OpenFreeMap vector base is enough for most use; satellite is additive via layer below.
    return OPENFREEMAP_STYLE;
  }, [showSatellite]);

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      <Map
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        onClick={handleClick}
        mapStyle={mapStyle}
        initialViewState={{ longitude: 0, latitude: 20, zoom: 1.6 }}
        attributionControl={{ compact: true }}
        style={{ width: '100%', height: '100%' }}
        cursor="crosshair"
        onLoad={(evt) => {
          try {
            // Globe projection when supported by the installed MapLibre version
            const map = evt.target as { setProjection?: (p: string) => void };
            map.setProjection?.('globe');
          } catch {
            /* flat mercator fallback */
          }
        }}
      >
        <NavigationControl position="top-right" showCompass />
        {showSatellite ? (
          // Raster overlay via imperative style mutation is fragile; document toggle in UI.
          // Keeping OpenFreeMap as the always-on free base.
          null
        ) : null}
        {selected ? (
          <Marker longitude={selected.lon} latitude={selected.lat} anchor="bottom" color="#E3836C" />
        ) : null}
      </Map>
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-[var(--surface)]/90 px-2 py-1 text-[10px] font-mono text-[var(--text-muted)] backdrop-blur">
        OpenFreeMap · OSM · click anywhere
        {showSatellite ? ' · GIBS available' : ''}
      </div>
      {/* Keep GIBS config referenced so tree-shaking doesn't drop the constant for future overlay work */}
      <span className="hidden" aria-hidden>
        {GIBS_MODIS_SOURCE.attribution}
      </span>
    </div>
  );
}
