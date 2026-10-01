'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'motion/react';
import {
  IconArrowLeft,
  IconArrowRight,
  IconArrowUp,
  IconBraces,
  IconCheck,
  IconDatabase,
  IconFileText,
  IconLayoutDashboard,
  IconPlugConnected,
  IconSparkles,
} from '@tabler/icons-react';
import { AppShell } from '../../Components/app/AppShell';
import { WorkspaceStatus } from '../../Components/app/WorkspaceStatus';
import { redactClientError } from '../../lib/apiErrors';
import { listProjectAttachments } from '../../lib/attachmentsApi';
import { getProjectById, getProjectLayout } from '../../lib/chatApi';
import { fetchObjectSchemas, fetchProjectConnectors } from '../../lib/customObjectsApi';
import { fetchDatasets } from '../../lib/datasetsApi';
import {
  buildProjectOverview,
  formatCount,
  formatProjectTimestamp,
  greetingFor,
  listArtifacts,
  relativeTime,
  researchWithPrompt,
  resolveWidgetCount,
  routeProjectId,
  setupProgress,
  starterPrompts,
  visibleArtifacts,
  type ArtifactRow,
  type ProjectHomeOverview,
} from '../../lib/projectHome.mjs';

const LOAD_TIMEOUT_MS = 12000;

type LoadStatus = 'loading' | 'empty' | 'error' | 'content';

type ArtifactState = ReturnType<typeof listArtifacts>;

function countFrom(result: PromiseSettledResult<unknown>): number | null {
  if (result.status !== 'fulfilled' || !Array.isArray(result.value)) return null;
  return result.value.length;
}

