'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { IconMessageDots, IconSearch, IconWorld } from '@tabler/icons-react';
import { getStoredToken } from '../../lib/auth';
import {
  COMPOSER_SEGMENTS,
  GLOBE_SIGN_IN_LINE,
  globeSegmentResult,
  moveComposerSegment,
  type ComposerSegment,
} from '../../lib/composerMode.mjs';

const ICONS = {
  chat: IconMessageDots,
  research: IconSearch,
  globe: IconWorld,
} as const;

const LABELS = {
  chat: 'Chat',
  research: 'Research',
  globe: 'Globe',
} as const;

/**
 * Chat | Research | Globe. Arrow keys move between segments.
 * Globe still opens /globe when a session exists; otherwise the sign-in line.
 */
export function ComposerModeControl({
  mode,
  onMode,
}: {
  mode: 'chat' | 'research';
  onMode: (mode: 'chat' | 'research') => void;
}) {
  const refs = useRef<Array<HTMLButtonElement | HTMLAnchorElement | null>>([]);
  const [globeGated, setGlobeGated] = useState(false);
  const [roving, setRoving] = useState<ComposerSegment | null>(null);
  const tabStop: ComposerSegment = roving ?? mode;

  const selectMode = (next: 'chat' | 'research') => {
    setRoving(null);
    setGlobeGated(false);
    onMode(next);
  };

  const gateGlobe = () => {
    const result = globeSegmentResult(Boolean(getStoredToken()));
    if (result.kind === 'gate') {
      setGlobeGated(true);
      return true;
    }
    setGlobeGated(false);
    return false;
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const active = document.activeElement?.getAttribute('data-segment');
    const current = (COMPOSER_SEGMENTS as readonly string[]).includes(active || '')
      ? (active as ComposerSegment)
      : mode;
    const index = Math.max(0, COMPOSER_SEGMENTS.indexOf(current));
    const nextIndex = moveComposerSegment(index, event.key);
    if (nextIndex != null) {
      event.preventDefault();
      const next = COMPOSER_SEGMENTS[nextIndex];
      setRoving(next === 'globe' ? 'globe' : null);
      refs.current[nextIndex]?.focus();
      if (next === 'chat' || next === 'research') selectMode(next);
      return;
    }
    if (event.key === ' ' && current === 'globe') {
      event.preventDefault();
      if (!gateGlobe()) refs.current[COMPOSER_SEGMENTS.indexOf('globe')]?.click();
    }
  };

  return (
    <div className="flex w-full min-w-0 flex-col gap-1.5 sm:w-auto">
      <div
        role="tablist"
        aria-label="Conversation mode"
        aria-orientation="horizontal"
        onKeyDown={onKeyDown}
        className="composer-mode w-full sm:w-auto"
      >
        {COMPOSER_SEGMENTS.map((segment, index) => {
          const Icon = ICONS[segment];
          const selected = segment !== 'globe' && mode === segment;
          const shared = {
            'data-segment': segment,
            role: 'tab' as const,
            'aria-selected': selected,
            tabIndex: tabStop === segment ? 0 : -1,
            className: 'composer-mode-tab',
            ref: (node: HTMLButtonElement | HTMLAnchorElement | null) => {
              refs.current[index] = node;
            },
          };
          if (segment === 'globe') {
            return (
              <Link
                key={segment}
                href="/globe"
                {...shared}
                onClick={(event) => {
                  if (gateGlobe()) event.preventDefault();
                }}
              >
                <Icon size={14} aria-hidden />
                {LABELS[segment]}
              </Link>
            );
          }
          return (
            <button
              key={segment}
              type="button"
              {...shared}
              title={segment === 'research' ? 'Research uses live web and geo tools' : undefined}
              onClick={() => selectMode(segment)}
            >
              <Icon size={14} aria-hidden />
              {LABELS[segment]}
            </button>
          );
        })}
      </div>
      {globeGated ? (
        <p role="status" className="px-1 text-xs leading-snug text-[var(--text-muted)]">
          <Link
            href="/login?next=/globe"
            className="underline decoration-[var(--border-strong)] underline-offset-2 hover:text-[var(--text)]"
          >
            {GLOBE_SIGN_IN_LINE}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
