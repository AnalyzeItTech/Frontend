'use client';

import React from 'react';

interface Step {
  step: string;
  title: string;
  tagline: string;
  description: string;
}

const STEPS: Step[] = [
  {
    step: '01',
    title: 'Connect',
    tagline: 'Point it at your data.',
    description:
      'Connect your PostgreSQL, BigQuery, Snowflake, Stripe, or spreadsheet imports with read-only permissions in a few clicks.',
  },
  {
    step: '02',
    title: 'Ask',
    tagline: 'Ask in everyday words.',
    description:
      'No query syntax, SQL training, or complex filters. Type what you want to understand, just like messaging a teammate.',
  },
  {
    step: '03',
    title: 'Understand',
    tagline: 'Read a clear answer.',
    description:
      'Receive concise narrative explanations with source numbers and tables clearly displayed—not a widget puzzle to solve.',
  },
];

export const HowItWorksSection: React.FC = () => {
  return (
    <section
      id="how-it-works"
      className="relative py-24 md:py-36 px-6 md:px-16 max-w-7xl mx-auto space-y-16 pointer-events-auto"
    >
      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 text-xs font-mono tracking-widest uppercase text-[#4A4238]/60">
          <span className="w-1.5 h-1.5 rounded-full bg-[#8FA98F]" />
          Three Steps to Clarity
        </div>
        <h2 className="font-serif text-4xl md:text-5xl text-[#4A4238] font-normal">
          How it works
        </h2>
        <p className="text-base text-[#4A4238]/70">
          No training seminars, no SQL certification, and no fragile dashboards to maintain.
        </p>
      </div>

      {/* 3 Steps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
        {STEPS.map((s, idx) => (
          <div
            key={s.step}
            className="glass-card rounded-3xl p-8 space-y-5 relative border border-[#4A4238]/10 hover:border-[#D4826A]/30 transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <span className="font-serif text-3xl text-[#D4826A] font-normal">
                {s.step}
              </span>
              <span className="text-xs font-mono uppercase tracking-wider text-[#4A4238]/50">
                Step {idx + 1}
              </span>
            </div>

            <div className="space-y-2">
              <h3 className="font-serif text-2xl text-[#4A4238] font-normal">
                {s.title}
              </h3>
              <p className="text-sm font-medium text-[#4A4238]">
                {s.tagline}
              </p>
            </div>

            <p className="text-sm text-[#4A4238]/70 leading-relaxed">
              {s.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};
