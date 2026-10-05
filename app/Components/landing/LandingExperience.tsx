'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback, useLayoutEffect, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';

declare global {
  interface Window {
    __ANALYZIT_SCENE_SKIP__?: string;
  }
}
import { Navbar } from './Navbar';
import { InspectDrawer, DrawerDetail } from './InspectDrawer';
import { LandingProgressContext } from './LandingProgressContext';
import { LoadingScreen } from '../ui/LoadingScreen';
import { SceneBackdrop } from './SceneBackdrop';
import { hashId } from '../../lib/loaderProgress.mjs';

const SceneCanvas = dynamic(
  () => import('../3d/SceneCanvas').then((mod) => mod.SceneCanvas),
  { ssr: false }
);

function subscribeClient() {
  return () => {};
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

function scrollToHash() {
  const id = hashId(window.location.hash);
  if (!id) return;
  document.getElementById(id)?.scrollIntoView({ behavior: 'auto', block: 'start' });
}

export function LandingExperience({ children }: { children: React.ReactNode }) {
  const [dismissed, setDismissed] = useState(false);
  const [showSkip, setShowSkip] = useState(true);
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
    scrollToHash();
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
    let lastSkip = true;
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

      const nextSkip = scrollProgressRef.current < 0.98;
      if (nextSkip !== lastSkip) {
        lastSkip = nextSkip;
        setShowSkip(nextSkip);
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

      {!isLoading && showSkip && (
        <a
          href="#capabilities"
          className="pointer-events-auto fixed right-5 bottom-5 z-30 inline-flex min-h-11 items-center rounded-full bg-[#322C28] px-4 text-sm font-medium text-[#FFF7F1] shadow-lg xl:right-8"
          onClick={(e) => {
            e.preventDefault();
            const el = document.getElementById('capabilities');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        >
          Skip animation
        </a>
      )}

      <InspectDrawer detail={inspectedDetail} onClose={() => setInspectedDetail(null)} />

      <LandingProgressContext.Provider value={contextValue}>
        <div
          id="landing-content"
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
