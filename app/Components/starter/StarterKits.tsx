'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { IconLoader2, IconSparkles } from '@tabler/icons-react';
import { useToast } from '../ui/Toast';
import { useConfirm } from '../ui/ConfirmDialog';
import { getProjectLayout, refreshWidgetData, updateProjectLayout, type WidgetSpec } from '../../lib/chatApi';
import {
  applyStarterKit,
  listStarterKits,
  removeSampleData,
  sampleDataCount,
  type StarterKit,
} from '../../lib/starterKitsApi';
import { askHref, kitSummary, kitWidgets, mergeKitWidgets } from '../../lib/starterKits.mjs';

/** Add a live table per new object to the project's dashboard. Best effort: the data is created either way. */
async function addTablesToDashboard(projectId: string, created: Array<{ api_name: string; label: string }>) {
  const layout = await getProjectLayout(projectId);
  const existing = (layout.layout_json?.widgets ?? []) as unknown as Array<Record<string, unknown>>;
  const added = kitWidgets(projectId, created);
  const { widgets } = mergeKitWidgets(existing, added);
  await updateProjectLayout(projectId, layout.version, { widgets: widgets as unknown as WidgetSpec[] });
  // A new table has no rows until it is refreshed; do it now so the dashboard is populated at first sight.
  const ids = new Set(widgets.map((w) => w.id));
  await Promise.allSettled(added.filter((w) => ids.has(w.id)).map((w) => refreshWidgetData(projectId, String(w.id))));
}

/** Pick a ready-made set of objects with sample data, so a new project starts populated instead of empty. */
export function StarterKits({ projectId, onApplied }: { projectId: string; onApplied?: () => void }) {
  const toast = useToast();
  const [kits, setKits] = useState<StarterKit[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, StarterKit>>({});

  useEffect(() => {
    let cancelled = false;
    listStarterKits()
      .then((k) => !cancelled && setKits(k))
      .catch(() => !cancelled && setLoadError(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const apply = useCallback(
    async (kit: StarterKit) => {
      setBusy(kit.id);
      try {
        const res = await applyStarterKit(projectId, kit.id);
        let boardNote = '';
        if (res.created.length) {
          try {
            await addTablesToDashboard(projectId, res.created);
          } catch {
            boardNote = ' (it could not be added to your dashboard; add it from the widget picker)';
          }
        }
        setDone((d) => ({ ...d, [kit.id]: kit }));
        const rows = res.created.reduce((n, c) => n + c.rows, 0);
        toast.success(
          res.created.length
            ? `Added ${res.created.length} object(s) and ${rows} sample records${boardNote}.`
            : 'You already have these objects, so nothing was added.',
        );
        onApplied?.();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not apply this kit');
      } finally {
        setBusy(null);
      }
    },
    [projectId, toast, onApplied],
  );

  if (loadError || (kits && kits.length === 0)) return null;
  return (
    <section aria-label="Starter kits" className="space-y-3">
      <div className="flex items-center gap-2">
        <IconSparkles size={16} className="text-[var(--coral)]" aria-hidden />
        <h2 className="text-sm font-medium text-[var(--text-primary)]">Start from a kit</h2>
      </div>
      <p className="text-xs text-[var(--text-muted)]">
        Objects with realistic sample records, ready to ask questions about. You can remove the sample data at any time.
      </p>
      {!kits ? (
        <p className="text-xs text-[var(--text-muted)]">Loading kits…</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          {kits.map((kit) => (
            <article key={kit.id} className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <h3 className="text-sm font-medium text-[var(--text-primary)]">{kit.name}</h3>
              <p className="mt-1 flex-1 text-xs leading-relaxed text-[var(--text-secondary)]">{kit.description}</p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{kitSummary(kit)}</p>
              {done[kit.id] ? (
                <div className="mt-3 space-y-1.5">
                  <p className="text-[11px] font-medium text-[var(--text-primary)]">Try asking:</p>
                  {kit.try_asking.map((q) => (
                    <Link
                      key={q}
                      href={askHref(projectId, q)}
                      className="block rounded-lg bg-[var(--surface-2)] px-2.5 py-1.5 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      {q}
                    </Link>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void apply(kit)}
                  className="btn-secondary mt-3 flex min-h-9 items-center justify-center gap-2 text-xs disabled:opacity-60"
                >
                  {busy === kit.id ? <IconLoader2 size={14} className="animate-spin" aria-hidden /> : null}
                  Use this kit
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

/** Shown while the project still has sample records; removes exactly those and nothing the user created. */
export function SampleDataBanner({ projectId, refreshKey, onRemoved }: { projectId: string; refreshKey?: number; onRemoved?: () => void }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    sampleDataCount(projectId)
      .then((n) => !cancelled && setCount(n))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [projectId, refreshKey]);

  if (count <= 0) return null;
  const remove = async () => {
    const ok = await confirm({
      title: 'Remove sample data?',
      message: `This removes the ${count} sample records. Records you added yourself are not touched. They go to the trash for 30 days.`,
      confirmLabel: 'Remove sample data',
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const removed = await removeSampleData(projectId);
      setCount(0);
      toast.success(`Removed ${removed} sample records.`);
      onRemoved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove sample data');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--text-secondary)]">
      <span>This project has {count} sample records from a starter kit.</span>
      <button type="button" disabled={busy} onClick={() => void remove()} className="btn-secondary min-h-8 px-3 text-xs disabled:opacity-60">
        Remove sample data
      </button>
    </div>
  );
}
