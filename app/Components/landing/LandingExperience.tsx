'use client';

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Lenis from 'lenis';
import { Navbar } from './Navbar';
import { InspectDrawer, DrawerDetail } from './InspectDrawer';
import { NavRail } from '../ui/NavRail';
import { LandingProgressContext } from './LandingProgressContext';

const SceneCanvas = dynamic(
  () => import('../3d/SceneCanvas').then((mod) => mod.SceneCanvas),
  { ssr: false }
);

export function LandingExperience({ children }: { children: React.ReactNode }) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isCanvasVisible, setIsCanvasVisible] = useState(true);
  const [inspectedDetail, setInspectedDetail] = useState<DrawerDetail | null>(null);
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const ua = navigator.userAgent || '';
    const isBot = /bot|crawler|spider|google|bing|adsense|adsbot|slurp|duckduck/i.test(ua);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.innerWidth < 768;
    let animId = 0;
    let lenis: Lenis | null = null;

    if (!reduce && !isBot) {
      lenis = new Lenis({
        duration: isMobile ? 1.0 : 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        touchMultiplier: 1.6,
      });
      lenisRef.current = lenis;
      function raf(time: number) {
        lenis?.raf(time);
        animId = requestAnimationFrame(raf);
      }
      animId = requestAnimationFrame(raf);
    }

    const onScroll = () => {
      const scrollY = window.scrollY;
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      const descentEl = document.getElementById('descent');
      const capabilitiesEl = document.getElementById('capabilities');

      if (descentEl) {
        const descentTop = descentEl.offsetTop;
        const descentHeight = descentEl.offsetHeight - window.innerHeight;

        if (scrollY < descentTop) {
          setScrollProgress(0);
        } else if (scrollY >= descentTop && scrollY <= descentTop + descentHeight) {
          const progress = (scrollY - descentTop) / (descentHeight || 1);
          setScrollProgress(Math.min(Math.max(progress, 0), 1));
        } else {
          setScrollProgress(1);
        }
      }

      const isPastDescent = capabilitiesEl
        ? capabilitiesEl.getBoundingClientRect().top < 0
        : false;
      const isAtClosing = scrollY > totalScroll - window.innerHeight * 1.5;
      setIsCanvasVisible(!isPastDescent || isAtClosing);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      if (animId) cancelAnimationFrame(animId);
      window.removeEventListener('scroll', onScroll);
      lenis?.destroy();
    };
  }, []);

  return (
    <div
      id="main-content"
      className="relative min-h-screen bg-transparent text-ink selection:bg-coral/30 selection:text-ink overflow-x-hidden"
    >
      {scrollProgress < 1 && (
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

      <NavRail />
      <InspectDrawer detail={inspectedDetail} onClose={() => setInspectedDetail(null)} />
      <SceneCanvas
        scrollProgress={scrollProgress}
        isLoaded
        isCanvasVisible={isCanvasVisible}
        onSelectHotspot={(detail) => setInspectedDetail(detail)}
      />
      <Navbar />

      <LandingProgressContext.Provider value={{ scrollProgress, setInspectedDetail }}>
        {children}
      </LandingProgressContext.Provider>
    </div>
  );
}
