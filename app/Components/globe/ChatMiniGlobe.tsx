'use client';

import { GlobeCanvas } from './GlobeCanvas';
import { useGlobe } from './useGlobe';

/** Full-bleed Chat globe — visual layer only; never calls POST /v1/geo/context. */
export function ChatMiniGlobe() {
  const { flyCallout, inFlight, activePoints, mapReady, expandToFull, selectedPoint } = useGlobe();

  const status =
    flyCallout ||
    (inFlight
      ? 'Flying…'
      : selectedPoint?.host ||
        selectedPoint?.label ||
        (activePoints.length
          ? `${activePoints.length} source${activePoints.length === 1 ? '' : 's'}`
          : null));

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <GlobeCanvas variant="mini" className="h-full w-full" />
      <div className="chat-globe-scrim absolute inset-0" />
      {!mapReady ? (
        <span className="absolute inset-0 z-10 flex items-center justify-center font-mono text-[10px] text-[var(--text-muted)]">
          Globe…
        </span>
      ) : null}

      <div className="pointer-events-auto absolute right-4 top-3 z-20 flex max-w-[min(16rem,42vw)] flex-col items-end gap-2 sm:right-6 sm:top-4">
        {status ? (
          <span
            className={`truncate rounded-full px-2.5 py-1 text-[10px] font-mono tracking-wide shadow-sm backdrop-blur-md ${
              inFlight
                ? 'bg-[#EA8069]/90 text-white'
                : 'bg-[var(--surface)]/80 text-[var(--text-secondary)]'
            }`}
          >
            {status}
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => expandToFull()}
          className="rounded-full border border-[var(--border)] bg-[var(--surface)]/80 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] shadow-sm backdrop-blur-md hover:text-[var(--text-primary)]"
          aria-label="Open full globe"
        >
          Expand globe
        </button>
      </div>
    </div>
  );
}
