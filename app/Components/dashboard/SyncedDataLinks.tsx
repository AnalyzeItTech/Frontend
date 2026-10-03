'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchObjectSchemas, type ObjectSchema } from '../../lib/customObjectsApi';

/** Connected data lives in objects, so it gets the same create/edit/delete/import/export tools: one click away. */
export function SyncedDataLinks({ projectId }: { projectId: string }) {
  const [synced, setSynced] = useState<ObjectSchema[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchObjectSchemas(projectId)
      .then((all) => !cancelled && setSynced(all.filter((s) => String(s.source || '').startsWith('connector:'))))
      .catch(() => !cancelled && setSynced([]));
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (!synced || synced.length === 0) return null;
  return (
    <section aria-labelledby="synced-data-title" className="rounded-2xl border border-[var(--border)] p-4">
      <h3 id="synced-data-title" className="font-semibold text-[var(--text-primary)] text-base">Synced data</h3>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        Browse, edit, import and export records that came from your connectors. Edits are kept locally and protected from the next sync.
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {synced.map((s) => (
          <li key={s.id}>
            <Link
              href={`/objects?project=${encodeURIComponent(projectId)}&object=${encodeURIComponent(s.api_name)}`}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-primary)] hover:border-[var(--coral)] hover:bg-[var(--coral)]/5"
            >
              {s.label_plural || s.label}
              <span className="text-[var(--text-muted)]">· {String(s.source).slice(10)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
