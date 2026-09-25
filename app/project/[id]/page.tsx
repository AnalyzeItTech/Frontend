'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  IconArrowLeft,
  IconBraces,
  IconFile,
  IconLayoutDashboard,
  IconPlugConnected,
  IconSearch,
} from '@tabler/icons-react';
import { AppShell } from '../../Components/app/AppShell';
import { PageTitle } from '../../Components/app/PageTitle';
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
  listArtifacts,
  resolveWidgetCount,
  routeProjectId,
  visibleArtifacts,
  type ArtifactRow,
  type ProjectHomeOverview,
} from '../../lib/projectHome.mjs';

const LOAD_TIMEOUT_MS = 12000;

type LoadStatus = 'loading' | 'empty' | 'error' | 'content';

type ArtifactState = ReturnType<typeof listArtifacts>;

const STATS: Array<{ key: keyof ProjectHomeOverview['counts']; label: string }> = [
  { key: 'widgets', label: 'Widgets' },
  { key: 'objects', label: 'Objects' },
  { key: 'datasets', label: 'Datasets' },
  { key: 'attachments', label: 'Attachments' },
  { key: 'connectors', label: 'Connectors' },
];

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
  const links = overview.links;
  const stamp = formatProjectTimestamp(overview.updatedAt || overview.createdAt);
  const stampLabel = overview.updatedAt ? 'Updated' : 'Created';
  const shown = visibleArtifacts(artifacts.rows, 8);

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-[var(--text-secondary)]">
            {overview.status.label}
          </span>
          {overview.layoutVersion != null ? (
            <span className="font-mono text-[11px] text-[var(--text-muted)]">
              Layout v{overview.layoutVersion}
            </span>
          ) : null}
        </div>
        <PageTitle title={overview.title} />
        <p className="max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
          Home for this project. Open Research, the dashboard, objects, or connectors with this project already selected.
        </p>
        <p className="truncate font-mono text-[11px] text-[var(--text-muted)]">{overview.id}</p>
        {overview.slug?.host ? (
          <p className="text-sm text-[var(--text-secondary)]">
            Personal link{' '}
            <span className="font-mono text-[var(--text-primary)]">{overview.slug.host}</span> opens this
            project’s dashboard.
          </p>
        ) : overview.slug ? (
          <p className="text-sm text-[var(--text-secondary)]">
            Saved link name <span className="font-mono text-[var(--text-primary)]">{overview.slug.slug}</span>.
            Claim a valid personal host from the dashboard when you want a subdomain.
          </p>
        ) : (
          <p className="text-sm text-[var(--text-secondary)]">
            No personal subdomain on this project yet. You can claim one from the dashboard.
          </p>
        )}
        {stamp ? (
          <p className="text-xs text-[var(--text-muted)]">
            {stampLabel} {stamp}
          </p>
        ) : null}
      </header>

      {links ? (
        <div className="flex flex-wrap gap-2">
          <Link href={links.research} className="btn-primary gap-1.5 px-4 text-sm">
            <IconSearch size={16} />
            Research
          </Link>
          <Link href={links.dashboard} className="btn-secondary gap-1.5 px-4 text-sm">
            <IconLayoutDashboard size={16} />
            Dashboard
          </Link>
          <Link href={links.objects} className="btn-secondary gap-1.5 px-4 text-sm">
            <IconBraces size={16} />
            Objects
          </Link>
          <Link href={links.connectors} className="btn-secondary gap-1.5 px-4 text-sm">
            <IconPlugConnected size={16} />
            Connectors
          </Link>
        </div>
      ) : null}

      {overview.workspaceEmpty ? (
        <section className="app-card space-y-3 border-dashed p-6">
          <h2 className="font-serif text-2xl text-[var(--text-primary)]">Nothing saved here yet</h2>
          <p className="max-w-xl text-sm leading-relaxed text-[var(--text-secondary)]">
            This project has no widgets, objects, datasets, attachments, or connectors. Start in Research
            and the work you keep will show up on this page.
          </p>
          {links ? (
            <Link href={links.research} className="btn-primary inline-flex px-4 text-sm">
              Start research
            </Link>
          ) : null}
        </section>
      ) : null}

      {overview.countsIncomplete ? (
        <p className="text-sm text-[var(--text-secondary)]">
          Some counts could not be loaded. Those show as —.
        </p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {STATS.map((stat) => {
          const value = overview.counts[stat.key];
          const empty = value === 0;
          return (
            <div key={stat.key} className="app-card space-y-1 p-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                {stat.label}
              </p>
              <p className="font-serif text-3xl text-[var(--text-primary)]">{formatCount(value)}</p>
              <p className="text-xs text-[var(--text-muted)]">
                {value == null ? 'Could not load' : empty ? 'None yet' : 'On this project'}
              </p>
            </div>
          );
        })}
        <div className="app-card space-y-1 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
            Research runs
          </p>
          <p className="font-serif text-3xl text-[var(--text-primary)]">—</p>
          <p className="text-xs leading-relaxed text-[var(--text-muted)]">{overview.runs.gap}</p>
        </div>
      </section>

      <section className="app-card space-y-4 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EA8069]/15 text-[#EA8069]">
            <IconFile size={18} />
          </div>
          <div>
            <h2 className="text-sm font-medium text-[var(--text-primary)]">Artifacts</h2>
            <p className="text-xs text-[var(--text-muted)]">
              Datasets and chat attachments stored on this project.
            </p>
          </div>
        </div>

        {artifacts.empty ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] px-4 py-6">
            <p className="text-sm text-[var(--text-secondary)]">No datasets or attachments yet.</p>
            {links ? (
              <Link
                href={links.research}
                className="mt-3 inline-flex text-sm font-medium text-[var(--coral,#EA8069)] hover:underline"
              >
                Add them from Research
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
          <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)]">
            {shown.visible.map((row) => (
              <ArtifactItem key={`${row.kind}-${row.id}`} row={row} />
            ))}
          </ul>
        ) : null}
        {shown.hidden > 0 ? (
          <p className="text-xs text-[var(--text-muted)]">
            {shown.hidden} more on this project. Open Objects or Research to work with them.
          </p>
        ) : null}
      </section>
    </div>
  );
}

function ArtifactItem({ row }: { row: ArtifactRow }) {
  return (
    <li className="flex items-center justify-between gap-3 px-3.5 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-[var(--text-primary)]">{row.title}</p>
        <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
          {row.kind === 'dataset' ? 'Dataset' : 'Attachment'}
          {row.meta ? ` · ${row.meta}` : ''}
        </p>
      </div>
    </li>
  );
}
