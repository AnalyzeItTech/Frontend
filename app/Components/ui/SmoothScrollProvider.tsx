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

    const isMobile = window.innerWidth < 768;
    const lenis = new Lenis({
      duration: isMobile ? 0.75 : 0.85,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.2,
      wheelMultiplier: 1,
      syncTouch: false,
    });

    lenisRef.current = lenis;

    let animId: number;
    function raf(time: number) {
      lenis.raf(time);
      animId = requestAnimationFrame(raf);
    }
    animId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(animId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [pathname]);

  return <>{children}</>;
};
