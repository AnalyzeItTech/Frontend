'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { catalogArchivePoints, fetchRegistryPoints } from './sourceCatalog';
import { calloutFor, resolveChatIngest } from './resolveSources';
import type {
  ChatRunIngest,
  GlobeCamera,
  GlobeMapHandle,
  GlobeVariant,
  MapProjectionMode,
  OverlayPath,
  QueuedFly,
  SourcePoint,
} from './types';
import { DEFAULT_CAMERA } from './types';
import { isGlobePath, MAX_FLY_QUEUE } from './globePerf';

const PlaceMapLibre = dynamic(
  () => import('../map/PlaceMapLibre').then((m) => m.PlaceMapLibre),
  { ssr: false },
);

type MountId = 'mini' | 'full';

interface MountRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface GlobeContextValue {
  variant: GlobeVariant;
  camera: GlobeCamera;
  activePoints: SourcePoint[];
  archivePoints: SourcePoint[];
  selectedPoint: SourcePoint | null;
  inFlight: boolean;
  pendingFlyTarget: SourcePoint | null;
  flyCallout: string | null;
  queuedFlights: QueuedFly[];
  mapReady: boolean;
  transitioning: boolean;
  registerMount: (id: MountId, el: HTMLElement | null) => void;
  flyTo: (
    point: SourcePoint,
    opts?: { zoom?: number; user?: boolean },
  ) => Promise<void>;
  flyToLatLon: (
    lat: number,
    lon: number,
    opts?: { zoom?: number; name?: string; country?: string; hub?: string | null; user?: boolean },
  ) => void;
  selectPoint: (point: SourcePoint | null) => void;
  beginChatRun: () => void;
  ingestChatRun: (input: ChatRunIngest) => void;
  expandToFull: () => void;
  consumeQueuedFly: (id: string) => void;
  dismissQueuedFly: (id: string) => void;
  setComparePlaces: (places: Array<{ lat: number; lon: number; name?: string }>) => void;
  comparePlaces: Array<{ lat: number; lon: number; name?: string }>;
  /** Live event overlays (earthquakes, flights, …) from the full Globe page. */
  overlayPoints: SourcePoint[];
  setOverlayPoints: (points: SourcePoint[]) => void;
  overlayPaths: OverlayPath[];
  setOverlayPaths: (paths: OverlayPath[]) => void;
  showCatalog: boolean;
  setShowCatalog: (on: boolean) => void;
  mapProjection: MapProjectionMode;
  setMapProjection: (mode: MapProjectionMode) => void;
  activeHub: string | null;
  setActiveHub: (name: string | null) => void;
  onMapPlaceSelect?: (place: { lat: number; lon: number }) => void;
  setOnMapPlaceSelect: (fn: ((place: { lat: number; lon: number }) => void) | null) => void;
}

const GlobeContext = createContext<GlobeContextValue | null>(null);

const FLIP_MS = 520;

function sleep(ms: number, gen: number, genRef: { current: number }) {
  return new Promise<void>((resolve) => {
    window.setTimeout(() => {
      if (gen === genRef.current) resolve();
      else resolve();
    }, ms);
  });
}

