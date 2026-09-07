'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';

export const ClosingCTASection: React.FC = () => {
  return (
    <section className="relative py-32 md:py-48 px-6 md:px-16 max-w-5xl mx-auto text-center space-y-8 pointer-events-auto">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-10% 0px -10% 0px' }}
        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EBA58F]/15 dark:bg-[#5A332C]/40 border border-[#EBA58F]/30 dark:border-[#8A4D40]/50 text-xs font-mono tracking-widest uppercase text-[#4A4238]/70 dark:text-[#C5B9AE]"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#E3836C]" />
        Begin Quietly
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-10% 0px -10% 0px' }}
        transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="font-serif text-5xl sm:text-6xl md:text-7xl text-[#4A4238] dark:text-[#F4EDE5] font-normal leading-[1.08] max-w-3xl mx-auto"
      >
        Data clarity shouldn&apos;t feel exhausting.
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-10% 0px -10% 0px' }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="text-base md:text-lg text-[#4A4238]/70 dark:text-[#C5B9AE] max-w-xl mx-auto leading-relaxed"
      >
        A quieter, more thoughtful way to understand your business numbers and move forward with confidence.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-10% 0px -10% 0px' }}
        transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="pt-4 space-y-3"
      >
        <Link
          href="/login"
          className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-[#E3836C] hover:bg-[#ED967F] active:bg-[#C96F5A] text-[#FFF7F1] font-medium text-base transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 whitespace-nowrap"
        >
          Start a free trial
        </Link>
        <div className="text-xs text-[#4A4238]/60 dark:text-[#91867E] font-mono">
          No credit card required · 5-minute setup
        </div>
      </motion.div>
    </section>
  );
};
