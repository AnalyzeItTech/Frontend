'use client';

import React, { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Lenis from 'lenis';
import {
  LANDING_NAV_OFFSET_PX,
  hashId,
  landingHashScrollTop,
} from '../../lib/loaderProgress.mjs';

declare global {
  interface Window {
    __ANALYZIT_HASH_SCROLLED__?: string;
    __ANALYZIT_LENIS__?: Lenis | null;
  }
}

function applyLandingHash(lenis: Lenis | null, opts?: { force?: boolean }) {
  const id = hashId(window.location.hash);
  if (!id) return;
  if (!opts?.force && window.__ANALYZIT_HASH_SCROLLED__ === id) return;
  const el = document.getElementById(id);
  if (!el) return;
  const absTop = el.getBoundingClientRect().top + (window.scrollY || window.pageYOffset || 0);
  const top = landingHashScrollTop(absTop, LANDING_NAV_OFFSET_PX);
  if (lenis) {
    // Numeric target — avoids a second selector pass fighting native scrollIntoView.
    lenis.scrollTo(top, { immediate: true, force: true });
  } else {
    window.scrollTo({ top, left: 0, behavior: 'auto' });
  }
  window.__ANALYZIT_HASH_SCROLLED__ = id;
}

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
      if (window.__ANALYZIT_LENIS__) window.__ANALYZIT_LENIS__ = null;
      // Reduced-motion / non-Lenis: still land on /#pricing after the loader unlocks.
      if (isMarketing && document.documentElement.dataset.sceneLoader !== '1') {
        applyLandingHash(null);
      }
      return;
    }

    // While the homepage loader (and its Skip control) is up, leave native scrolling
    // alone so a #pricing landing is not swallowed. Lenis starts once that flag clears.
    const root = document.documentElement;
    let lenis: Lenis | null = null;
    let animId = 0;
    let hashRaf = 0;

    const stop = () => {
      cancelAnimationFrame(animId);
      cancelAnimationFrame(hashRaf);
      lenis?.destroy();
      lenis = null;
      lenisRef.current = null;
      if (window.__ANALYZIT_LENIS__) window.__ANALYZIT_LENIS__ = null;
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
        // Anchor clicks keep CSS scroll-margin; cold hash is applied below with offset.
        anchors: true,
      });
      lenisRef.current = lenis;
      window.__ANALYZIT_LENIS__ = lenis;
      const raf = (time: number) => {
        lenis?.raf(time);
        animId = requestAnimationFrame(raf);
      };
      animId = requestAnimationFrame(raf);
      // After loader unlock, wait two frames so section layout (and scroll-mt) is real,
      // then one settle remeasure (fonts / late pricing quote) for short viewports.
      hashRaf = window.requestAnimationFrame(() => {
        hashRaf = window.requestAnimationFrame(() => {
          if (!lenis || root.dataset.sceneLoader === '1') return;
          applyLandingHash(lenis, { force: true });
          window.setTimeout(() => {
            if (lenis && root.dataset.sceneLoader !== '1') {
              applyLandingHash(lenis, { force: true });
            }
          }, 160);
        });
      });
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