function readRect(el: HTMLElement | null): MountRect | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 8 || r.height < 8) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export function GlobeProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [variant, setVariant] = useState<GlobeVariant>('parked');
  const [camera, setCamera] = useState<GlobeCamera>(DEFAULT_CAMERA);
  const [activePoints, setActivePoints] = useState<SourcePoint[]>([]);
  const [archivePoints, setArchivePoints] = useState<SourcePoint[]>(() => catalogArchivePoints());
  const [selectedPoint, setSelectedPoint] = useState<SourcePoint | null>(null);
  const [inFlight, setInFlight] = useState(false);
  const [pendingFlyTarget, setPendingFlyTarget] = useState<SourcePoint | null>(null);
  const [flyCallout, setFlyCallout] = useState<string | null>(null);
  const [queuedFlights, setQueuedFlights] = useState<QueuedFly[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [holdMap, setHoldMap] = useState(false);
  const [comparePlaces, setComparePlaces] = useState<Array<{ lat: number; lon: number; name?: string }>>(
    [],
  );
  const [overlayPoints, setOverlayPoints] = useState<SourcePoint[]>([]);
  const [overlayPaths, setOverlayPaths] = useState<OverlayPath[]>([]);
  const [showCatalog, setShowCatalog] = useState(true);
  const [mapProjection, setMapProjection] = useState<MapProjectionMode>('globe');
  const [activeHub, setActiveHub] = useState<string | null>(null);
  const [portalReady, setPortalReady] = useState(false);
  const [stageRect, setStageRect] = useState<MountRect | null>(null);
  const [engineArmed, setEngineArmed] = useState(false);
  const [docHidden, setDocHidden] = useState(false);

  const mountsRef = useRef<{ mini: HTMLElement | null; full: HTMLElement | null }>({
    mini: null,
    full: null,
  });
  const engineRef = useRef<GlobeMapHandle | null>(null);
  const flyGenRef = useRef(0);
  const variantRef = useRef<GlobeVariant>('parked');
  const sequenceRef = useRef<SourcePoint[]>([]);
  const sequenceRunningRef = useRef(false);
  const onMapPlaceSelectRef = useRef<((place: { lat: number; lon: number }) => void) | null>(null);
  const transitioningRef = useRef(false);
  const parkingRef = useRef<HTMLDivElement | null>(null);
  const flipRef = useRef<HTMLDivElement | null>(null);
  const [slotEl, setSlotEl] = useState<HTMLDivElement | null>(null);

  variantRef.current = variant;
  transitioningRef.current = transitioning;

  useEffect(() => {
    setPortalReady(true);
    const el = document.createElement('div');
    el.className = 'globe-map-slot';
    el.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;overflow:hidden';
    setSlotEl(el);
    const onVis = () => setDocHidden(document.hidden);
    onVis();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      el.remove();
      setSlotEl(null);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  useEffect(() => {
    // Catalog HQ pins from GET /v1/sources (near-static). Live weather/markets
    // are not loaded here — only the full Globe page hits POST /v1/geo/context.
    if (!engineArmed) return;
    let cancelled = false;
    void fetchRegistryPoints().then((points) => {
      if (!cancelled && points.length) setArchivePoints(points);
    });
    return () => {
      cancelled = true;
    };
  }, [engineArmed]);

  const syncVariantAndRect = useCallback(() => {
    const full = mountsRef.current.full;
    const mini = mountsRef.current.mini;
    const nextVariant: GlobeVariant = full ? 'full' : mini ? 'mini' : 'parked';
    setVariant(nextVariant);
    variantRef.current = nextVariant;
    const el = full || mini;
    const rect = readRect(el);
    if (rect) setStageRect(rect);
    if (el) {
      setHoldMap(true);
      setEngineArmed(true);
    }
  }, []);

  const registerMount = useCallback(
    (id: MountId, el: HTMLElement | null) => {
      mountsRef.current[id] = el;
      syncVariantAndRect();
    },
    [syncVariantAndRect],
  );

  useEffect(() => {
    const update = () => {
      if (transitioningRef.current) return;
      const el = mountsRef.current.full || mountsRef.current.mini;
      const rect = readRect(el);
      if (rect) setStageRect(rect);
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    const ro = new ResizeObserver(update);
    const mini = mountsRef.current.mini;
    const full = mountsRef.current.full;
    if (mini) ro.observe(mini);
    if (full) ro.observe(full);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      ro.disconnect();
    };
  }, [variant, mapReady]);

  useEffect(() => {
    if (variant !== 'parked' || transitioning) {
      setHoldMap(true);
      setEngineArmed(true);
    }
  }, [variant, transitioning]);

  useEffect(() => {
    if (!engineArmed) return;
    setHoldMap(true);
  }, [engineArmed]);

  const queueIfFull = useCallback((points: SourcePoint[]) => {
    setQueuedFlights((prev) => {
      const seen = new Set(prev.map((q) => q.point.id));
      const add = points.filter((p) => !seen.has(p.id));
      if (!add.length) return prev;
      const next = [
        ...prev,
        ...add.map((point) => ({
          id: `q-${point.id}-${Date.now()}`,
          point,
        })),
      ];
      return next.slice(-MAX_FLY_QUEUE);
    });
  }, []);

  const runFly = useCallback(
    async (point: SourcePoint, opts?: { zoom?: number; user?: boolean }, gen?: number) => {
      const myGen = gen ?? ++flyGenRef.current;
      if (variantRef.current === 'full' && !opts?.user) {
        queueIfFull([point]);
        return;
      }
      setSelectedPoint(point);
      setPendingFlyTarget(point);
      setFlyCallout(calloutFor(point));
      setInFlight(true);
      setActivePoints((prev) => {
        if (prev.some((p) => p.id === point.id)) {
          return prev.map((p) => (p.id === point.id ? { ...p, pulse: true } : p));
        }
        return [...prev, { ...point, pulse: true }];
      });

      let engine = engineRef.current;
      if (!engine) {
        for (let i = 0; i < 40 && myGen === flyGenRef.current; i += 1) {
          await new Promise((r) => window.setTimeout(r, 100));
          engine = engineRef.current;
          if (engine) break;
        }
      }
      if (myGen !== flyGenRef.current) return;
      const zoom =
        opts?.zoom ??
        (variantRef.current === 'mini' ? (point.kind === 'place' ? 2.6 : 2.2) : 5.6);
      if (engine) {
        await engine.flyTo({ lat: point.lat, lon: point.lon, zoom });
      }
      if (myGen !== flyGenRef.current) return;
      setCamera({ lat: point.lat, lng: point.lon, zoom });
      setInFlight(false);
      setPendingFlyTarget(null);
    },
    [queueIfFull],
  );

  const drainSequence = useCallback(async () => {
    if (sequenceRunningRef.current) return;
    sequenceRunningRef.current = true;
    try {
      while (sequenceRef.current.length) {
        const gen = flyGenRef.current;
        if (variantRef.current === 'full') {
          queueIfFull(sequenceRef.current.splice(0));
          break;
        }
        const next = sequenceRef.current.shift();
        if (!next) break;
        await runFly(next, undefined, gen);
        if (gen !== flyGenRef.current) continue;
        await sleep(720, gen, flyGenRef);
      }
    } finally {
      sequenceRunningRef.current = false;
      if (!sequenceRef.current.length) setFlyCallout(null);
      else if (variantRef.current === 'mini') void drainSequence();
    }
  }, [queueIfFull, runFly]);

  const flyTo = useCallback(
    async (point: SourcePoint, opts?: { zoom?: number; user?: boolean }) => {
      flyGenRef.current += 1;
      sequenceRef.current = [];
      await runFly(point, opts, flyGenRef.current);
      setFlyCallout(null);
    },
    [runFly],
  );

  const flyToLatLon = useCallback(
    (
      lat: number,
      lon: number,
      opts?: { zoom?: number; name?: string; country?: string; hub?: string | null; user?: boolean },
    ) => {
      const point: SourcePoint = {
        id: `place:${lat.toFixed(3)}:${lon.toFixed(3)}`,
        lat,
        lon,
        label: opts?.name || `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`,
        kind: 'place',
        pulse: false,
      };
      setActiveHub(opts?.hub ?? null);
      void flyTo(point, { zoom: opts?.zoom, user: opts?.user ?? true });
    },
    [flyTo],
  );

  const selectPoint = useCallback((point: SourcePoint | null) => {
    setSelectedPoint(point);
    if (!point) setActiveHub(null);
  }, []);

  const beginChatRun = useCallback(() => {
    flyGenRef.current += 1;
    sequenceRef.current = [];
    setActivePoints([]);
    setFlyCallout(null);
    setPendingFlyTarget(null);
    setInFlight(false);
  }, []);

  const ingestChatRun = useCallback(
    (input: ChatRunIngest) => {
      void (async () => {
        const points = await resolveChatIngest(input);
        if (!points.length) return;
        setActivePoints((prev) => {
          const seen = new Set(prev.map((p) => p.id));
          const add = points.filter((p) => !seen.has(p.id));
          return add.length ? [...prev, ...add] : prev;
        });
        if (variantRef.current === 'full') {
          queueIfFull(points);
          return;
        }
        if (variantRef.current !== 'mini') return;
        const known = new Set(sequenceRef.current.map((p) => p.id));
        for (const point of points) {
          if (sequenceRef.current.length >= MAX_FLY_QUEUE) break;
          if (!known.has(point.id)) {
            known.add(point.id);
            sequenceRef.current.push(point);
          }
        }
        void drainSequence();
      })();
    },
    [drainSequence, queueIfFull],
  );

  const expandToFull = useCallback(() => {
    const remaining = sequenceRef.current.splice(0);
    if (remaining.length) queueIfFull(remaining);
    const miniRect = readRect(mountsRef.current.mini);
    if (miniRect) setStageRect(miniRect);
    setTransitioning(true);
    transitioningRef.current = true;
    router.push('/globe');
    window.setTimeout(() => {
      setTransitioning(false);
      transitioningRef.current = false;
      engineRef.current?.resize();
      syncVariantAndRect();
    }, FLIP_MS + 80);
  }, [queueIfFull, router, syncVariantAndRect]);

  const consumeQueuedFly = useCallback(
    (id: string) => {
      setQueuedFlights((prev) => {
        const item = prev.find((q) => q.id === id);
        if (item) void flyTo(item.point, { user: true, zoom: 5.8 });
        return prev.filter((q) => q.id !== id);
      });
    },
    [flyTo],
  );

  const dismissQueuedFly = useCallback((id: string) => {
    setQueuedFlights((prev) => prev.filter((q) => q.id !== id));
  }, []);

  const setOnMapPlaceSelect = useCallback(
    (fn: ((place: { lat: number; lon: number }) => void) | null) => {
      onMapPlaceSelectRef.current = fn;
    },
    [],
  );

  const handleMapPlaceSelect = useCallback((place: { lat: number; lon: number; name?: string }) => {
    setActiveHub(null);
    const point: SourcePoint = {
      id: `place:${place.lat.toFixed(3)}:${place.lon.toFixed(3)}`,
      lat: place.lat,
      lon: place.lon,
      label: place.name || `${place.lat.toFixed(2)}°, ${place.lon.toFixed(2)}°`,
      kind: 'place',
    };
    setSelectedPoint(point);
    onMapPlaceSelectRef.current?.(place);
  }, []);

  const handleHubSelect = useCallback(
    (hub: { name: string; lat: number; lon: number }) => {
      flyToLatLon(hub.lat, hub.lon, { name: hub.name, zoom: 5.5, hub: hub.name, user: true });
    },
    [flyToLatLon],
  );

  const handleEngineReady = useCallback((handle: GlobeMapHandle) => {
    engineRef.current = handle;
    setMapReady(true);
    handle.resize();
  }, []);

  useEffect(() => {
    if (!mapReady || transitioning) return;
    const t = window.setTimeout(() => engineRef.current?.resize(), 40);
    return () => window.clearTimeout(t);
  }, [stageRect?.width, stageRect?.height, mapReady, transitioning, variant]);

  useLayoutEffect(() => {
    const slot = slotEl;
    if (!slot) return;
    const full = mountsRef.current.full;
    const mini = mountsRef.current.mini;
    let target: HTMLElement | null = null;
    if (transitioning && flipRef.current) target = flipRef.current;
    else if (full) target = full;
    else if (mini) target = mini;
    else target = parkingRef.current;
    if (target && slot.parentElement !== target) {
      target.appendChild(slot);
    }
    slot.style.pointerEvents = variant === 'full' && !transitioning ? 'auto' : 'none';
    if (!transitioning) engineRef.current?.resize();
  }, [slotEl, transitioning, variant, stageRect, holdMap, portalReady]);

  const showMap = Boolean(holdMap && slotEl);
  const parked = variant === 'parked' && !transitioning;
  const paused = parked || docHidden || (!transitioning && !isGlobePath(pathname));
  const displayRect: MountRect =
    stageRect ||
    (parked
      ? { top: -400, left: -400, width: 8, height: 8 }
      : { top: 0, left: 0, width: 1, height: 1 });
  // Catalog + chat actives + live overlays (earthquakes etc.). LocationIQ/OSM keeps lat/lon honest.
  const displayPoints = useMemo(() => {
    const out: SourcePoint[] = [];
    const seen = new Set<string>();
    const catalog = showCatalog || variant === 'mini' ? archivePoints : [];
    for (const p of [...catalog, ...activePoints, ...overlayPoints]) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      out.push(p);
    }
    return out;
  }, [archivePoints, activePoints, overlayPoints, showCatalog, variant]);

  useEffect(() => {
    if (!mapReady) return;
    if (paused) engineRef.current?.pause();
    else engineRef.current?.resume();
  }, [paused, mapReady]);

  const value = useMemo<GlobeContextValue>(
    () => ({
      variant,
      camera,
      activePoints,
      archivePoints,
      selectedPoint,
      inFlight,
      pendingFlyTarget,
      flyCallout,
      queuedFlights,
      mapReady,
      transitioning,
      registerMount,
      flyTo,
      flyToLatLon,
      selectPoint,
      beginChatRun,
      ingestChatRun,
      expandToFull,
      consumeQueuedFly,
      dismissQueuedFly,
      setComparePlaces,
      comparePlaces,
      overlayPoints,
      setOverlayPoints,
      overlayPaths,
      setOverlayPaths,
      showCatalog,
      setShowCatalog,
      mapProjection,
      setMapProjection,
      activeHub,
      setActiveHub,
      setOnMapPlaceSelect,
    }),
    [
      variant,
      camera,
      activePoints,
      archivePoints,
      selectedPoint,
      inFlight,
      pendingFlyTarget,
      flyCallout,
      queuedFlights,
      mapReady,
      transitioning,
      registerMount,
      flyTo,
      flyToLatLon,
      selectPoint,
      beginChatRun,
      ingestChatRun,
      expandToFull,
      consumeQueuedFly,
      dismissQueuedFly,
      comparePlaces,
      overlayPoints,
      overlayPaths,
      showCatalog,
      mapProjection,
      activeHub,
      setOnMapPlaceSelect,
    ],
  );

  const onChat = pathname === '/research' || pathname?.startsWith('/research');

  return (
    <GlobeContext.Provider value={value}>
      {children}
      <div
        ref={parkingRef}
        className="pointer-events-none fixed -left-[999px] top-0 h-px w-px overflow-hidden opacity-0"
        aria-hidden
      />
      {portalReady && transitioning
        ? createPortal(
            <motion.div
              ref={flipRef}
              className="globe-stage overflow-hidden"
              initial={false}
              animate={{
                top: displayRect.top,
                left: displayRect.left,
                width: displayRect.width,
                height: displayRect.height,
                borderRadius: 0,
              }}
              transition={{ duration: FLIP_MS / 1000, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: 'fixed',
                zIndex: 80,
                pointerEvents: 'none',
              }}
              aria-hidden
            />,
            document.body,
          )
        : null}
      {portalReady && showMap && slotEl
        ? createPortal(
            <PlaceMapLibre
              variant={variant === 'full' ? 'full' : 'mini'}
              selected={
                selectedPoint
                  ? {
                      lat: selectedPoint.lat,
                      lon: selectedPoint.lon,
                      name: selectedPoint.label,
                    }
                  : null
              }
              activeHub={activeHub}
              comparePlaces={comparePlaces}
              sourcePoints={displayPoints}
              overlayPaths={overlayPaths}
              mapProjection={mapProjection}
              hideNavControl
              hideChrome={variant !== 'full'}
              idleDrift={variant === 'mini' && !inFlight && activePoints.length === 0 && onChat && !paused}
              inFlight={inFlight}
              paused={paused}
              freezeResize={transitioning}
              onHubSelect={handleHubSelect}
              onPlaceSelect={handleMapPlaceSelect}
              onEngineReady={handleEngineReady}
              initialCamera={camera}
            />,
            slotEl,
          )
        : null}
    </GlobeContext.Provider>
  );
}

export function useGlobe(): GlobeContextValue {
  const ctx = useContext(GlobeContext);
  if (!ctx) {
    throw new Error('useGlobe must be used within GlobeProvider');
  }
  return ctx;
}

/** Safe on pages that may render before the provider hydrates. */
export function useGlobeOptional(): GlobeContextValue | null {
  return useContext(GlobeContext);
}
