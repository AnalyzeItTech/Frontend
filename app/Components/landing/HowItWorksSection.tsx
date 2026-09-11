'use client';

import React from 'react';
import { motion } from 'motion/react';

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
      'Connect Stripe or Salesforce in preview, or start from a sample dashboard template. Additional warehouses and spreadsheet uploads are coming next.',
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
      className="relative py-24 md:py-36 px-6 md:px-16 max-w-7xl mx-auto space-y-16 pointer-events-auto scroll-mt-[calc(var(--nav-h,56px)+24px)]"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 1, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-2xl space-y-4"
      >
        <div className="inline-flex items-center gap-2 text-xs font-mono tracking-widest uppercase text-[#4A4238]/60 dark:text-[#91867E]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#9EBB9A]" />
          Three Steps to Clarity
        </div>
        <h2 className="font-serif text-4xl md:text-5xl text-[#4A4238] dark:text-[#F4EDE5] font-normal">
          How it works
        </h2>
        <p className="text-base text-[#4A4238]/70 dark:text-[#C5B9AE]">
          No training seminars, no SQL certification, and no fragile dashboards to maintain.
        </p>
      </motion.div>

      {/* 3 Steps Grid with Staggered Entrance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
        {STEPS.map((s, idx) => (
          <motion.div
            key={s.step}
            initial={{ opacity: 0, y: 35 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{
              duration: 0.7,
              delay: idx * 0.15,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="glass-card rounded-3xl p-8 space-y-5 relative border border-[#4A4238]/10 dark:border-[#3A3430] hover:border-[#E3836C]/30 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="font-serif text-3xl text-[#E3836C] font-normal">
                {s.step}
              </span>
              <span className="text-xs font-mono uppercase tracking-wider text-[#4A4238]/50 dark:text-[#91867E]">
                Step {idx + 1}
              </span>
            </div>

            <div className="space-y-2">
              <h3 className="font-serif text-2xl text-[#4A4238] dark:text-[#F4EDE5] font-normal">
                {s.title}
              </h3>
              <p className="text-sm font-medium text-[#4A4238] dark:text-[#F4EDE5]">
                {s.tagline}
              </p>
            </div>

            <p className="text-sm text-[#4A4238]/70 dark:text-[#C5B9AE] leading-relaxed">
              {s.description}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
};
