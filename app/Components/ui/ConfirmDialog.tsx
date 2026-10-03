'use client';

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Modal } from './Modal';

export interface ConfirmOptions {
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as destructive. */
  danger?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((o) => {
    resolver.current?.(false); // a newer prompt supersedes an unanswered one
    setOpts(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOpts(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={opts !== null}
        onClose={() => settle(false)}
        title={opts?.title ?? ''}
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => settle(false)}
              className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-2)] cursor-pointer"
            >
              {opts?.cancelLabel ?? 'Cancel'}
            </button>
            <button
              type="button"
              data-autofocus
              onClick={() => settle(true)}
              className={`px-3 py-1.5 text-sm rounded-lg text-white font-medium cursor-pointer ${
                opts?.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-[var(--coral)] hover:bg-[var(--coral-dark)]'
              }`}
            >
              {opts?.confirmLabel ?? 'Confirm'}
            </button>
          </>
        }
      >
        {opts?.message && <div className="text-sm text-[var(--text-muted)] whitespace-pre-line">{opts.message}</div>}
      </Modal>
    </ConfirmContext.Provider>
  );
}

/** `const confirm = useConfirm(); if (await confirm({ title: 'Delete?', danger: true })) ...` */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  // Outside a provider fall back to the browser prompt so callers still work.
  return ctx ?? (async (o) => (typeof window !== 'undefined' ? window.confirm(`${o.title}${typeof o.message === 'string' ? `\n\n${o.message}` : ''}`) : false));
}
