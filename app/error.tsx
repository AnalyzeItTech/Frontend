'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalRouteError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      role="alert"
      className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-start justify-center gap-4 px-6 py-16"
    >
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="opacity-80">
        This page hit an unexpected error. Your work is saved — try again, or head back to the workspace.
      </p>
      {error.digest ? <p className="font-mono text-xs opacity-60">Reference: {error.digest}</p> : null}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="rounded-md bg-[#E3836C] px-4 py-2 text-white hover:opacity-90"
        >
          Try again
        </button>
        <Link href="/research" className="rounded-md border border-current/30 px-4 py-2 hover:opacity-80">
          Back to research
        </Link>
      </div>
    </main>
  );
}
