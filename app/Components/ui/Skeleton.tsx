import React from 'react';

/** Pulsing placeholder block; honours prefers-reduced-motion via Tailwind's motion-safe. */
export function Skeleton({ className = '', ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={`rounded-md bg-[var(--surface-2)] motion-safe:animate-pulse ${className}`} {...rest} />;
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-2 py-2">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-8 flex-1" />
          ))}
        </div>
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div role="status" aria-label="Loading" className={`rounded-2xl border border-[var(--border)] p-4 flex flex-col gap-3 ${className}`}>
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-24 w-full" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
