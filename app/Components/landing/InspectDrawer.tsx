'use client';

import React from 'react';

export interface DrawerDetail {
  title: string;
  category: string;
  subtitle: string;
  narrative: string;
  metrics: { label: string; value: string }[];
  steps: string[];
}

interface InspectDrawerProps {
  detail: DrawerDetail | null;
  onClose: () => void;
}

export const InspectDrawer: React.FC<InspectDrawerProps> = ({
  detail,
  onClose,
}) => {
  if (!detail) return null;

  return (
    <div className="fixed inset-0 z-[80] flex justify-end pointer-events-auto">
      {/* Dark Ambient Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-[#4A4238]/30 backdrop-blur-xs transition-opacity duration-300"
      />

      {/* Slide-out Panel */}
      <div className="relative w-full max-w-lg bg-[#F3EDE4] text-[#4A4238] h-full shadow-2xl p-8 sm:p-12 overflow-y-auto z-10 border-l border-[#4A4238]/10 flex flex-col justify-between space-y-8 animate-in slide-in-from-right duration-300">
        {/* Header & Signature Diagonal Arrow Close Button */}
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#4A4238]/10">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#D4826A] font-medium">
                [ ARCHITECTURE SPEC ] // {detail.category}
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl text-[#4A4238] font-normal tracking-tight">
                {detail.title}
              </h2>
              <p className="text-xs sm:text-sm text-[#4A4238]/70 font-medium">
                {detail.subtitle}
              </p>
            </div>

            {/* Signature Diagonal Arrow Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-[#4A4238]/5 hover:bg-[#D4826A] hover:text-white border border-[#4A4238]/10 flex items-center justify-center p-2.5 transition-all duration-200 cursor-pointer shrink-0 text-[#4A4238]"
              title="Close Panel"
            >
              <svg viewBox="0 0 19.1 29.1" className="w-full h-full fill-current">
                <path d="M5.9,10.6l8.7,8.7l4.3-4.3c0.2-0.2,0.2-0.6,0-0.8L5,0.3c-0.2-0.2-0.6-0.2-0.8,0L0.3,4.1C0.1,4.4,0.1,4.7,0.3,5L5.9,10.6z" />
                <path d="M4.5,29c0.2,0,0.3-0.1,0.4-0.2l8.2-8.2L8.5,16l-8.2,8.2c-0.1,0.1-0.2,0.3-0.2,0.4c0,0.2,0.1,0.3,0.2,0.4l3.8,3.8C4.2,28.9,4.4,29,4.5,29z" />
              </svg>
            </button>
          </div>

          {/* Narrative Overview */}
          <div className="text-xs sm:text-sm text-[#4A4238]/80 leading-relaxed font-normal">
            {detail.narrative}
          </div>

          {/* Metric Telemetry Cards */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            {detail.metrics.map((m, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-white/60 border border-[#4A4238]/8 space-y-1"
              >
                <div className="text-[10px] font-mono uppercase text-[#4A4238]/50">
                  {m.label}
                </div>
                <div className="font-serif text-lg text-[#D4826A] font-medium">
                  {m.value}
                </div>
              </div>
            ))}
          </div>

          {/* Execution Pipeline Steps */}
          <div className="space-y-3 pt-4 border-t border-[#4A4238]/10">
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#D4826A]">
              Automated Data Pipeline
            </div>
            {detail.steps.map((step, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 text-xs sm:text-sm text-[#4A4238]/80 p-3 rounded-2xl bg-white/40 border border-[#4A4238]/6"
              >
                <span className="w-5 h-5 rounded-full bg-[#8FA98F]/20 text-[#8FA98F] flex items-center justify-center text-xs font-mono shrink-0 mt-0.5 font-medium">
                  {idx + 1}
                </span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-6 border-t border-[#4A4238]/10 flex items-center justify-between">
          <span className="text-[10px] font-mono text-[#4A4238]/50 uppercase">
            Live Warehouse Connection Verified
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-full bg-[#4A4238] hover:bg-[#383129] text-[#F3EDE4] text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer"
          >
            Close Spec
          </button>
        </div>
      </div>
    </div>
  );
};
