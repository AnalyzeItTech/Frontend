'use client';

import React, { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Lenis from 'lenis';

/** Single Lenis instance for marketing landing only — app shells manage their own overflow. */
export const SmoothScrollProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMarketing = pathname === '/' || pathname === '';

    if (prefersReducedMotion || !isMarketing) {
      lenisRef.current?.destroy();
      lenisRef.current = null;
      return;
    }

    // While the homepage loader (and its Skip control) is up, leave native scrolling
    // alone so a #pricing landing is not swallowed. Lenis starts once that flag clears.
    const root = document.documentElement;
    let lenis: Lenis | null = null;
    let animId = 0;

    const stop = () => {
      cancelAnimationFrame(animId);
      lenis?.destroy();
      lenis = null;
      lenisRef.current = null;
    };

    const start = () => {
      if (lenis || root.dataset.sceneLoader === '1') return;
      const isMobile = window.innerWidth < 768;
      lenis = new Lenis({
        duration: isMobile ? 0.75 : 0.85,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        touchMultiplier: 1.2,
        wheelMultiplier: 1,
        syncTouch: false,
        anchors: true,
      });
      lenisRef.current = lenis;
      const hash = window.location.hash;
      if (hash.length > 1) {
        lenis.scrollTo(hash, { immediate: true, force: true });
      }
      const raf = (time: number) => {
        lenis?.raf(time);
        animId = requestAnimationFrame(raf);
      };
      animId = requestAnimationFrame(raf);
    };

    const sync = () => {
      if (root.dataset.sceneLoader === '1') {
        stop();
        return;
      }
      start();
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['data-scene-loader'] });

    return () => {
      observer.disconnect();
      stop();
    };
  }, [pathname]);

  return <>{children}</>;
};
