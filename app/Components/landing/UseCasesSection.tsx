'use client';

import React from 'react';
import { motion } from 'motion/react';

interface UseCase {
  role: string;
  tagline: string;
  detail: string;
}

const USE_CASES: UseCase[] = [
  {
    role: 'Founders & Leaders',
    tagline: 'Keep a steady pulse without interrupting anyone.',
    detail:
      'Get instant high-level summaries and metric trends without waiting for weekly syncs or asking an analyst to pull numbers.',
  },
  {
    role: 'Analysts & Data Teams',
    tagline: 'Skip the repetitive queries, keep the interesting work.',
    detail:
      'Let routine ad-hoc questions answer themselves automatically so you can focus on high-leverage architectural and strategic projects.',
  },
  {
    role: 'Operations & Growth',
    tagline: 'Spot bottlenecks while they are still small.',
    detail:
      'Catch conversion shifts, cohort changes, and operational hiccups early with root-cause context already mapped out.',
  },
  {
    role: 'Finance & Revenue',
    tagline: 'Understand revenue with fewer month-end surprises.',
    detail:
      'Track MRR movements, expansion trends, and churn factors in plain words alongside clean reconcile-ready data tables.',
  },
];

export const UseCasesSection: React.FC = () => {
  return (
    <section
      id="use-cases"
      className="relative py-24 md:py-36 px-6 md:px-16 max-w-7xl mx-auto space-y-16 pointer-events-auto"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-10% 0px -10% 0px' }}
        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-2xl space-y-4"
      >
        <div className="inline-flex items-center gap-2 text-xs font-mono tracking-widest uppercase text-[#4A4238]/60 dark:text-[#EDE6DC]/60">
          <span className="w-1.5 h-1.5 rounded-full bg-[#8FA98F]" />
          Built For Your Entire Team
        </div>
        <h2 className="font-serif text-4xl md:text-5xl text-[#4A4238] dark:text-[#EDE6DC] font-normal leading-tight">
          Clarity tailored to how you work.
        </h2>
      </motion.div>

      {/* 4 Persona Cards with Staggered Entrance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {USE_CASES.map((uc, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10% 0px -10% 0px' }}
            transition={{
              duration: 0.7,
              delay: idx * 0.12,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="glass-card rounded-3xl p-8 md:p-10 space-y-4 border border-[#4A4238]/10 dark:border-white/10 hover:border-[#8FA98F]/40 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="font-serif text-2xl text-[#4A4238] dark:text-[#EDE6DC] font-normal">
                {uc.role}
              </span>
              <span className="w-2 h-2 rounded-full bg-[#8FA98F]" />
            </div>

            <p className="text-base font-medium text-[#4A4238] dark:text-[#EDE6DC]">
              &ldquo;{uc.tagline}&rdquo;
            </p>

            <p className="text-sm text-[#4A4238]/70 dark:text-[#EDE6DC]/70 leading-relaxed pt-2">
              {uc.detail}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
};
