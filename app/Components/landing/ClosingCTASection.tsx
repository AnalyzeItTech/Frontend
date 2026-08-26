'use client';

import React from 'react';
import Link from 'next/link';

export const ClosingCTASection: React.FC = () => {
  return (
    <section className="relative py-32 md:py-48 px-6 md:px-16 max-w-5xl mx-auto text-center space-y-8 pointer-events-auto">
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#B8A9C9]/20 border border-[#B8A9C9]/30 text-xs font-mono tracking-widest uppercase text-[#4A4238]/70">
        <span className="w-1.5 h-1.5 rounded-full bg-[#D4826A]" />
        Begin Quietly
      </div>

      <h2 className="font-serif text-5xl sm:text-6xl md:text-7xl text-[#4A4238] font-normal leading-[1.08] max-w-3xl mx-auto">
        Data clarity shouldn&apos;t feel exhausting.
      </h2>

      <p className="text-base md:text-lg text-[#4A4238]/70 max-w-xl mx-auto leading-relaxed">
        A quieter, more thoughtful way to understand your business numbers and move forward with confidence.
      </p>

      <div className="pt-4 space-y-3">
        <Link
          href="/login"
          className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-[#D4826A] hover:bg-[#C2735C] text-[#F3EDE4] font-medium text-base transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
        >
          Start a free trial
        </Link>
        <div className="text-xs text-[#4A4238]/60 font-mono">
          No credit card required · 5-minute setup
        </div>
      </div>
    </section>
  );
};
