'use client';

import React from 'react';
import { motion } from 'motion/react';

interface ComparisonRow {
  topic: string;
  oldWay: string;
  analyzeIt: string;
}

const COMPARISONS: ComparisonRow[] = [
  {
    topic: 'Dashboard Maintenance',
    oldWay: 'Rigid dashboards that break when definitions or underlying schemas evolve.',
    analyzeIt: 'Living summaries compiled on-demand from fresh data whenever you need them.',
  },
  {
    topic: 'Answering Ad-Hoc Questions',
    oldWay: 'Waiting in a data team ticket queue for routine questions and simple slices.',
    analyzeIt: 'Direct self-serve answers anyone on the team can reach in seconds.',
  },
  {
    topic: 'Alerts & Notifications',
    oldWay: 'Constant alert pings and threshold triggers that train teams to look away.',
    analyzeIt: 'Quiet, contextual updates delivered only when something truly shifts.',
  },
  {
    topic: 'Root-Cause Analysis',
    oldWay: 'Digging through multiple pivot tables to figure out why numbers changed.',
    analyzeIt: 'Clear narrative explanations delivered alongside verified source numbers.',
  },
];

export const ComparisonSection: React.FC = () => {
  return (
    <section
      id="comparison"
      className="relative py-24 md:py-36 px-6 md:px-16 max-w-7xl mx-auto space-y-16 pointer-events-auto scroll-mt-28"
    >
      <div id="why-calm" className="absolute -top-28 h-px w-px overflow-hidden" aria-hidden="true" />
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-10% 0px -10% 0px' }}
        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-2xl space-y-4"
      >
        <div className="inline-flex items-center gap-2 text-xs font-mono tracking-widest uppercase text-[#4A4238]/60 dark:text-[#91867E]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E3836C]" />
          Why Calm Matters
        </div>
        <h2 className="font-serif text-4xl md:text-5xl text-[#4A4238] dark:text-[#F4EDE5] font-normal leading-tight">
          Most analytics tools make you{' '}
          <em className="font-serif italic text-[#E3836C]">
            work for the answer.
          </em>
        </h2>
        <p className="text-base text-[#4A4238]/70 dark:text-[#C5B9AE]">
          Dashboards were built for displaying widgets, not making decisions. AnalyzeIt replaces screen fatigue with quiet clarity.
        </p>
      </motion.div>

      {/* Comparison Table / Card Container */}
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-10% 0px -10% 0px' }}
        transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        className="glass-card rounded-3xl overflow-hidden border border-[#4A4238]/10 dark:border-[#3A3430] divide-y divide-[#4A4238]/8 dark:divide-[#3A3430] shadow-sm"
      >
        {/* Table Header */}
        <div className="grid grid-cols-1 md:grid-cols-2 bg-[#F3EDE4]/90 dark:bg-[#292522] p-6 md:px-10 text-xs font-mono uppercase tracking-wider text-[#4A4238]/70 dark:text-[#C5B9AE] border-b border-[#4A4238]/08 dark:border-[#3A3430]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#4A4238]/30 dark:bg-white/30" />
            The Traditional Way
          </div>
          <div className="hidden md:flex items-center gap-2 text-[#E3836C]">
            <span className="w-2 h-2 rounded-full bg-[#E3836C]" />
            With AnalyzeIt
          </div>
        </div>

        {/* Rows */}
        {COMPARISONS.map((row, idx) => (
          <div
            key={idx}
            className="grid grid-cols-1 md:grid-cols-2 p-6 md:p-10 gap-6 md:gap-12 hover:bg-white/30 dark:hover:bg-[#292522]/50 transition-colors"
          >
            {/* The Old Way */}
            <div className="space-y-1.5">
              <div className="text-xs font-mono text-[#4A4238]/50 dark:text-[#91867E] uppercase tracking-wider">
                {row.topic}
              </div>
              <p className="text-sm md:text-base text-[#4A4238]/70 dark:text-[#C5B9AE] leading-relaxed">
                {row.oldWay}
              </p>
            </div>

            {/* With AnalyzeIt */}
            <div className="space-y-1.5 pt-4 md:pt-0 border-t md:border-t-0 border-[#4A4238]/6 dark:border-[#3A3430]">
              <div className="md:hidden text-xs font-mono text-[#E3836C] uppercase tracking-wider">
                With AnalyzeIt
              </div>
              <p className="text-sm md:text-base text-[#4A4238] dark:text-[#F4EDE5] font-medium leading-relaxed">
                {row.analyzeIt}
              </p>
            </div>
          </div>
        ))}
      </motion.div>
    </section>
  );
};
