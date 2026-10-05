'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback, useLayoutEffect, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';

declare global {
  interface Window {
    __ANALYZIT_SCENE_SKIP__?: string;
    __ANALYZIT_HASH_SCROLLED__?: string;
    // __ANALYZIT_LENIS__ is declared once in SmoothScrollProvider (Lenis | null).
  }
}
import { Navbar } from './Navbar';
import { InspectDrawer, DrawerDetail } from './InspectDrawer';
import { LandingProgressContext } from './LandingProgressContext';
import { LoadingScreen } from '../ui/LoadingScreen';
import { SceneBackdrop } from './SceneBackdrop';
import { hashId, LANDING_NAV_OFFSET_PX, landingHashScrollTop } from '../../lib/loaderProgress.mjs';

const SceneCanvas = dynamic(
  () => import('../3d/SceneCanvas').then((mod) => mod.SceneCanvas),
  { ssr: false }
);

function subscribeClient(onStoreChange: () => void) {
  if (typeof window === 'undefined') return () => {};
  const onSkip = () => onStoreChange();
  document.addEventListener('analyzit-scene-skip', onSkip);
  // Boot may have already dismissed before hydrate.
  if (window.__ANALYZIT_SCENE_SKIP__) {
    queueMicrotask(onStoreChange);
  }
  return () => document.removeEventListener('analyzit-scene-skip', onSkip);
}

type SceneMode = 'pending' | 'reduced' | 'fallback' | 'webgl';

let sceneModeCache: Exclude<SceneMode, 'pending'> | null = null;

/** Cached so the client snapshot stays stable across renders. */
function readSceneMode(): Exclude<SceneMode, 'pending'> {
  if (typeof window === 'undefined') return 'webgl';
  if (sceneModeCache) return sceneModeCache;
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      sceneModeCache = 'reduced';
    } else {
      const lowCores = navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency < 2;
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      sceneModeCache = lowCores || !gl ? 'fallback' : 'webgl';
    }
  } catch {
    sceneModeCache = 'webgl';
  }
  return sceneModeCache;
}

function readBootSkip() {
  return window.__ANALYZIT_SCENE_SKIP__ ?? '';
}

type LenisLike = { scrollTo: (target: number | string, opts?: Record<string, unknown>) => void };

function scrollToHash(opts?: { force?: boolean }) {
  const id = hashId(window.location.hash);
  if (!id) return false;
  // Without force, skip if we already claimed this hash for this navigation.
  if (!opts?.force && window.__ANALYZIT_HASH_SCROLLED__ === id) return false;
  const el = document.getElementById(id);
  if (!el) return false;
  const absTop = el.getBoundingClientRect().top + (window.scrollY || window.pageYOffset || 0);
  const top = landingHashScrollTop(absTop, LANDING_NAV_OFFSET_PX);
  const lenis = (window as Window & { __ANALYZIT_LENIS__?: LenisLike | null }).__ANALYZIT_LENIS__;
  if (lenis && typeof lenis.scrollTo === 'function') {
    lenis.scrollTo(top, { immediate: true, force: true });
  } else {
    window.scrollTo({ top, left: 0, behavior: 'auto' });
  }
  window.__ANALYZIT_HASH_SCROLLED__ = id;
  return true;
}

