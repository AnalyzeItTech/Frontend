'use client';

import Link from 'next/link';

type Status = 'loading' | 'empty' | 'error' | 'content';

export function WorkspaceStatus({
  status,
  loadingLabel = 'Loading workspace…',
  emptyTitle,
  emptyBody,
  emptyPrimary,
  errorTitle = 'Couldn’t load this page',
  errorBody,
  onRetry,
  children,
}: {
  status: Status;
  loadingLabel?: string;
  emptyTitle?: string;
  emptyBody?: string;
  emptyPrimary?: { href?: string; onClick?: () => void; label: string };
  errorTitle?: string;
  errorBody?: string;
  onRetry?: () => void;
  children?: React.ReactNode;
}) {
  if (status === 'content') return <>{children}</>;

  if (status === 'loading') {
    return (
      <div role="status" aria-live="polite" className="app-card mt-6 p-8 space-y-4">
        <div className="h-4 w-40 rounded-full bg-[var(--surface-3)] animate-pulse" />
        <div className="h-24 rounded-2xl bg-[var(--surface-3)] animate-pulse" />
        <p className="text-sm text-[var(--text-secondary)]">{loadingLabel}</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div role="alert" className="app-card mt-6 p-8 space-y-4 max-w-lg">
        <h2 className="font-serif text-2xl text-[var(--text-primary)]">{errorTitle}</h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          {errorBody || 'Please try again. If this keeps happening, sign in again or contact support.'}
        </p>
        {onRetry ? (
          <button type="button" onClick={onRetry} className="btn-primary min-h-11 px-5">
            Retry
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="app-card mt-6 p-8 space-y-4 max-w-lg border-dashed">
      <h2 className="font-serif text-2xl text-[var(--text-primary)]">{emptyTitle}</h2>
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{emptyBody}</p>
      {emptyPrimary?.href ? (
        <Link href={emptyPrimary.href} className="btn-primary min-h-11 px-5 inline-flex">
          {emptyPrimary.label}
        </Link>
      ) : emptyPrimary?.onClick ? (
        <button type="button" onClick={emptyPrimary.onClick} className="btn-primary min-h-11 px-5">
          {emptyPrimary.label}
        </button>
      ) : null}
    </div>
  );
}
