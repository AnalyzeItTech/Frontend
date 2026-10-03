'use client';

import React, { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Skeleton } from '../ui/Skeleton';
import { fetchObjectSchemas, type ObjectSchema } from '../../lib/customObjectsApi';
import {
  WIDGET_CATALOG,
  formDefaults,
  newWidgetId,
  objectTableWidget,
  validateWidgetForm,
  type CatalogEntry,
  type WidgetLike,
} from '../../lib/dashboardTools.mjs';

/**
 * Manual "Add widget": a widget whose content you type (metric, progress, note, alert), or a live
 * table built from one of the project's custom objects. Charts need real data, so they are never faked.
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
  const [entry, setEntry] = useState<CatalogEntry | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const reset = () => {
    setEntry(null);
    setValues({});
    setErrors({});
  };

  const close = () => {
    reset();
    onClose();
  };

  const add = (spec: WidgetLike) => {
    onAdd(spec);
    close();
  };

  const choose = (e: CatalogEntry) => {
    setEntry(e);
    setValues(formDefaults(e));
    setErrors({});
  };

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!entry) return;
    const found = validateWidgetForm(entry, values);
    setErrors(found);
    if (Object.keys(found).length === 0) add(entry.build(newWidgetId(), values));
  };

  const tabClass = (active: boolean) =>
    `px-3 py-1.5 text-sm rounded-lg cursor-pointer ${active ? 'bg-[var(--coral)]/10 text-[var(--coral)] font-medium' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`;

  return (
    <Modal open={open} onClose={close} title={entry ? `New ${entry.label.toLowerCase()}` : 'Add a widget'} description={entry ? undefined : 'Type in a value, or build a live table from your own data.'} size="lg">
      {disabledReason && (
        <p role="alert" className="mb-3 text-xs rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 px-3 py-2">
          {disabledReason}
        </p>
      )}
      {entry ? (
        <form onSubmit={submit} noValidate className="flex flex-col gap-3">
          {entry.fields.map((f) => {
            const id = `aw-${entry.type}-${f.key}`;
            const common = {
              id,
              value: values[f.key] ?? '',
              'aria-invalid': Boolean(errors[f.key]),
              'aria-describedby': errors[f.key] ? `${id}-err` : undefined,
              className: 'w-full px-3 py-2 text-sm rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--coral)]',
            };
            const set = (v: string) => setValues((cur) => ({ ...cur, [f.key]: v }));
            return (
              <div key={f.key}>
                <label htmlFor={id} className="block text-xs font-semibold text-[var(--text-primary)] mb-1">{f.label}</label>
                {f.kind === 'textarea' ? (
                  <textarea {...common} rows={3} placeholder={f.placeholder} onChange={(e) => set(e.target.value)} />
                ) : f.kind === 'select' ? (
                  <select {...common} onChange={(e) => set(e.target.value)}>
                    {(f.options || []).map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                ) : (
                  <input {...common} type="text" inputMode={f.kind === 'number' ? 'decimal' : undefined} placeholder={f.placeholder} data-autofocus={f.key === entry.fields[0].key ? true : undefined} onChange={(e) => set(e.target.value)} />
                )}
                {errors[f.key] && <p id={`${id}-err`} role="alert" className="mt-1 text-xs text-red-500">{errors[f.key]}</p>}
              </div>
            );
          })}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={reset} className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-2)] cursor-pointer">Back</button>
            <button type="submit" disabled={Boolean(disabledReason)} className="px-3 py-1.5 text-sm rounded-lg bg-[var(--coral)] hover:bg-[var(--coral-dark)] text-white font-medium disabled:opacity-50 cursor-pointer">Add widget</button>
          </div>
        </form>
      ) : (<>
      <div role="tablist" aria-label="Widget source" className="flex gap-1 mb-4">
        <button role="tab" type="button" aria-selected={tab === 'types'} onClick={() => setTab('types')} className={tabClass(tab === 'types')}>Enter a value</button>
        <button role="tab" type="button" aria-selected={tab === 'data'} onClick={() => setTab('data')} className={tabClass(tab === 'data')} disabled={!projectId}>From your data</button>
      </div>

      {tab === 'types' ? (
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {WIDGET_CATALOG.map((entry) => (
            <li key={entry.type}>
              <button
                type="button"
                disabled={Boolean(disabledReason)}
                onClick={() => choose(entry)}
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
      </>)}
    </Modal>
  );
}
