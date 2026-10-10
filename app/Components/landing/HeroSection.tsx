import React from 'react';
import Link from 'next/link';

export const HeroSection: React.FC = () => {
  return (
    <section
      id="hero"
      className="relative min-h-[80vh] flex flex-col items-center justify-center text-center pt-[calc(var(--nav-h,96px)+48px)] pb-24 px-6 max-w-3xl mx-auto"
    >
      <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl tracking-tight text-[#322C28] dark:text-[#F4EDE5] font-normal leading-[1.08]">
        Ask your data{' '}
        <em className="font-serif italic text-[#C45A42] dark:text-[#EBA58F]">anything.</em>
      </h1>

      <p className="mt-6 text-base md:text-lg text-[#3F3830] dark:text-[#E6DCD2] max-w-xl leading-relaxed">
        Upload a file and get answers with the exact figures and the query behind each one, so you can check every number yourself.
      </p>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/login?tab=register"
          className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-[#E3836C] hover:bg-[#ED967F] active:bg-[#C96F5A] text-[#FFF7F1] font-medium text-base transition-all duration-200 shadow-sm hover:shadow-md whitespace-nowrap"
        >
          Start analyzing now
        </Link>
        <Link
          href="/case"
          className="inline-flex items-center min-h-11 px-4 py-3 text-sm font-medium text-[#C45A42] dark:text-[#EBA58F] underline underline-offset-4 hover:text-[#322C28] dark:hover:text-[#F4EDE5] transition-colors"
        >
          Watch a real run, no signup
        </Link>
      </div>
    </section>
  );
};
