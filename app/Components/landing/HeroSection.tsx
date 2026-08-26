'use client';

import React from 'react';
import Link from 'next/link';

export const HeroSection: React.FC = () => {
  return (
    <section
      id="hero"
      className="relative min-h-[92vh] flex flex-col justify-between pt-36 sm:pt-40 pb-20 px-6 md:px-16 max-w-7xl mx-auto pointer-events-none"
    >
      {/* Top Eyebrow Tag */}
      <div className="flex items-center justify-between pointer-events-auto">
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#F3EDE4]/85 backdrop-blur-md border border-[#4A4238]/10 text-xs font-mono tracking-widest uppercase text-[#4A4238]/80 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-[#8FA98F] animate-pulse" />
          <span>Analytics, made calm</span>
        </div>
      </div>

      {/* Main Hero Content */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-12 pointer-events-auto mt-auto pb-10">
        <div className="max-w-2xl space-y-6">
          {/* Main Editorial Headline */}
          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tight text-[#4A4238] font-normal leading-[1.04]">
            See what your data <br className="hidden sm:inline" />
            <em className="font-serif italic text-[#D4826A]">already knows.</em>
          </h1>

          {/* Subhead */}
          <p className="text-base md:text-lg text-[#4A4238]/75 font-normal max-w-xl leading-relaxed">
            A quiet analytics workspace that monitors your metrics in real-time 3D, writes clear narrative summaries, and lets anyone ask questions in plain words.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-[#D4826A] hover:bg-[#C2735C] text-[#F3EDE4] font-medium text-base transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 whitespace-nowrap"
            >
              Start exploring free
            </Link>
            <a
              href="#descent"
              className="inline-flex items-center gap-1.5 px-4 py-4 text-xs font-mono uppercase tracking-wider text-[#4A4238]/70 hover:text-[#4A4238] transition-colors"
            >
              <span>See how it works</span>
              <span className="text-sm">↓</span>
            </a>
          </div>
        </div>
      </div>

      {/* Perfectly Centered Bottom Scroll Indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-auto">
        <div className="relative w-4 h-12 flex flex-col items-center justify-between">
          <span className="w-1.5 h-1.5 border-t border-l border-[#4A4238]/50 rotate-45" />
          <span className="w-[1px] h-full bg-gradient-to-b from-[#4A4238]/20 via-[#D4826A] to-[#4A4238]/20 animate-pulse" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#D4826A] shadow-xs shadow-[#D4826A] animate-bounce" />
        </div>
        <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-[#4A4238]/50 whitespace-nowrap">
          SCROLL TO DISCOVER
        </span>
      </div>
    </section>
  );
};
