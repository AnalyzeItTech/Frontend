'use client';

import React, { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDialogA11y } from './useDialogA11y';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  /** Short helper text under the title (also announced to screen readers). */
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Disable Esc / backdrop close while a save is in flight. */
  dismissible?: boolean;
}

const SIZES = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' } as const;

/**
 * Accessible dialog: role="dialog", aria-modal, labelled by its title, Esc to close, focus moves in,
 * Tab is trapped, focus returns to the trigger, and page scroll is locked while open.
 */
export function Modal({ open, onClose, title, description, children, footer, size = 'md', dismissible = true }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  useDialogA11y(open, panelRef, onClose, dismissible);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && dismissible) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={`w-full ${SIZES[size]} max-h-[92vh] flex flex-col bg-[var(--surface)] border border-[var(--border)] rounded-t-2xl sm:rounded-2xl shadow-2xl outline-none`}
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3 border-b border-[var(--border)]">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold text-[var(--text-primary)]">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-0.5 text-xs text-[var(--text-muted)]">
                {description}
              </p>
            )}
          </div>
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="shrink-0 p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--coral)] cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          )}
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-[var(--border)] flex items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
