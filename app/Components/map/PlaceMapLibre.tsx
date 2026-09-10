'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import Map, { NavigationControl, Marker, Source, Layer, type MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

const OPENFREEMAP_STYLE =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/liberty';

const GIBS_TILES = [
  'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/2024-06-01/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg',
];

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
  const mapRef = useRef<MapRef | null>(null);

  const handleClick = useCallback(
    (event: { lngLat: { lng: number; lat: number } }) => {
      onPlaceSelect?.({ lat: event.lngLat.lat, lon: event.lngLat.lng });
    },
    [onPlaceSelect],
  );

  useEffect(() => {
    if (!selected) return;
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({
      center: [selected.lon, selected.lat],
      zoom: Math.max(map.getZoom(), 8.5),
      duration: 1200,
    });
  }, [selected]);

  const satelliteSource = useMemo(
    () => ({
      type: 'raster' as const,
      tiles: GIBS_TILES,
      tileSize: 256,
      attribution: 'Imagery © NASA GIBS',
      maxzoom: 9,
    }),
    [],
  );

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      <Map
        ref={mapRef}
        onClick={handleClick}
        mapStyle={OPENFREEMAP_STYLE}
        initialViewState={{ longitude: 0, latitude: 20, zoom: 1.8 }}
        attributionControl={{ compact: true }}
        style={{ width: '100%', height: '100%' }}
        cursor="crosshair"
      >
        <NavigationControl position="top-right" showCompass />
        {showSatellite ? (
          <Source id="gibs-modis" {...satelliteSource}>
            <Layer id="gibs-modis-layer" type="raster" paint={{ 'raster-opacity': 0.72 }} />
          </Source>
        ) : null}
        {selected ? (
          <Marker longitude={selected.lon} latitude={selected.lat} anchor="bottom" color="#E3836C" />
        ) : null}
      </Map>
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-[var(--surface)]/90 px-2 py-1 text-[10px] font-mono text-[var(--text-muted)] backdrop-blur">
        OpenStreetMap · OpenFreeMap · click or search anywhere
      </div>
    </div>
  );
}
