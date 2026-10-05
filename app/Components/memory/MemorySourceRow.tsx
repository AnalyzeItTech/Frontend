'use client';

import { useState } from 'react';
import { describeSource, searchLine, usageLine } from '../../lib/memorySourceRow.mjs';
import { deleteMemorySource, pinMemorySource, previewMemorySource, renameMemorySource, type MemorySource } from '../../lib/memoryApi';

/** One stored source: its name (editable), what was stored, how it is used, and what you can do with it. */
export function MemorySourceRow({ row, onChanged, onError }: { row: MemorySource; onChanged: () => void; onError: (message: string) => void }) {
  const d = describeSource(row);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(row.title ?? '');
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<{ text: string; more: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      onChanged();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && !preview) {
      try {
        const p = await previewMemorySource(row.id);
        setPreview({ text: p.preview, more: p.truncated });
      } catch (e) {
        onError(e instanceof Error ? e.message : 'Could not load the stored text');
        setOpen(false);
      }
    }
  };

  const save = () =>
    act(async () => {
      await renameMemorySource(row.id, name);
      setEditing(false);
    });

  const search = searchLine(row.search_level, row.state);
  return (
    <li className="space-y-2 p-4 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {editing ? (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
            >
              <input
                autoFocus
                value={name}
                maxLength={120}
                onChange={(e) => setName(e.target.value)}
                aria-label="Source name"
                placeholder="Name this source"
                className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1"
              />
              <button type="submit" disabled={busy} className="btn-secondary text-xs">Save</button>
              <button type="button" className="btn-ghost text-xs" onClick={() => { setEditing(false); setName(row.title ?? ''); }}>Cancel</button>
            </form>
          ) : (
            <p className="truncate text-[var(--text-primary)]" title={d.heading}>{d.heading}</p>
          )}
          <p className="text-xs text-[var(--text-muted)]">{d.detail}</p>
          <p className="text-xs text-[var(--text-muted)]">{usageLine(row)}</p>
          {search ? <p className="text-xs text-[var(--text-muted)]">{search}</p> : null}
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          <button type="button" className="btn-ghost text-xs" onClick={() => void toggle()} aria-expanded={open}>{open ? 'Hide' : 'What was stored'}</button>
          {!editing ? <button type="button" className="btn-ghost text-xs" onClick={() => setEditing(true)}>Rename</button> : null}
          <button type="button" disabled={busy} className="btn-ghost text-xs" onClick={() => void act(() => pinMemorySource(row.id, !row.pinned))}>{row.pinned ? 'Unpin' : 'Pin'}</button>
          <button
            type="button"
            disabled={busy}
            className="btn-ghost text-xs text-[#9B4D3B]"
            onClick={() => {
              if (window.confirm(`Delete "${d.heading}"? It is removed from your memory and from any chat answer that cited it. Its tokens are refunded.`)) {
                void act(() => deleteMemorySource(row.id));
              }
            }}
          >
            Delete
          </button>
        </div>
      </div>
      {open ? (
        <div className="rounded-xl bg-[var(--surface-2)] p-3 text-xs leading-relaxed text-[var(--text-primary)]">
          {preview ? (
            <>
              <p className="whitespace-pre-wrap">{preview.text}{preview.more ? '…' : ''}</p>
              <p className="mt-2 text-[var(--text-muted)]">The start of the original text. The assistant reads the rest when a question needs it.</p>
            </>
          ) : (
            <p className="text-[var(--text-muted)]">Loading…</p>
          )}
        </div>
      ) : null}
    </li>
  );
}
