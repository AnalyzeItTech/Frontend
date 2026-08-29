'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Lenis from 'lenis';
import { Navbar } from './Components/landing/Navbar';
import { HeroSection } from './Components/landing/HeroSection';
import { DescentSection } from './Components/landing/DescentSection';
import { CapabilitiesSection } from './Components/landing/CapabilitiesSection';
import { HowItWorksSection } from './Components/landing/HowItWorksSection';
import { ComparisonSection } from './Components/landing/ComparisonSection';
import { UseCasesSection } from './Components/landing/UseCasesSection';
import { PricingTeaserSection } from './Components/landing/PricingTeaserSection';
import { FAQSection } from './Components/landing/FAQSection';
import { ClosingCTASection } from './Components/landing/ClosingCTASection';
import { Footer } from './Components/landing/Footer';
import { InspectDrawer, DrawerDetail } from './Components/landing/InspectDrawer';
import { LoadingScreen } from './Components/ui/LoadingScreen';
import { NavRail } from './Components/ui/NavRail';

// Dynamically load the R3F 3D Canvas with ssr: false for rock-solid client hydration
const SceneCanvas = dynamic(
  () => import('./Components/3d/SceneCanvas').then((mod) => mod.SceneCanvas),
  { ssr: false }
);

export default function Home() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isCanvasVisible, setIsCanvasVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [inspectedDetail, setInspectedDetail] = useState<DrawerDetail | null>(null);

  const lenisRef = useRef<Lenis | null>(null);

  // Initialize Lenis Smooth Scrolling Physics
  useEffect(() => {
    const isMobile = window.innerWidth < 768;

    const lenis = new Lenis({
      duration: isMobile ? 1.0 : 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.6,
    });

    lenisRef.current = lenis;

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    const animId = requestAnimationFrame(raf);

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

      // Smooth canvas visibility: active during Hero & Descent,
      // and re-activates for Closing CTA at the bottom
      const isPastDescent = capabilitiesEl
        ? capabilitiesEl.getBoundingClientRect().top < 0
        : false;
      const isAtClosing = scrollY > totalScroll - window.innerHeight * 1.5;

      setIsCanvasVisible(!isPastDescent || isAtClosing);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('scroll', onScroll);
      lenis.destroy();
    };
  }, []);

  return (
    <div
      id="main-content"
      className="relative min-h-screen bg-transparent text-ink selection:bg-coral/30 selection:text-ink overflow-x-hidden"
    >
      {/* Phase 1: Precision SVG 3D Loading Screen */}
      {isLoading && (
        <LoadingScreen onComplete={() => setIsLoading(false)} />
      )}

      {/* Vertical Navigation Rail */}
      <NavRail />

      {/* Slide-out Architecture Inspection Drawer */}
      <InspectDrawer
        detail={inspectedDetail}
        onClose={() => setInspectedDetail(null)}
      />

      {/* Phase 2: Fixed 3D WebGL Background Layer with 360 Orbital Camera */}
      <SceneCanvas
        scrollProgress={scrollProgress}
        isLoaded={!isLoading}
        isCanvasVisible={isCanvasVisible}
        onSelectHotspot={(detail) => setInspectedDetail(detail)}
      />

      {/* Floating Header Navbar */}
      <Navbar />

      {/* Main Narrative Content Flow */}
      <main className="relative z-10">
        {/* Phase 3: Hero Section */}
        <HeroSection />

        {/* Phase 3: Pinned 3D Orbit & Milestone Narrative Stage */}
        <DescentSection
          scrollProgress={scrollProgress}
          onInspect={(detail) => setInspectedDetail(detail)}
        />

        {/* Phase 4: Canvas Handoff → Flat Editorial Content Sections */}
        <div className="relative z-10 bg-[#F3EDE4] dark:bg-[#161311] text-[#4A4238] dark:text-[#EDE6DC] shadow-2xl transition-colors duration-500">
          {/* 1. Core 4 Capabilities Pillars */}
          <CapabilitiesSection />

          {/* 2. Three-Step Workflow Overview */}
          <HowItWorksSection />

          {/* 3. Editorial Comparison: Why Calm Matters */}
          <ComparisonSection />

          {/* 4. Use Cases & Persona Breakdown */}
          <UseCasesSection />

          {/* 5. Transparent Pricing Plans */}
          <PricingTeaserSection />

          {/* 6. Interactive FAQ Accordion */}
          <FAQSection />

          {/* Phase 5: Closing CTA with 3D Sky Bookend Re-appearance */}
          <div className="relative bg-transparent">
            <ClosingCTASection />
          </div>

          {/* Restrained Footer */}
          <Footer />
        </div>
      </main>
    </div>
  );
}