'use client';

import { IconX } from '@tabler/icons-react';
import { useGlobe } from './useGlobe';

export function QueuedFlyToast() {
  const { queuedFlights, consumeQueuedFly, dismissQueuedFly, variant } = useGlobe();
  if (variant !== 'full' || queuedFlights.length === 0) return null;
  const next = queuedFlights[0];
  const label = next.point.host || next.point.label;

  return (
    <div className="absolute bottom-4 left-1/2 z-30 w-[min(22rem,calc(100%-2rem))] -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/95 px-3 py-2.5 shadow-lg backdrop-blur">
        <p className="min-w-0 flex-1 text-[12px] text-[var(--text-primary)]">
          New source found:{' '}
          <span className="font-medium">{label}</span>
        </p>
        <button
          type="button"
          className="shrink-0 rounded-full bg-[#EA8069] px-2.5 py-1 text-[11px] font-medium text-white"
          onClick={() => consumeQueuedFly(next.id)}
        >
          Show me
        </button>
        <button
          type="button"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
          aria-label="Dismiss"
          onClick={() => dismissQueuedFly(next.id)}
        >
          <IconX size={14} />
        </button>
      </div>
    </div>
  );
}
