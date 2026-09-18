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
    tagline: 'Bring sources in honestly.',
    description:
      'Create an account, attach connectors when they are ready, and shape objects with clear status — connected, coming soon, or error. No half-broken Connect buttons.',
  },
  {
    step: '02',
    title: 'Ask',
    tagline: 'Research in plain words.',
    description:
      'Chat or deep research with tool-backed answers. Simple calc, weather, FX, and stocks can resolve as From tools · 0 tokens. Prepared on device when your browser helps compress context.',
  },
  {
    step: '03',
    title: 'Explore',
    tagline: 'Map, canvas, then decide.',
    description:
      'Pin a place on Globe and ask why, build calm dashboards on warm paper, and use deep orchestrated context on higher tiers — not a stuffed single API call.',
  },
];

export const HowItWorksSection: React.FC = () => {
  return (
    <section
      id="how-it-works"
      className="relative py-24 md:py-36 px-6 md:px-16 max-w-7xl mx-auto space-y-16 pointer-events-auto scroll-mt-[calc(var(--nav-h,56px)+24px)]"
    >
      <div className="max-w-2xl space-y-4">
        <div className="inline-flex items-center gap-2 text-xs font-mono tracking-widest uppercase text-[#4A4238]/60 dark:text-[#91867E]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#9EBB9A]" />
          Three Steps to Clarity
        </div>
        <h2 className="font-serif text-4xl md:text-5xl text-[#4A4238] dark:text-[#F4EDE5] font-normal">
          How it works
        </h2>
        <p className="text-base text-[#4A4238]/70 dark:text-[#C5B9AE]">
          Keep the crystal descent. Skip when you are ready. Then connect, ask, and explore — without dashboard busywork.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
        {STEPS.map((s, idx) => (
          <div
            key={s.step}
            className="glass-card rounded-3xl p-8 space-y-5 relative border border-[#4A4238]/10 dark:border-[#3A3430] hover:border-[#E3836C]/30 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="font-serif text-3xl text-[#E3836C] font-normal">{s.step}</span>
              <span className="text-xs font-mono uppercase tracking-wider text-[#4A4238]/50 dark:text-[#91867E]">
                Step {idx + 1}
              </span>
            </div>
            <div className="space-y-2">
              <h3 className="font-serif text-2xl text-[#4A4238] dark:text-[#F4EDE5] font-normal">{s.title}</h3>
              <p className="text-sm font-medium text-[#4A4238] dark:text-[#F4EDE5]">{s.tagline}</p>
            </div>
            <p className="text-sm text-[#4A4238]/70 dark:text-[#C5B9AE] leading-relaxed">{s.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
};
