'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { CONTEXT_UPGRADE_COPY } from '../../lib/contextWall.mjs';

export type UpgradeReason = 'model' | 'quota' | 'context' | 'generic';

type UpgradeModalProps = {
  open: boolean;
  onClose: () => void;
  reason?: UpgradeReason;
  /** Optional locked model size label, e.g. "Medium (Standard)". */
  lockedModelLabel?: string;
};

const COPY: Record<UpgradeReason, { title: string; body: string }> = {
  model: {
    title: 'Unlock a larger model',
    body: 'That model size is on Premium. Upgrade for Medium and Large — Fast stays free.',
  },
  quota: {
    title: 'Monthly free LLM runs used',
    body: 'You have hit this month’s free LLM run ceiling. Weather and calculator still work when they match. Upgrade for full Chat and a higher monthly budget.',
  },
  context: CONTEXT_UPGRADE_COPY,
  generic: {
    title: 'Upgrade AnalyzeIt',
    body: 'Premium unlocks larger models, a higher monthly LLM budget, and an ad-free workspace.',
  },
};

export function UpgradeModal({ open, onClose, reason = 'generic', lockedModelLabel }: UpgradeModalProps) {
  useEffect(() => {
    if (!open) return;
    // Close native <select> dropdowns that sit under the overlay.
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const copy = COPY[reason];
  const body =
    reason === 'model' && lockedModelLabel
      ? `${lockedModelLabel} needs Premium. Upgrade to unlock Medium and Large — Small (Fast) stays on Free.`
      : copy.body;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
      onClick={onClose}
    >
      <div
        className="app-card w-full max-w-md p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="upgrade-modal-title" className="text-base font-semibold text-[var(--text,#3A342D)]">
          {copy.title}
        </h2>
        <p className="mt-2 text-sm text-[var(--text-secondary,#5C534A)]">{body}</p>
        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Not now
          </button>
          <Link href="/billing" className="btn-primary" onClick={onClose}>
            View plans
          </Link>
        </div>
      </div>
    </div>
  );
}
