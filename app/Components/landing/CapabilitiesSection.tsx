'use client';

import React from 'react';
import { motion } from 'motion/react';

interface Capability {
  id: string;
  category: string;
  headline: string;
  body: string;
  callout: string;
  calloutDesc: string;
  bullets: string[];
}

const CAPABILITIES: Capability[] = [
  {
    id: 'reports',
    category: 'Capability 01 · Reports Engine',
    headline: 'Answers without the assembly line.',
    body:
      'Stop spending Monday mornings stitching together spreadsheets and recreating charts. AnalyzeIt monitors your core metrics continuously and writes clear summaries delivered right where you already work.',
    callout: 'Automated',
    calloutDesc: 'scheduled executive briefings delivered to your team channels',
    bullets: [
      'Connects directly to your existing data sources and billing streams',
      'Drafts plain-language narratives explaining what changed and why',
      'Delivers scheduled briefings via email or shared channels',
    ],
  },
  {
    id: 'forecasts',
    category: 'Capability 02 · Forecast Horizons',
    headline: 'Look ahead with quiet confidence.',
    body:
      'See where your trajectory is heading before the quarter wraps up. Probabilistic projections adapt naturally to seasonal cycles, recent trends, and baseline variance without manual tuning.',
    callout: 'Adaptive',
    calloutDesc: 'rolling forward-looking horizon with uncertainty bounds',
    bullets: [
      'Identifies recurring baseline patterns automatically',
      'Presents range intervals rather than false certainty',
      'Lets you test potential adjustments in everyday language',
    ],
  },
  {
    id: 'monitoring',
    category: 'Capability 03 · Anomaly Graph',
    headline: 'Signal, not siren sounds.',
    body:
      'Most alerting tools drown you in notifications until you mute them. AnalyzeIt focuses on genuine anomalies—surfacing the context behind a shift before you have to dig for it.',
    callout: 'Correlated',
    calloutDesc: 'contextual anomaly detection that suppresses noise',
    bullets: [
      'Establishes normal variance across related metrics',
      'Groups correlated changes into a single coherent update',
      'Points to probable upstream factors automatically',
    ],
  },
  {
    id: 'exploration',
    category: 'Capability 04 · Conversational Query',
    headline: 'Follow your curiosity at your own pace.',
    body:
      'When an interesting pattern catches your eye, explore it without writing SQL queries or building throwaway views. Just ask follow-up questions in plain words.',
    callout: 'Transparent',
    calloutDesc: 'instant conversational answers backed by full data lineage',
    bullets: [
      'Converts everyday questions into accurate analytical queries',
      'Shows the source data tables alongside the written summary',
      'Keeps conversation context so you can drill deeper naturally',
    ],
  },
];

export const CapabilitiesSection: React.FC = () => {
  return (
    <section
      id="capabilities"
      className="relative py-24 md:py-36 px-6 md:px-16 max-w-7xl mx-auto space-y-20 pointer-events-auto"
    >
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-10% 0px -10% 0px' }}
        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-2xl space-y-4"
      >
        <div className="inline-flex items-center gap-2 text-xs font-mono tracking-[0.25em] uppercase text-[#D4826A]">
          <span className="w-2 h-2 rounded-full bg-[#D4826A]" />
          Core Capabilities
        </div>
        <h2 className="font-serif text-4xl sm:text-5xl font-normal text-[#4A4238] leading-tight">
          Everything you need to understand your business,{' '}
          <em className="font-serif italic text-[#D4826A]">
            without the noise.
          </em>
        </h2>
      </motion.div>

      {/* 4 Pillars Grid with Staggered Scroll Reveal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
        {CAPABILITIES.map((cap, idx) => (
          <motion.div
            key={cap.id}
            initial={{ opacity: 0, y: 35 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10% 0px -10% 0px' }}
            transition={{
              duration: 0.7,
              delay: idx * 0.12,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="glass-card rounded-3xl p-8 md:p-10 space-y-8 flex flex-col justify-between transition-all duration-300 transform hover:-translate-y-1.5 hover:shadow-xl border border-[#4A4238]/10"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#4A4238]/60">
                  {cap.category}
                </span>
                <span className="w-2 h-2 rounded-full bg-[#8FA98F]" />
              </div>

              <h3 className="font-serif text-2xl md:text-3xl text-[#4A4238] font-normal leading-snug">
                {cap.headline}
              </h3>

              <p className="text-sm md:text-base text-[#4A4238]/75 font-normal leading-relaxed">
                {cap.body}
              </p>

              {/* 3-Bullet Checklist */}
              <div className="pt-4 space-y-3 border-t border-[#4A4238]/8">
                <div className="text-[11px] font-mono uppercase tracking-wider text-[#4A4238]/50">
                  How it works
                </div>
                {cap.bullets.map((bullet, bIdx) => (
                  <div
                    key={bIdx}
                    className="flex items-start gap-2.5 text-xs sm:text-sm text-[#4A4238]/85"
                  >
                    <span className="text-[#8FA98F] text-sm mt-0.5">✓</span>
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stat Callout Badge */}
            <div className="p-4 rounded-2xl bg-[#F3EDE4]/80 border border-[#4A4238]/8 flex items-baseline gap-3">
              <span className="font-serif text-2xl md:text-3xl font-medium text-[#D4826A]">
                {cap.callout}
              </span>
              <span className="text-xs text-[#4A4238]/70 leading-tight">
                {cap.calloutDesc}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};
