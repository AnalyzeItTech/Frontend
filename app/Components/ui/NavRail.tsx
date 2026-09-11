'use client';

import React, { useState, useEffect } from 'react';

interface NavPoint {
  id: string;
  label: string;
  targetId: string;
}

const NAV_POINTS: NavPoint[] = [
  { id: 'hero', label: 'Overview', targetId: 'hero' },
  { id: 'descent', label: '01 // 3D Descent', targetId: 'descent' },
  { id: 'capabilities', label: '02 // Capabilities', targetId: 'capabilities' },
  { id: 'how-it-works', label: '03 // Workflow', targetId: 'how-it-works' },
  { id: 'comparison', label: '04 // Why Calm', targetId: 'comparison' },
  { id: 'use-cases', label: '05 // Team', targetId: 'use-cases' },
  { id: 'pricing', label: '06 // Pricing', targetId: 'pricing' },
  { id: 'faq', label: '07 // FAQ', targetId: 'faq' },
];

export const NavRail: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('hero');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-30% 0px -30% 0px' }
    );

    NAV_POINTS.forEach((pt) => {
      const el = document.getElementById(pt.targetId);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav className="fixed left-3 top-1/2 -translate-y-1/2 z-20 hidden xl:flex flex-col gap-3 pointer-events-none w-14" aria-label="Page sections">
      <div className="flex flex-col gap-3 p-3 rounded-full glass-pill border border-[#4A4238]/10 dark:border-[#3A3430] dark:bg-[#211E1C]/80 pointer-events-auto shadow-xs">
        {NAV_POINTS.map((pt) => {
          const isActive = activeSection === pt.targetId;
          return (
            <button
              key={pt.id}
              onClick={() => scrollTo(pt.targetId)}
              className="group relative flex items-center gap-3 cursor-pointer py-2 px-2 min-h-11 min-w-11 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E3836C] rounded-full"
              title={pt.label}
            >
              {/* Dot Indicator */}
              <span
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  isActive
                    ? 'bg-[#E3836C] scale-150 shadow-xs shadow-[#E3836C]'
                    : 'bg-[#4A4238]/25 dark:bg-[#504740] group-hover:bg-[#4A4238]/60 dark:group-hover:bg-[#91867E] group-hover:scale-125'
                }`}
              />

              {/* Hover Label Tooltip */}
              <span
                className={`absolute left-8 whitespace-nowrap text-[11px] leading-none font-mono tracking-wider transition-all duration-200 uppercase pointer-events-none rounded-md px-2 py-1 min-h-[11px] ${
                  isActive
                    ? 'text-[var(--text-muted,#81786F)] dark:text-[#C5B9AE] font-medium opacity-100 bg-[var(--surface,#FFFCF8)]/95 dark:bg-[#302B28]/95 border border-[var(--border,#E2D7CA)] dark:border-[#504740] shadow-xs translate-x-0'
                    : 'text-[var(--text-muted,#81786F)] dark:text-[#C5B9AE] opacity-0 group-hover:opacity-100 bg-[var(--surface,#FFFCF8)]/95 dark:bg-[#302B28]/90 -translate-x-1 group-hover:translate-x-0'
                }`}
              >
                {pt.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
