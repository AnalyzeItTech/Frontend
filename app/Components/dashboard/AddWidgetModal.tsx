'use client';

import React, { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Skeleton } from '../ui/Skeleton';
import { fetchObjectSchemas, type ObjectSchema } from '../../lib/customObjectsApi';
import { WIDGET_CATALOG, newWidgetId, objectTableWidget, type WidgetLike } from '../../lib/dashboardTools.mjs';

/**
 * Manual "Add widget": pick a primitive (starts with clearly labelled sample data) or build a live
 * table from one of the project's custom objects.
 */
export function AddWidgetModal({
  open,
  onClose,
  projectId,
  onAdd,
  disabledReason,
}: {
  open: boolean;
  onClose: () => void;
  projectId?: string;
  onAdd: (spec: WidgetLike) => void;
  /** e.g. the tier cap message; disables adding and explains why. */
  disabledReason?: string;
}) {
  const [tab, setTab] = useState<'types' | 'data'>('types');
  const [schemas, setSchemas] = useState<ObjectSchema[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || tab !== 'data' || !projectId || schemas) return;
    let cancelled = false;
    fetchObjectSchemas(projectId)
      .then((s) => !cancelled && setSchemas(s))
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : 'Could not load your objects'));
    return () => {
      cancelled = true;
    };
  }, [open, tab, projectId, schemas]);

  const add = (spec: WidgetLike) => {
    onAdd(spec);
    onClose();
  };

  const tabClass = (active: boolean) =>
    `px-3 py-1.5 text-sm rounded-lg cursor-pointer ${active ? 'bg-[var(--coral)]/10 text-[var(--coral)] font-medium' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`;

  return (
    <Modal open={open} onClose={onClose} title="Add a widget" description="Pick a widget type, or build a live table from your own data." size="lg">
      {disabledReason && (
        <p role="alert" className="mb-3 text-xs rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 px-3 py-2">
          {disabledReason}
        </p>
      )}
      <div role="tablist" aria-label="Widget source" className="flex gap-1 mb-4">
        <button role="tab" type="button" aria-selected={tab === 'types'} onClick={() => setTab('types')} className={tabClass(tab === 'types')}>Widget types</button>
        <button role="tab" type="button" aria-selected={tab === 'data'} onClick={() => setTab('data')} className={tabClass(tab === 'data')} disabled={!projectId}>From your data</button>
      </div>

      {tab === 'types' ? (
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {WIDGET_CATALOG.map((entry) => (
            <li key={entry.type}>
              <button
                type="button"
                disabled={Boolean(disabledReason)}
                onClick={() => add(entry.build(newWidgetId()))}
                className="w-full h-full text-left rounded-xl border border-[var(--border)] p-3 hover:border-[var(--coral)] hover:bg-[var(--coral)]/5 disabled:opacity-50 disabled:hover:border-[var(--border)] disabled:hover:bg-transparent cursor-pointer"
              >
                <span className="block text-sm font-medium text-[var(--text-primary)]">{entry.label}</span>
                <span className="block text-xs text-[var(--text-muted)] mt-0.5">{entry.description}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : error ? (
        <p role="alert" className="text-sm text-red-500">{error}</p>
      ) : schemas === null ? (
        <div className="flex flex-col gap-2" role="status" aria-label="Loading objects">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : schemas.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">You have no custom objects yet. Create one in the Objects view, then come back to chart its records.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {schemas.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                disabled={Boolean(disabledReason) || !projectId}
                onClick={() => projectId && add(objectTableWidget(newWidgetId(), projectId, s.api_name, s.label))}
                className="w-full text-left rounded-xl border border-[var(--border)] p-3 hover:border-[var(--coral)] hover:bg-[var(--coral)]/5 disabled:opacity-50 cursor-pointer"
              >
                <span className="block text-sm font-medium text-[var(--text-primary)]">{s.label} · live table</span>
                <span className="block text-xs text-[var(--text-muted)] mt-0.5">{s.fields?.length ?? 0} fields · refreshes from your records</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
