import React from 'react';
import Link from 'next/link';

export const HeroSection: React.FC = () => {
  return (
    <section
      id="hero"
      className="relative min-h-[88vh] flex flex-col justify-between pt-[calc(var(--nav-h,96px)+48px)] pb-20 px-6 md:px-16 max-w-7xl mx-auto pointer-events-none scroll-mt-[calc(var(--nav-h,96px)+16px)]"
    >
      <div className="flex items-center justify-between pointer-events-auto">
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#F3EDE4]/95 dark:bg-[#211E1C]/95 backdrop-blur-md border border-[#4A4238]/15 dark:border-[#3A3430] text-xs font-medium tracking-widest uppercase text-[#322C28] dark:text-[#F4EDE5] shadow-xs">
          <span className="w-2 h-2 rounded-full bg-[#9EBB9A] animate-pulse" />
          <span>Analytics, made calm</span>
        </div>
      </div>

      <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-12 pointer-events-auto mt-auto pb-10">
        <div
          id="hero-card"
          className="max-w-2xl space-y-6 rounded-3xl bg-[#F3EDE4]/90 dark:bg-[#171514]/88 backdrop-blur-md border border-[#4A4238]/10 dark:border-[#3A3430] p-6 sm:p-8 shadow-sm"
        >
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl tracking-tight text-[#322C28] dark:text-[#F4EDE5] font-normal leading-[1.08]">
            <span className="block font-sans text-sm sm:text-base tracking-[0.28em] uppercase font-medium text-[#C45A42] dark:text-[#EBA58F] mb-4">
              AnalyzeIt
            </span>
            See what your data <br className="hidden sm:inline" />
            <em className="font-serif italic text-[#C45A42] dark:text-[#EBA58F]">already knows.</em>
          </h1>

          <p className="text-base md:text-lg text-[#3F3830] dark:text-[#E6DCD2] font-normal max-w-xl leading-relaxed">
            A quiet analytics workspace — narratives, forecasts, and place-aware exploration without dashboard busywork.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href="/login?tab=register"
              className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-[#E3836C] hover:bg-[#ED967F] active:bg-[#C96F5A] text-[#FFF7F1] font-medium text-base transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 whitespace-nowrap"
            >
              Start exploring free
            </Link>
            <a
              href="#capabilities"
              className="inline-flex items-center gap-1.5 min-h-11 px-4 py-3 text-sm font-medium text-[#322C28] dark:text-[#E6DCD2] hover:text-[#C45A42] transition-colors"
            >
              <span>Skip to product</span>
            </a>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-auto">
        <div className="relative w-4 h-12 flex flex-col items-center justify-between">
          <span className="w-1.5 h-1.5 border-t border-l border-[#4A4238]/50 dark:border-[#EBA58F]/50 rotate-45" />
          <span className="w-[1px] h-full bg-gradient-to-b from-[#4A4238]/20 dark:from-[#EBA58F]/40 via-[#E3836C] to-[#4A4238]/20 dark:to-[#EBA58F]/40 animate-pulse" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#E3836C] shadow-xs shadow-[#E3836C] animate-bounce" />
        </div>
        <span className="text-[11px] font-medium tracking-[0.18em] uppercase text-[#5C534A] dark:text-[#C5B9AE] whitespace-nowrap">
          SCROLL TO DISCOVER
        </span>
      </div>
    </section>
  );
};
