'use client';

import { GlobeCanvas } from './GlobeCanvas';
import { useGlobe } from './useGlobe';

export function ChatMiniGlobe() {
  const { flyCallout, inFlight, activePoints, mapReady, expandToFull, selectedPoint } = useGlobe();

  const status =
    flyCallout ||
    (inFlight
      ? 'Flying…'
      : selectedPoint
        ? selectedPoint.host
          ? selectedPoint.host
          : selectedPoint.label
        : activePoints.length
          ? `${activePoints.length} source${activePoints.length === 1 ? '' : 's'}`
          : 'Idle');

  return (
    <div className="pointer-events-none absolute bottom-[8.25rem] right-3 z-30 hidden sm:block md:right-5">
      <div className="pointer-events-auto">
        <button
          type="button"
          onClick={() => expandToFull()}
          className="group relative block h-[232px] w-[232px] overflow-hidden rounded-[18px] text-left shadow-[0_18px_40px_rgba(40,28,18,0.22)] ring-1 ring-[#E3836C]/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3836C]"
          aria-label="Open full globe"
          title="Open full globe"
        >
          <GlobeCanvas variant="mini" className="h-full w-full" />
          {!mapReady ? (
            <span className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--surface-2)]/80 font-mono text-[10px] text-[var(--text-muted)]">
              Globe…
            </span>
          ) : null}
          <span className="pointer-events-none absolute inset-0 z-10 rounded-[18px] ring-1 ring-inset ring-white/25 dark:ring-white/10" />
          <span
            className={`pointer-events-none absolute left-2.5 right-2.5 top-2.5 z-20 truncate rounded-full px-2.5 py-1 text-[10px] font-mono tracking-wide shadow-sm backdrop-blur-md ${
              inFlight
                ? 'bg-[#EA8069]/90 text-white'
                : 'bg-[var(--surface)]/88 text-[var(--text-secondary)]'
            }`}
          >
            {status}
          </span>
          <span className="pointer-events-none absolute bottom-2.5 left-2.5 z-20 rounded-full bg-[var(--surface)]/80 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider text-[var(--text-muted)] opacity-0 transition-opacity group-hover:opacity-100">
            Expand
          </span>
        </button>
      </div>
    </div>
  );
}
