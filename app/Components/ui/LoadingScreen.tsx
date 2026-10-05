'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  LOADER_MAX_MS,
  LOADER_STALL_MS,
  loaderShouldDismiss,
  loaderStatus,
  skipVisible,
} from '../../lib/loaderProgress.mjs';

interface LoadingScreenProps {
  onComplete: () => void;
  /** Last scene progress event. Null means the scene has not reported yet. */
  progress?: number | null;
  sceneReady?: boolean;
  staticFallback?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  onComplete,
  progress = null,
  sceneReady = false,
  staticFallback = false,
}) => {
  const [elapsed, setElapsed] = useState(0);
  const doneRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const progressRef = useRef(progress);
  const positiveRef = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    progressRef.current = progress;
    if (progress != null && progress > 0) positiveRef.current = true;
  }, [onComplete, progress]);

  const finish = useCallback((reason: string) => {
    if (doneRef.current) return;
    doneRef.current = true;
    if (typeof window !== 'undefined') {
      window.__ANALYZIT_SCENE_SKIP__ = window.__ANALYZIT_SCENE_SKIP__ || reason;
      document.documentElement.classList.add('scene-skipped');
    }
    onCompleteRef.current();
  }, []);

  useEffect(() => {
    if (sceneReady) finish('ready');
    else if (staticFallback) finish('fallback');
  }, [sceneReady, staticFallback, finish]);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (
      loaderShouldDismiss({
        elapsedMs: 0,
        progress: progressRef.current,
        reducedMotion: reduced,
        sceneReady: false,
        positiveProgressSeen: positiveRef.current,
      })
    ) {
      finish(reduced ? 'reduced-motion' : 'stall');
      return;
    }

    const started = Date.now();
    const tick = () => {
      const ms = Date.now() - started;
      setElapsed(ms);
      const value = progressRef.current;
      if (
        loaderShouldDismiss({
          elapsedMs: ms,
          progress: value,
          reducedMotion: false,
          sceneReady: false,
          positiveProgressSeen: positiveRef.current || (value != null && value > 0),
        })
      ) {
        finish(ms >= LOADER_MAX_MS ? 'cap' : 'stall');
      }
    };

    const interval = window.setInterval(tick, 100);
    const stallTimer = window.setTimeout(tick, LOADER_STALL_MS);
    const capTimer = window.setTimeout(tick, LOADER_MAX_MS);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish('skip');
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(stallTimer);
      window.clearTimeout(capTimer);
      window.removeEventListener('keydown', onKey);
    };
  }, [finish]);

  const shown = progress == null ? 0 : progress;
  const status = loaderStatus(shown);

  const radius = 100;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (shown / 100) * circumference;

  return (
    <div
      id="v3d-loader"
      suppressHydrationWarning
      className="pointer-events-auto fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#F3EDE4] opacity-100 dark:bg-[#171514]"
    >
      <div className="relative mb-6 flex h-64 w-64 items-center justify-center">
        <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 240 240">
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

        <div className="animate-v3d-rotate relative z-10 flex h-20 w-20 items-center justify-center">
          <div className="h-14 w-14 rotate-45 animate-pulse rounded-2xl bg-gradient-to-tr from-[#E3836C] via-[#E8C4A0] to-[#B8A9C9] shadow-lg shadow-[#E3836C]/30" />
          <div className="absolute h-7 w-7 rotate-12 rounded-lg bg-[#F3EDE4] dark:bg-[#211E1C]" />
        </div>
      </div>

      <div className="space-y-2 text-center">
        <div className="animate-v3d-pulse font-mono text-xs tracking-[0.25em] text-[#E3836C] uppercase">
          {status}
        </div>
        <div
          id="scene-loader-progress"
          data-progress={shown}
          className="font-serif text-3xl font-normal tracking-tight text-[#4A4238] md:text-4xl dark:text-[#F4EDE5]"
        >
          {Math.floor(shown)}%
        </div>
        <div className="font-mono text-[11px] tracking-widest text-[#4A4238]/50 uppercase dark:text-[#91867E]">
          AnalyzeIt · Analytics, made calm
        </div>
      </div>

      {skipVisible(elapsed) ? (
        <button
          id="scene-skip"
          type="button"
          onClick={() => finish('skip')}
          className="fixed right-5 bottom-5 z-[100000] inline-flex min-h-11 items-center rounded-full border border-[#4A4238]/20 bg-[#F3EDE4]/95 px-4 py-1.5 font-mono text-xs tracking-widest text-[#4A4238]/80 uppercase shadow-sm hover:border-[#E3836C] hover:text-[#C45A42] dark:bg-[#211E1C]/95 dark:text-[#C5B9AE]"
        >
          Skip
        </button>
      ) : null}
    </div>
  );
};
