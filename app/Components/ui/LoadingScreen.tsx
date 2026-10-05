'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { loaderExpired, loaderProgress, loaderStatus, skipVisible } from '../../lib/loaderProgress.mjs';

interface LoadingScreenProps {
  onComplete: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [isHiding, setIsHiding] = useState(false);
  const doneRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setIsHiding(true);
    window.setTimeout(() => onCompleteRef.current(), 400);
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      doneRef.current = true;
      onCompleteRef.current();
      return;
    }
    // Progress is a function of elapsed time, not of how many ticks ran: a heavy scene can block timers for seconds,
    // and a tick counter would sit at 0% until it ended. The loader also expires on its own and can be skipped.
    const started = Date.now();
    const tick = () => {
      const ms = Date.now() - started;
      setElapsed(ms);
      setProgress(loaderProgress(ms));
      if (loaderExpired(ms) || loaderProgress(ms) >= 100) finish();
    };
    const interval = window.setInterval(tick, 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('keydown', onKey);
    };
  }, [finish]);

  const status = loaderStatus(progress);

  // Radius = 100, circumference = 2 * PI * 100 = 628.3
  const radius = 100;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div
      id="v3d-loader"
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#F3EDE4] dark:bg-[#171514] transition-opacity duration-600 ${
        isHiding ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
      }`}
    >
      {/* SVG Circular Progress Ring + Centered 3D Rotating Logo */}
      <div className="relative w-64 h-64 flex items-center justify-center mb-6">
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 240 240">
          <circle
            cx="120"
            cy="120"
            r={radius}
            fill="transparent"
            stroke="rgba(74, 66, 56, 0.1)"
            strokeWidth="3"
          />
          <circle
            cx="120"
            cy="120"
            r={radius}
            fill="transparent"
            stroke="#E3836C"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-150 ease-out"
          />
        </svg>

        {/* 3D Rotating Geometric Logo Prism */}
        <div className="relative w-20 h-20 flex items-center justify-center animate-v3d-rotate z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#E3836C] via-[#E8C4A0] to-[#B8A9C9] shadow-lg shadow-[#E3836C]/30 transform rotate-45 animate-pulse" />
          <div className="absolute w-7 h-7 rounded-lg bg-[#F3EDE4] dark:bg-[#211E1C] transform rotate-12" />
        </div>
      </div>

      {/* Status & Counter */}
      <div className="text-center space-y-2">
        <div className="text-xs font-mono tracking-[0.25em] uppercase text-[#E3836C] animate-v3d-pulse">
          {status}
        </div>
        <div className="font-serif text-3xl md:text-4xl text-[#4A4238] dark:text-[#F4EDE5] font-normal tracking-tight">
          {Math.floor(progress)}%
        </div>
        <div className="text-[11px] font-mono tracking-widest text-[#4A4238]/50 dark:text-[#91867E] uppercase">
          AnalyzeIt · Analytics, made calm
        </div>
        {skipVisible(elapsed) ? (
          <button
            type="button"
            onClick={finish}
            className="mt-3 rounded-full border border-[#4A4238]/20 px-4 py-1.5 text-xs font-mono uppercase tracking-widest text-[#4A4238]/70 hover:border-[#E3836C] hover:text-[#C45A42] dark:text-[#C5B9AE]"
          >
            Skip intro
          </button>
        ) : null}
      </div>
    </div>
  );
};
