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
    <nav className="fixed left-6 top-1/2 -translate-y-1/2 z-40 hidden xl:flex flex-col gap-3 pointer-events-none">
      <div className="flex flex-col gap-3 p-3 rounded-full glass-pill border border-[#4A4238]/10 dark:border-white/10 pointer-events-auto shadow-xs">
        {NAV_POINTS.map((pt) => {
          const isActive = activeSection === pt.targetId;
          return (
            <button
              key={pt.id}
              onClick={() => scrollTo(pt.targetId)}
              className="group relative flex items-center gap-3 cursor-pointer py-1 px-1 text-left"
              title={pt.label}
            >
              {/* Dot Indicator */}
              <span
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  isActive
                    ? 'bg-[#D4826A] scale-150 shadow-xs shadow-[#D4826A]'
                    : 'bg-[#4A4238]/25 dark:bg-white/30 group-hover:bg-[#4A4238]/60 dark:group-hover:bg-white/70 group-hover:scale-125'
                }`}
              />

              {/* Hover Label Tooltip */}
              <span
                className={`absolute left-7 whitespace-nowrap text-[11px] font-mono tracking-wider transition-all duration-200 uppercase pointer-events-none rounded-md px-2 py-0.5 ${
                  isActive
                    ? 'text-[#4A4238] dark:text-[#EDE6DC] font-medium opacity-100 bg-[#F3EDE4]/95 dark:bg-[#1E1916]/95 border border-[#4A4238]/10 dark:border-white/10 shadow-xs translate-x-0'
                    : 'text-[#4A4238]/60 dark:text-white/60 opacity-0 group-hover:opacity-100 bg-[#F3EDE4]/90 dark:bg-[#1E1916]/90 -translate-x-1 group-hover:translate-x-0'
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