export default function ProjectHomePage() {
  const params = useParams<{ id?: string | string[] }>();
  const projectId = routeProjectId(params?.id);
  const [status, setStatus] = useState<LoadStatus>(projectId ? 'loading' : 'error');
  const [errorBody, setErrorBody] = useState<string | undefined>(
    projectId ? undefined : 'This address does not include a project id.',
  );
  const [overview, setOverview] = useState<ProjectHomeOverview | null>(null);
  const [artifacts, setArtifacts] = useState<ArtifactState | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [trackedId, setTrackedId] = useState(projectId);

  if (trackedId !== projectId) {
    setTrackedId(projectId);
    setStatus(projectId ? 'loading' : 'error');
    setErrorBody(projectId ? undefined : 'This address does not include a project id.');
    setOverview(null);
    setArtifacts(null);
  }

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      setStatus('error');
      setErrorBody('This is taking longer than expected. Check your connection and try again.');
    }, LOAD_TIMEOUT_MS);

    void (async () => {
      try {
        const project = await getProjectById(projectId);
        if (cancelled) return;
        const [layoutRes, objectRes, datasetRes, attachmentRes, connectorRes] = await Promise.allSettled([
          getProjectLayout(projectId),
          fetchObjectSchemas(projectId),
          fetchDatasets(projectId, { strict: true }),
          listProjectAttachments(projectId),
          fetchProjectConnectors(projectId, { strict: true }),
        ]);
        if (cancelled) return;

        const nextOverview = buildProjectOverview({
          project,
          counts: {
            widgets: resolveWidgetCount(
              layoutRes.status === 'fulfilled' ? layoutRes.value : null,
              project.widget_count,
            ),
            objects: countFrom(objectRes),
            datasets: countFrom(datasetRes),
            attachments: countFrom(attachmentRes),
            connectors: countFrom(connectorRes),
          },
        });
        setOverview(nextOverview);
        setArtifacts(
          listArtifacts({
            datasets: datasetRes.status === 'fulfilled' ? datasetRes.value : null,
            attachments: attachmentRes.status === 'fulfilled' ? attachmentRes.value : null,
          }),
        );
        setStatus('content');
      } catch (err) {
        if (cancelled) return;
        setOverview(null);
        setArtifacts(null);
        setStatus('error');
        setErrorBody(redactClientError(err, 'Couldn’t open this project.'));
      } finally {
        window.clearTimeout(timer);
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [projectId, reloadKey]);

  return (
    <AppShell active="project">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <Link
          href="/profile#projects"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <IconArrowLeft size={15} />
          All projects
        </Link>

        <WorkspaceStatus
          status={status === 'content' ? 'content' : status}
          loadingLabel="Loading this project…"
          errorTitle="Couldn’t open this project"
          errorBody={errorBody}
          onRetry={() => {
            if (!projectId) {
              setStatus('error');
              setErrorBody('This address does not include a project id.');
              return;
            }
            setStatus('loading');
            setErrorBody(undefined);
            setReloadKey((key) => key + 1);
          }}
        >
          {overview && artifacts ? (
            <ProjectHomeBody overview={overview} artifacts={artifacts} />
          ) : null}
        </WorkspaceStatus>
      </div>
    </AppShell>
  );
}

function ProjectHomeBody({
  overview,
  artifacts,
}: {
  overview: ProjectHomeOverview;
  artifacts: ArtifactState;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const links = overview.links;
  const [question, setQuestion] = useState('');
  const [greeting] = useState(() => greetingFor());
  const inputRef = useRef<HTMLInputElement>(null);

  // "/" jumps to the ask box, like every tool people live in.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
      if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const touched = overview.updatedAt || overview.createdAt;
  const since = relativeTime(touched);
  const stamp = formatProjectTimestamp(touched);
  const shown = visibleArtifacts(artifacts.rows, 6);
  const progress = useMemo(() => setupProgress(overview.counts), [overview.counts]);
  const prompts = useMemo(
    () => starterPrompts(artifacts.rows, overview.counts),
    [artifacts.rows, overview.counts],
  );

  function focusAsk() {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
  }

  const ask = (text: string) => {
    if (!overview.id) return;
    router.push(researchWithPrompt(overview.id, text));
  };

  const rise = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] as const },
        };

  const tiles = links
    ? [
        {
          key: 'widgets' as const,
          icon: IconLayoutDashboard,
          title: 'Dashboard',
          unit: 'widgets',
          href: links.dashboard,
          hint: 'Pin answers as live charts',
        },
        {
          key: 'objects' as const,
          icon: IconBraces,
          title: 'Objects',
          unit: 'objects',
          href: links.objects,
          hint: 'Model the things you track',
        },
        {
          key: 'connectors' as const,
          icon: IconPlugConnected,
          title: 'Connectors',
          unit: 'sources',
          href: links.connectors,
          hint: 'Pull in data automatically',
        },
        {
          key: 'datasets' as const,
          icon: IconDatabase,
          title: 'Datasets',
          unit: 'datasets',
          href: links.research,
          hint: 'Upload a file and ask about it',
        },
      ]
    : [];

  return (
    <div className="space-y-8 pb-12">
      <motion.section
        {...rise(0)}
        className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-10"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-60 blur-3xl"
          style={{ background: 'radial-gradient(circle, var(--brand-soft), transparent 70%)' }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-16 h-64 w-64 rounded-full opacity-40 blur-3xl"
          style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--info) 30%, transparent), transparent 70%)' }}
        />

        <div className="relative space-y-6">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1 font-medium">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  overview.status.id === 'started' ? 'bg-[var(--success)]' : 'bg-[var(--text-muted)]'
                }`}
              />
              {overview.status.label}
            </span>
            {since ? (
              <span title={stamp ?? undefined}>
                {overview.updatedAt ? 'Last touched' : 'Created'} {since}
              </span>
            ) : null}
            {overview.layoutVersion != null ? (
              <span className="font-mono text-[11px] text-[var(--text-muted)]">
                Layout v{overview.layoutVersion}
              </span>
            ) : null}
          </div>

          <div className="space-y-2">
            <p className="text-sm text-[var(--text-secondary)]">
              {overview.workspaceEmpty ? `${greeting}. Let’s get your first answer.` : greeting}
            </p>
            <h1 className="font-serif text-4xl leading-[1.1] tracking-tight text-[var(--text-primary)] sm:text-5xl">
              {overview.title}
            </h1>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(question);
            }}
            className="group flex items-center gap-2 rounded-2xl border border-[var(--border-strong)] bg-[var(--bg)] p-2 pl-4 shadow-sm transition focus-within:border-[var(--coral)] focus-within:shadow-[0_0_0_4px_var(--brand-soft)]"
          >
            <IconSparkles size={18} className="shrink-0 text-[var(--coral)]" aria-hidden />
            <label htmlFor="project-ask" className="sr-only">
              Ask a question about this project
            </label>
            <input
              id="project-ask"
              ref={inputRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask anything…"
              className="min-w-0 flex-1 bg-transparent py-2 text-base text-[var(--text-primary)] outline-none focus-visible:!outline-none placeholder:text-[var(--text-muted)]"
              autoComplete="off"
            />
            <kbd className="hidden rounded-md border border-[var(--border)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--text-muted)] sm:block" aria-hidden>
              /
            </kbd>
            <button
              type="submit"
              aria-label="Ask in Research"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--coral)] text-white transition hover:bg-[var(--coral-dark)] active:scale-95"
            >
              <IconArrowUp size={18} />
            </button>
          </form>

          <ul className="flex flex-wrap gap-2" aria-label="Suggested questions">
            {prompts.map((prompt) => (
              <li key={prompt}>
                <button
                  type="button"
                  onClick={() => ask(prompt)}
                  className="max-w-full rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-1.5 text-left text-[13px] text-[var(--text-secondary)] transition hover:-translate-y-0.5 hover:border-[var(--coral)] hover:text-[var(--text-primary)]"
                >
                  {prompt}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </motion.section>

      {overview.countsIncomplete ? (
        <p className="text-sm text-[var(--text-secondary)]">
          Some counts could not be loaded. Those show as —.
        </p>
      ) : null}

      {overview.workspaceEmpty && links ? (
        <motion.section {...rise(0.08)} aria-label="Ways to start" className="grid gap-3 md:grid-cols-3">
          {[
            {
              n: '1',
              title: 'Ask something live',
              body: 'Weather, currency and stock questions answer in seconds, and they don’t use your monthly runs.',
              cta: 'Try one above',
              focus: true,
            },
            {
              n: '2',
              title: 'Bring your own data',
              body: 'Drop a CSV or document into Research. We read it, then you can question it in plain words.',
              cta: 'Upload a file',
              href: links.research,
            },
            {
              n: '3',
              title: 'Connect a source',
              body: 'Link a tool you already use so answers stay current without re-uploading.',
              cta: 'Browse connectors',
              href: links.connectors,
            },
          ].map((card) => {
            const inner = (
              <>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand-soft)] font-mono text-sm text-[var(--coral)]">
                  {card.n}
                </span>
                <div className="space-y-1.5">
                  <p className="font-serif text-xl text-[var(--text-primary)]">{card.title}</p>
                  <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{card.body}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-[var(--coral)]">
                  {card.cta}
                  <IconArrowRight size={14} className="transition group-hover:translate-x-1" />
                </span>
              </>
            );
            const cls =
              'app-card group flex flex-col gap-4 p-5 text-left transition hover:-translate-y-1 hover:border-[var(--coral)] hover:shadow-lg';
            return card.href ? (
              <Link key={card.n} href={card.href} className={cls}>
                {inner}
              </Link>
            ) : (
              <button key={card.n} type="button" onClick={() => focusAsk()} className={cls}>
                {inner}
              </button>
            );
          })}
        </motion.section>
      ) : (
      <motion.section {...rise(0.08)} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => {
          const value = overview.counts[tile.key];
          const Icon = tile.icon;
          return (
            <Link
              key={tile.key}
              href={tile.href}
              className="app-card group flex flex-col justify-between gap-6 p-5 transition hover:-translate-y-1 hover:border-[var(--coral)] hover:shadow-lg"
            >
              <div className="flex items-start justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--coral)]">
                  <Icon size={20} />
                </span>
                <IconArrowRight
                  size={16}
                  className="text-[var(--text-muted)] transition group-hover:translate-x-1 group-hover:text-[var(--coral)]"
                />
              </div>
              <div>
                <p className="font-serif text-4xl text-[var(--text-primary)]">{formatCount(value)}</p>
                <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">{tile.title}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {value === 0 ? tile.hint : value == null ? 'Could not load' : `${tile.unit} on this project`}
                </p>
              </div>
            </Link>
          );
        })}
      </motion.section>
      )}

      <motion.div {...rise(0.16)} className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="app-card space-y-4 p-6">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <h2 className="font-serif text-2xl text-[var(--text-primary)]">Your files</h2>
              <p className="text-xs text-[var(--text-muted)]">Datasets and attachments on this project</p>
            </div>
            {links ? (
              <Link href={links.research} className="text-sm font-medium text-[var(--coral)] hover:underline">
                Add more
              </Link>
            ) : null}
          </div>

          {artifacts.empty ? (
            <div className="rounded-2xl border border-dashed border-[var(--border-strong)] px-5 py-8 text-center">
              <IconFileText size={28} className="mx-auto text-[var(--text-muted)]" aria-hidden />
              <p className="mt-3 text-sm text-[var(--text-secondary)]">
                Drop a spreadsheet or document into Research and it lands here, ready to question.
              </p>
              {links ? (
                <Link href={links.research} className="btn-primary mt-4 inline-flex px-5 text-sm">
                  Start in Research
                </Link>
              ) : null}
            </div>
          ) : null}

          {artifacts.datasetsUnavailable ? (
            <p className="text-sm text-[var(--text-secondary)]">Datasets could not be loaded for this project.</p>
          ) : null}
          {artifacts.attachmentsUnavailable ? (
            <p className="text-sm text-[var(--text-secondary)]">
              Attachments could not be loaded for this project.
            </p>
          ) : null}

          {shown.visible.length > 0 ? (
            <ul className="space-y-2">
              {shown.visible.map((row) => (
                <ArtifactItem key={`${row.kind}-${row.id}`} row={row} onAsk={ask} />
              ))}
            </ul>
          ) : null}
          {shown.hidden > 0 ? (
            <p className="text-xs text-[var(--text-muted)]">
              {shown.hidden} more on this project. Open Objects or Research to work with them.
            </p>
          ) : null}
        </section>

        <section className="app-card space-y-5 p-6">
          <div className="flex items-center gap-4">
            <ProgressRing percent={progress.percent} />
            <div>
              <h2 className="font-serif text-2xl text-[var(--text-primary)]">
                {progress.done === progress.total ? 'Fully set up' : progress.done === 0 ? 'Start here' : 'Build it out'}
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                {progress.done} of {progress.total} steps done
              </p>
            </div>
          </div>
          <ul className="space-y-2.5">
            {progress.steps.map((step) => (
              <li key={step.id} className="flex items-center gap-3 text-sm">
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    step.done
                      ? 'border-[var(--success)] bg-[var(--success)] text-white'
                      : 'border-[var(--border-strong)] text-transparent'
                  }`}
                  aria-hidden
                >
                  <IconCheck size={12} stroke={3} />
                </span>
                <span
                  className={step.done ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)]'}
                >
                  {step.label}
                </span>
                <span className="sr-only">{step.done ? 'done' : 'not done yet'}</span>
              </li>
            ))}
          </ul>
          <p
            className="border-t border-[var(--border)] pt-4 text-xs leading-relaxed text-[var(--text-muted)]"
            title={overview.runs.gap}
          >
            Run history for this project is on the way.
          </p>
        </section>
      </motion.div>

      <div className="space-y-1 text-xs text-[var(--text-muted)]">
        {overview.slug?.host ? (
          <p>
            Personal link <span className="font-mono text-[var(--text-secondary)]">{overview.slug.host}</span> opens
            this project’s dashboard.
          </p>
        ) : overview.slug ? (
          <p>
            Saved link name <span className="font-mono text-[var(--text-secondary)]">{overview.slug.slug}</span>. Claim
            a valid personal host from the dashboard when you want a subdomain.
          </p>
        ) : (
          <p>No personal subdomain on this project yet. You can claim one from the dashboard.</p>
        )}
        <p className="truncate font-mono">{overview.id}</p>
      </div>
    </div>
  );
}

function ProgressRing({ percent }: { percent: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-16 w-16 shrink-0" role="img" aria-label={`${percent} percent set up`}>
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--border)" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="var(--coral)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - percent / 100)}
          style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-mono text-xs text-[var(--text-primary)]">
        {percent}%
      </span>
    </div>
  );
}

function ArtifactItem({ row, onAsk }: { row: ArtifactRow; onAsk: (text: string) => void }) {
  const isDataset = row.kind === 'dataset';
  return (
    <li className="group flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-3 transition hover:border-[var(--border-strong)]">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-3)] text-[var(--text-secondary)]">
          {isDataset ? <IconDatabase size={17} /> : <IconFileText size={17} />}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[var(--text-primary)]">{row.title}</p>
          <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
            {isDataset ? 'Dataset' : 'Attachment'}
            {row.meta ? ` · ${row.meta}` : ''}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onAsk(`Tell me what's in ${row.title}`)}
        className="shrink-0 rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--text-secondary)] opacity-100 transition hover:border-[var(--coral)] hover:text-[var(--coral)] sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
      >
        Ask about this
      </button>
    </li>
  );
}
