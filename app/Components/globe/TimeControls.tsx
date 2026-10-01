'use client';

import { IconCheck, IconLink, IconPlayerPause, IconPlayerPlay } from '@tabler/icons-react';
import { DAY_OPTIONS, cursorTime, formatCursor, windowBounds } from './scene.mjs';

interface Props {
  days: number;
  onDays: (d: number) => void;
  /** 0..1 position of the replay cursor inside the window; 1 = live (now). */
  cursor: number;
  onCursor: (c: number) => void;
  playing: boolean;
  onPlay: (on: boolean) => void;
  shared: boolean;
  onShare: () => void;
}

/** Time window, replay scrubber and share-link button for the live event layers. */
export function TimeControls({ days, onDays, cursor, onCursor, playing, onPlay, shared, onShare }: Props) {
  const live = cursor >= 1;
  const bounds = windowBounds(days);
  const label = live ? 'Live — showing everything up to now' : `Replaying up to ${formatCursor(cursorTime(cursor, bounds), days)}`;

  return (
    <div className="border-b border-[var(--border)] px-3 py-2" role="group" aria-label="Time window and replay">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium text-[var(--text-primary)]">Time</p>
        <button
          type="button"
          onClick={onShare}
          className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-[11px] text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
          title="Copy a link to this exact view"
        >
          {shared ? <IconCheck size={12} aria-hidden /> : <IconLink size={12} aria-hidden />}
          {shared ? 'Link copied' : 'Share view'}
        </button>
      </div>

      <div className="flex gap-1" role="radiogroup" aria-label="Event window">
        {DAY_OPTIONS.map((d) => (
          <button
            key={d}
            type="button"
            role="radio"
            aria-checked={days === d}
            onClick={() => onDays(d)}
            className={`flex-1 rounded-md border px-1.5 py-1 text-[11px] transition ${
              days === d
                ? 'border-[var(--border-strong)] bg-[var(--surface-2)] text-[var(--text-primary)]'
                : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)]'
            }`}
          >
            {d === 1 ? '24h' : `${d}d`}
          </button>
        ))}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            if (!playing && cursor >= 1) onCursor(0); // restart from the beginning
            onPlay(!playing);
          }}
          aria-label={playing ? 'Pause replay' : 'Replay events over time'}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-2)]"
        >
          {playing ? <IconPlayerPause size={14} aria-hidden /> : <IconPlayerPlay size={14} aria-hidden />}
        </button>
        <input
          type="range"
          min={0}
          max={1000}
          value={Math.round(cursor * 1000)}
          onChange={(e) => {
            onPlay(false);
            onCursor(Number(e.target.value) / 1000);
          }}
          aria-label="Replay position"
          aria-valuetext={label}
          className="h-1.5 w-full cursor-pointer accent-[#EA8069]"
        />
        <button
          type="button"
          onClick={() => {
            onPlay(false);
            onCursor(1);
          }}
          disabled={live}
          className="shrink-0 rounded-md px-1.5 py-1 text-[11px] text-[var(--text-secondary)] hover:bg-[var(--surface-2)] disabled:opacity-40"
        >
          Live
        </button>
      </div>
      <p className="mt-1 text-[10px] text-[var(--text-muted)]" aria-live="polite">
        {label}
      </p>
    </div>
  );
}
