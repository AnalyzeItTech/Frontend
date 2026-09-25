'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  IconCopy,
  IconEdit,
  IconFolder,
  IconLayoutDashboard,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import {
  createProject,
  deleteProject,
  getProjects,
  updateProject,
  type ProjectSummary,
} from '../../lib/chatApi';
import { duplicateProject } from '../../lib/exportApi';

type ConfirmState =
  | { kind: 'delete'; project: ProjectSummary }
  | { kind: 'rename'; project: ProjectSummary }
  | { kind: 'create' }
  | null;

export function ProjectsManager({
  projectLimit,
  onCountChange,
}: {
  projectLimit?: number | null;
  onCountChange?: (count: number) => void;
}) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [draftName, setDraftName] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getProjects();
      setProjects(list);
      onCountChange?.(list.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load projects');
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = projects.filter((p) =>
    (p.name || '').toLowerCase().includes(query.trim().toLowerCase()),
  );

  const atLimit =
    typeof projectLimit === 'number' && projectLimit > 0 && projects.length >= projectLimit;
  const overLimit =
    typeof projectLimit === 'number' && projectLimit > 0 && projects.length > projectLimit;

  const openCreate = () => {
    if (atLimit) {
      setError(
        overLimit
          ? `You have ${projects.length} projects but your plan allows ${projectLimit}. Delete or archive extras below, or upgrade on Billing — New and Duplicate stay disabled until you are at or under the limit.`
          : `Plan limit reached (${projectLimit} projects). Delete one below or upgrade on Billing to create more.`,
      );
      return;
    }
    setDraftName('');
    setConfirm({ kind: 'create' });
    setNote(null);
    setError(null);
  };

  const openRename = (project: ProjectSummary) => {
    setDraftName(project.name);
    setConfirm({ kind: 'rename', project });
    setNote(null);
    setError(null);
  };

  const runCreate = async () => {
    const name = draftName.trim() || 'Untitled workspace';
    if (atLimit) {
      setError(`Project limit reached (${projectLimit}). Upgrade or delete a workspace.`);
      return;
    }
    setBusyId('create');
    try {
      const created = await createProject(name);
      setProjects((prev) => [created, ...prev]);
      onCountChange?.(projects.length + 1);
      setConfirm(null);
      setNote(`Created “${created.name}”.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create project');
    } finally {
      setBusyId(null);
    }
  };

  const runRename = async (project: ProjectSummary) => {
    const name = draftName.trim();
    if (!name) return;
    setBusyId(project.id);
    try {
      const updated = await updateProject(project.id, name);
      setProjects((prev) => prev.map((p) => (p.id === project.id ? { ...p, ...updated } : p)));
      setConfirm(null);
      setNote(`Renamed to “${updated.name}”.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not rename project');
    } finally {
      setBusyId(null);
    }
  };

  const runDelete = async (project: ProjectSummary) => {
    setBusyId(project.id);
    try {
      await deleteProject(project.id);
      setProjects((prev) => {
        const next = prev.filter((p) => p.id !== project.id);
        onCountChange?.(next.length);
        return next;
      });
      setConfirm(null);
      setNote(`Deleted “${project.name}”.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete project');
    } finally {
      setBusyId(null);
    }
  };

  const runDuplicate = async (project: ProjectSummary) => {
    if (atLimit) {
      setError(`Project limit reached (${projectLimit}). Upgrade or delete a workspace first.`);
      return;
    }
    setBusyId(project.id);
    setError(null);
    try {
      const duplicated = await duplicateProject(project.id);
      await refresh();
      setNote(`Duplicated as a new workspace (${duplicated.project_id.slice(0, 8)}…).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not duplicate project');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section id="projects" className="app-card scroll-mt-24 space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EA8069]/15 text-[#EA8069]">
            <IconFolder size={18} />
          </div>
          <div>
            <h2 className="text-sm font-medium text-[var(--text-primary)]">Projects</h2>
            <p className="text-xs text-[var(--text-muted)]">
              Create, rename, duplicate, or remove analysis workspaces.
              {typeof projectLimit === 'number' ? (
                <>
                  {' '}
                  Using {projects.length} of {projectLimit}.
                </>
              ) : null}
            </p>
            {overLimit ? (
              <p className="mt-1.5 text-xs text-[#9B4D3B]">
                Over your plan limit — New and Duplicate are disabled. Delete projects below until you
                are at {projectLimit}, or{' '}
                <Link href="/billing" className="underline underline-offset-2 hover:text-[var(--coral,#EA8069)]">
                  upgrade
                </Link>
                .
              </p>
            ) : atLimit ? (
              <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                At your plan limit. Delete a project to free a slot, or{' '}
                <Link href="/billing" className="underline underline-offset-2 hover:text-[var(--coral,#EA8069)]">
                  upgrade
                </Link>
                .
              </p>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={openCreate}
          disabled={atLimit}
          className="btn-primary inline-flex items-center gap-1.5 text-xs disabled:opacity-40"
          title={
            overLimit
              ? `Over limit (${projects.length}/${projectLimit}) — delete projects or upgrade`
              : atLimit
                ? 'Project limit reached'
                : 'New workspace'
          }
        >
          <IconPlus size={14} />
          New
        </button>
      </div>

      <div className="relative">
        <IconSearch size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by name…"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-2 pl-9 pr-3 text-sm outline-none focus:border-[var(--coral,#EA8069)]"
        />
      </div>

      {note ? (
        <p className="rounded-lg bg-[#8FA98F]/15 px-3 py-2 text-xs text-[#4A7C59] dark:text-[#9EBB9A]">{note}</p>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-lg bg-[#9B4D3B]/10 px-3 py-2 text-xs text-[#9B4D3B]">
          {error}
        </p>
      ) : null}

      <div className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)]">
        {loading ? (
          <p className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">Loading projects…</p>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-[var(--text-muted)]">
              {query ? 'No projects match this filter.' : 'No projects yet.'}
            </p>
            {!query ? (
              <button type="button" onClick={openCreate} className="mt-3 text-sm text-[var(--coral,#EA8069)] hover:underline">
                Create your first workspace
              </button>
            ) : null}
          </div>
        ) : (
          filtered.map((project) => (
            <div
              key={project.id}
              className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-3 transition-colors hover:bg-[var(--surface-2)]"
            >
              <div className="min-w-0">
                <Link
                  href={`/project/${encodeURIComponent(project.id)}`}
                  className="truncate text-sm font-medium text-[var(--text-primary)] hover:text-[var(--coral,#EA8069)]"
                >
                  {project.name}
                </Link>
                <p className="truncate font-mono text-[10px] text-[var(--text-muted)]">
                  {project.id.slice(0, 18)}…
                  {project.widget_count != null ? ` · ${project.widget_count} widgets` : ''}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Link
                  href={`/project/${encodeURIComponent(project.id)}`}
                  className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--coral,#EA8069)]"
                  title="Open project home"
                >
                  <IconLayoutDashboard size={14} />
                  Open
                </Link>
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]"
                  title="Rename"
                  onClick={() => openRename(project)}
                >
                  <IconEdit size={14} />
                </button>
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--coral,#EA8069)] disabled:opacity-40"
                  title="Duplicate"
                  disabled={busyId === project.id || atLimit}
                  onClick={() => void runDuplicate(project)}
                >
                  {busyId === project.id ? (
                    <IconRefresh size={14} className="animate-spin" />
                  ) : (
                    <IconCopy size={14} />
                  )}
                </button>
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[#9B4D3B]"
                  title="Delete"
                  onClick={() => setConfirm({ kind: 'delete', project })}
                >
                  <IconTrash size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <AnimatePresence>
        {confirm ? (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="app-card w-full max-w-md space-y-4 p-5 shadow-xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-medium">
                    {confirm.kind === 'create'
                      ? 'New workspace'
                      : confirm.kind === 'rename'
                        ? 'Rename workspace'
                        : 'Delete workspace'}
                  </h3>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {confirm.kind === 'delete'
                      ? `This permanently removes “${confirm.project.name}” and its canvas data.`
                      : 'Give this analysis workspace a clear name.'}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-full p-1 text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
                  aria-label="Close"
                  onClick={() => setConfirm(null)}
                >
                  <IconX size={16} />
                </button>
              </div>

              {confirm.kind !== 'delete' ? (
                <input
                  autoFocus
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="Workspace name"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--coral,#EA8069)]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (confirm.kind === 'create') void runCreate();
                      if (confirm.kind === 'rename') void runRename(confirm.project);
                    }
                  }}
                />
              ) : null}

              <div className="flex justify-end gap-2">
                <button type="button" className="btn-secondary text-xs" onClick={() => setConfirm(null)}>
                  Cancel
                </button>
                {confirm.kind === 'create' ? (
                  <button
                    type="button"
                    className="btn-primary text-xs"
                    disabled={busyId === 'create'}
                    onClick={() => void runCreate()}
                  >
                    Create
                  </button>
                ) : null}
                {confirm.kind === 'rename' ? (
                  <button
                    type="button"
                    className="btn-primary text-xs"
                    disabled={busyId === confirm.project.id || !draftName.trim()}
                    onClick={() => void runRename(confirm.project)}
                  >
                    Save
                  </button>
                ) : null}
                {confirm.kind === 'delete' ? (
                  <button
                    type="button"
                    className="rounded-full bg-[#9B4D3B] px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
                    disabled={busyId === confirm.project.id}
                    onClick={() => void runDelete(confirm.project)}
                  >
                    Delete
                  </button>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