export function LandingExperience({ children }: { children: React.ReactNode }) {
  const [dismissed, setDismissed] = useState(false);
  const [isCanvasVisible, setIsCanvasVisible] = useState(true);
  const [allowScene, setAllowScene] = useState(false);
  const [sceneProgress, setSceneProgress] = useState<number | null>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [inspectedDetail, setInspectedDetail] = useState<DrawerDetail | null>(null);
  const scrollProgressRef = useRef(0);
  const bootSkip = useSyncExternalStore(subscribeClient, readBootSkip, () => '');
  const sceneMode = useSyncExternalStore(subscribeClient, readSceneMode, () => 'pending' as const);
  const staticFallback = sceneMode === 'fallback';
  // Reduced motion, a missing progress event, Skip, and the 8s cap all clear the loader.
  // `pending` is the server snapshot so the first HTML still shows the loader and Skip.
  const isLoading =
    !dismissed &&
    bootSkip === '' &&
    !sceneReady &&
    sceneMode !== 'fallback' &&
    sceneMode !== 'reduced';

  const handleLoadComplete = useCallback(() => {
    window.__ANALYZIT_SCENE_SKIP__ = window.__ANALYZIT_SCENE_SKIP__ || 'ready';
    document.documentElement.classList.add('scene-skipped');
    setDismissed(true);
  }, []);

  useLayoutEffect(() => {
    const root = document.documentElement;
    if (isLoading) {
      root.dataset.sceneLoader = '1';
      return () => {
        delete root.dataset.sceneLoader;
      };
    }
    delete root.dataset.sceneLoader;
    root.classList.add('scene-skipped');
    // Boot may have scrolled while body was height-locked (loader). Clear that
    // claim and re-apply /#pricing after unlock + one layout settle.
    const pendingId = hashId(window.location.hash);
    if (pendingId && window.__ANALYZIT_HASH_SCROLLED__ === pendingId) {
      window.__ANALYZIT_HASH_SCROLLED__ = undefined;
    }
    let cancelled = false;
    let settleTimer = 0;
    const outer = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (cancelled) return;
        scrollToHash({ force: true });
        // One settle pass (fonts / hero / pricing quote) — same hash only.
        settleTimer = window.setTimeout(() => {
          if (!cancelled) scrollToHash({ force: true });
        }, 160);
      });
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(outer);
      if (settleTimer) window.clearTimeout(settleTimer);
    };
  }, [isLoading]);

  useEffect(() => {
    if (sceneMode !== 'webgl') return;
    let cancelled = false;
    const start = () => {
      if (!cancelled) setAllowScene(true);
    };
    // Yield past first paint and the loader timers before evaluating three.js.
    // A synchronous scene import was starving the 0% loader so Skip never appeared.
    const idleId = window.requestIdleCallback?.(start, { timeout: 800 });
    const backup = window.setTimeout(start, 800);
    return () => {
      cancelled = true;
      if (idleId != null) window.cancelIdleCallback?.(idleId);
      window.clearTimeout(backup);
    };
  }, [sceneMode]);

  const handleSceneProgress = useCallback((value: number) => {
    setSceneProgress(value);
    const el = document.getElementById('scene-loader-progress');
    if (el) el.setAttribute('data-progress', String(value));
    if (value >= 100) {
      window.__ANALYZIT_SCENE_SKIP__ = window.__ANALYZIT_SCENE_SKIP__ || 'ready';
      setSceneReady(true);
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;

    let ticking = false;
    let lastVisible = true;

    const compute = () => {
      const scrollY = window.scrollY;
      const totalScroll = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1
      );
      const descentEl = document.getElementById('descent');
      const capabilitiesEl = document.getElementById('capabilities');

      if (descentEl) {
        const rect = descentEl.getBoundingClientRect();
        const travel = Math.max(descentEl.offsetHeight - window.innerHeight, 1);
        scrollProgressRef.current = Math.min(Math.max(-rect.top / travel, 0), 1);
      } else {
        scrollProgressRef.current = 0;
      }

      const isPastDescent = capabilitiesEl
        ? capabilitiesEl.getBoundingClientRect().top < window.innerHeight * 0.15
        : false;
      const isAtClosing = scrollY > totalScroll - window.innerHeight * 1.5;
      const nextVisible = !isPastDescent || isAtClosing;
      if (nextVisible !== lastVisible) {
        lastVisible = nextVisible;
        setIsCanvasVisible(nextVisible);
      }
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        compute();
        ticking = false;
      });
    };

    compute();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isLoading]);

  const contextValue = useMemo(
    () => ({ setInspectedDetail }),
    []
  );

  return (
    <div
      id="main-content"
      className="relative min-h-screen overflow-x-hidden bg-transparent text-ink selection:bg-coral/30 selection:text-ink"
      style={{ ['--nav-h' as string]: '96px' }}
    >
      <SceneBackdrop />
      {allowScene && (
        <SceneCanvas
          scrollProgressRef={scrollProgressRef}
          isLoaded={!isLoading}
          isCanvasVisible={isCanvasVisible}
          onProgress={handleSceneProgress}
        />
      )}

      {isLoading && (
        <LoadingScreen
          onComplete={handleLoadComplete}
          progress={sceneProgress}
          sceneReady={sceneReady}
          staticFallback={staticFallback}
        />
      )}


      <InspectDrawer detail={inspectedDetail} onClose={() => setInspectedDetail(null)} />

      <LandingProgressContext.Provider value={contextValue}>
        <div
          id="landing-content"
          suppressHydrationWarning
          className={`relative z-10 transition-opacity duration-500 ${
            isLoading ? 'pointer-events-none opacity-0' : 'opacity-100'
          }`}
        >
          <Navbar />
          {children}
        </div>
      </LandingProgressContext.Provider>
    </div>
  );
}
