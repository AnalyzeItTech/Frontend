'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Navbar } from './Navbar';
import { InspectDrawer, DrawerDetail } from './InspectDrawer';
import { LandingProgressContext } from './LandingProgressContext';
import { LoadingScreen } from '../ui/LoadingScreen';

const SceneCanvas = dynamic(
  () => import('../3d/SceneCanvas').then((mod) => mod.SceneCanvas),
  { ssr: false }
);

export function LandingExperience({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [showSkip, setShowSkip] = useState(true);
  const [isCanvasVisible, setIsCanvasVisible] = useState(true);
  const [inspectedDetail, setInspectedDetail] = useState<DrawerDetail | null>(null);
  const scrollProgressRef = useRef(0);

  const handleLoadComplete = useCallback(() => {
    setIsLoading(false);
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
      className="relative min-h-screen bg-transparent text-ink selection:bg-coral/30 selection:text-ink overflow-x-hidden"
      style={{ ['--nav-h' as string]: '96px' }}
    >
      {isLoading && <LoadingScreen onComplete={handleLoadComplete} />}

      {!isLoading && showSkip && (
        <a
          href="#capabilities"
          className="fixed bottom-5 right-5 z-30 min-h-11 px-4 rounded-full bg-[#322C28] text-[#FFF7F1] text-sm font-medium shadow-lg pointer-events-auto inline-flex items-center xl:right-8"
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
      <SceneCanvas
        scrollProgressRef={scrollProgressRef}
        isLoaded={!isLoading}
        isCanvasVisible={isCanvasVisible}
      />
      {!isLoading && <Navbar />}

      <LandingProgressContext.Provider value={contextValue}>
        <div
          className={`transition-opacity duration-500 ${
            isLoading ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          {children}
        </div>
      </LandingProgressContext.Provider>
    </div>
  );
}
