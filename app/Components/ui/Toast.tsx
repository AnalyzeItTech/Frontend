'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastOptions {
  kind?: ToastKind;
  /** Optional action button, e.g. Undo. */
  action?: { label: string; onClick: () => void | Promise<void> };
  /** ms before auto-dismiss; 0 keeps it until dismissed. Errors default to longer. */
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: number;
  message: string;
}

interface ToastApi {
  toast: (message: string, opts?: ToastOptions) => number;
  success: (message: string, opts?: Omit<ToastOptions, 'kind'>) => number;
  error: (message: string, opts?: Omit<ToastOptions, 'kind'>) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const TONE: Record<ToastKind, string> = {
  success: 'border-emerald-500/40',
  error: 'border-red-500/50',
  info: 'border-[var(--border)]',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const toast = useCallback(
    (message: string, opts: ToastOptions = {}) => {
      const id = nextId.current++;
      const kind = opts.kind ?? 'info';
      const duration = opts.duration ?? (kind === 'error' ? 8000 : opts.action ? 8000 : 4000);
      setItems((prev) => [...prev.slice(-3), { id, message, ...opts, kind }]);
      if (duration > 0) timers.current.set(id, setTimeout(() => dismiss(id), duration));
      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    const live = timers.current;
    return () => live.forEach((t) => clearTimeout(t));
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      toast,
      dismiss,
      success: (m, o) => toast(m, { ...o, kind: 'success' }),
      error: (m, o) => toast(m, { ...o, kind: 'error' }),
    }),
    [toast, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="fixed z-[120] bottom-4 left-1/2 -translate-x-1/2 sm:left-auto sm:right-4 sm:translate-x-0 flex flex-col gap-2 w-[min(92vw,380px)]"
        role="region"
        aria-label="Notifications"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            aria-live={t.kind === 'error' ? 'assertive' : 'polite'}
            className={`flex items-start gap-3 rounded-xl border ${TONE[t.kind ?? 'info']} bg-[var(--surface)] text-[var(--text-primary)] shadow-lg px-4 py-3 text-sm`}
          >
            <span className="flex-1 break-words">{t.message}</span>
            {t.action && (
              <button
                type="button"
                onClick={async () => {
                  dismiss(t.id);
                  await t.action?.onClick();
                }}
                className="shrink-0 font-semibold text-[var(--coral)] hover:underline cursor-pointer"
              >
                {t.action.label}
              </button>
            )}
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dismiss(t.id)}
              className="shrink-0 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const NOOP: ToastApi = {
  toast: () => 0,
  success: () => 0,
  error: () => 0,
  dismiss: () => undefined,
};

/** Safe outside a provider (e.g. in tests/storybook): calls become no-ops instead of throwing. */
export function useToast(): ToastApi {
  return useContext(ToastContext) ?? NOOP;
}
