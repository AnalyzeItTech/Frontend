'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  IconArrowUpRight,
  IconMapPin,
  IconSearch,
  IconSend,
  IconTable,
  IconWorld,
  IconX,
} from '@tabler/icons-react';
import { getStoredToken } from '../lib/auth';
import { SandboxedWidgetRenderer } from '../Components/dashboard/WidgetRenderer';
import {
  applyUIAction,
  ChatRequestError,
  getArtifactUrl,
  getProjects,
  streamChat,
  StreamEvent,
  WidgetSpec,
} from '../lib/chatApi';
import { SourceChips, type ResearchSource } from '../Components/research/SourceChips';
import { AppShell } from '../Components/app/AppShell';
import { PageTitle } from '../Components/app/PageTitle';

type ResultKind = 'brief' | 'chart' | 'table';

interface ResearchResult {
  kind: ResultKind;
  text: string;
  widget?: WidgetSpec;
  artifacts: Array<{ filename: string; type: string }>;
}

function widgetToResultKind(widget?: WidgetSpec): ResultKind {
  const type = widget?.type || widget?.component;
  if (type === 'table' || type === 'heatmap') return 'table';
  if (type === 'bar_chart' || type === 'line_chart' || type === 'annotated_chart') return 'chart';
  return 'brief';
}

const prompts = [
  'Compare India and Vietnam manufacturing growth',
  'What changed in global semiconductor demand?',
  'Find climate risks for Mumbai',
];

export default function ResearchPage() {
  return (
    <Suspense fallback={<AppShell active="research"><p className="text-sm">Loading research…</p></AppShell>}>
      <ResearchInner />
    </Suspense>
  );
}

function ResearchInner() {
  const params = useSearchParams();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [isResearching, setIsResearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [mode, setMode] = useState<'chat' | 'report' | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const [upgradeHref, setUpgradeHref] = useState(false);
  const [proposalWidget, setProposalWidget] = useState<WidgetSpec | null>(null);
  const [proposalMeta, setProposalMeta] = useState<{ action_id: string; project_id?: string } | null>(null);
  const [foundSources, setFoundSources] = useState<ResearchSource[]>([]);
  const [dashStatus, setDashStatus] = useState<string | null>(null);

  useEffect(() => {
    const preset = params.get('q');
    if (preset) setQuery(preset);
  }, [params]);

  const runResearch = async (value = query) => {
    if (!value.trim()) return;
    if (!getStoredToken()) {
      setError('Sign in to use Research & Discovery.');
      setResult(null);
      return;
    }
    setIsResearching(true);
    setError(null);
    setResult(null);
    setCancelled(false);
    setUpgradeHref(false);
    setProposalWidget(null);
    setProposalMeta(null);
    setDashStatus(null);
    setMode(null);
    setStatus('Routing…');
    setFoundSources([]);

    let widget: WidgetSpec | undefined;
    let streamed = '';
    try {
      const response = await streamChat({
        message: value.trim(),
        projectTitle: 'Research & Discovery',
        onEvent: (event: StreamEvent) => {
          if (event.event === 'route_decision') {
            const nextMode = event.payload?.response_mode === 'report' ? 'report' : 'chat';
            setMode(nextMode);
            setStatus(nextMode === 'report' ? 'Generating report…' : 'Answering…');
            return;
          }
          if (event.event === 'tool_call' || event.event === 'tool_result' || event.event === 'context_fetch') {
            const name = typeof event.payload?.tool === 'string' ? event.payload.tool : event.event;
            const args = event.payload?.args as Record<string, unknown> | undefined;
            const hint = typeof args?.symbol === 'string' ? args.symbol : typeof args?.city === 'string' ? args.city : '';
            if (event.event === 'tool_call') {
              setStatus(hint ? `Looking up ${hint}…` : `Calling ${name}…`);
            }
            return;
          }
          if (event.event === 'tool_progress') {
            const nested = event.payload?.progress as Record<string, unknown> | undefined;
            const step = (typeof event.payload?.step === 'string' ? event.payload.step : nested?.step) || '';
            const detail = typeof event.payload?.detail === 'string'
              ? event.payload.detail
              : typeof nested?.detail === 'string'
                ? nested.detail
                : 'Gathering sources…';
            setStatus(detail);
            if (step === 'source_found') {
              const host = detail.split('/').pop() || detail;
              const url = typeof event.payload?.url === 'string' ? event.payload.url : typeof nested?.url === 'string' ? nested.url : `https://${host}`;
              const title = typeof event.payload?.title === 'string' ? event.payload.title : '';
              setFoundSources((prev) => {
                if (prev.some((item) => item.host === host)) return prev;
                return [...prev, { host, url, title }];
              });
            }
            return;
          }
          if (event.event === 'run_cancelled') {
            setCancelled(true);
            setStatus('Cancelled');
            return;
          }
          if (event.event === 'error') {
            setStatus('Error');
            return;
          }
          if (event.event === 'model_delta') {
            setStatus('Synthesizing…');
            return;
          }
          if (event.event !== 'ui_proposal') return;
          const candidate = event.payload.widget_spec;
          if (candidate && typeof candidate === 'object') {
            widget = candidate as WidgetSpec;
            setProposalWidget(widget);
          }
          const actionId = typeof event.payload.action_id === 'string' ? event.payload.action_id : '';
          const projectId = typeof event.payload.project_id === 'string' ? event.payload.project_id : undefined;
          if (actionId) setProposalMeta({ action_id: actionId, project_id: projectId });
        },
      });
      streamed = response.finalText;
      if (response.sources?.length) {
        setFoundSources((prev) => {
          const next = [...prev];
          for (const src of response.sources) {
            const host = src.host || (src.url ? new URL(src.url).hostname : '');
            if (host && !next.some((item) => item.host === host || item.url === src.url)) {
              next.push({ host, url: src.url, title: src.title });
            }
          }
          return next;
        });
      }
      setResult({
        kind: widgetToResultKind(widget),
        text: streamed || 'The research agent returned no written findings.',
        widget,
        artifacts: response.artifacts,
      });
    } catch (researchError: unknown) {
      if (researchError instanceof ChatRequestError && researchError.upgradeRequired) {
        setUpgradeHref(true);
        setError(researchError.message);
      } else {
        setError(researchError instanceof Error ? researchError.message : 'Research request failed.');
      }
    } finally {
      setIsResearching(false);
      setStatus(null);
    }
  };

  const addProposalToDashboard = async () => {
    if (!proposalMeta) return;
    setDashStatus('Adding…');
    try {
      let projectId = proposalMeta.project_id;
      if (!projectId) {
        const projects = await getProjects();
        projectId = projects[0]?.id;
      }
      if (!projectId) {
        setDashStatus('Create a project on Dashboard first.');
        return;
      }
      await applyUIAction(projectId, proposalMeta.action_id, true);
      setDashStatus('Added to dashboard.');
    } catch (applyError: unknown) {
      setDashStatus(applyError instanceof Error ? applyError.message : 'Could not add to dashboard.');
    }
  };

  return (
    <AppShell active="research">
      <div className="mx-auto max-w-2xl">
        <PageTitle title="Follow a question" accent="where it leads" />
        <p className="mt-3 max-w-md text-sm leading-relaxed text-[#6B6155]">
          Search the web, news, geography, and your files. The research agent gathers context, then chooses the clearest form for an answer.
        </p>

        <form onSubmit={(event) => { event.preventDefault(); void runResearch(); }} className="app-card mt-6 p-2">
          <div className="flex items-center gap-3 px-3 py-2">
            <IconSearch size={18} className="shrink-0 text-[#E3836C]" />
            <input value={query} onChange={(event) => { setQuery(event.target.value); setError(null); }} disabled={isResearching} placeholder="Ask a question or explore a place…" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#8F8477] disabled:opacity-60" />
            <Link href="/globe" aria-label="Open globe" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#4A4238]/15 text-[#E3836C]">
              <IconWorld size={16} />
            </Link>
            <button type="submit" aria-label="Research" aria-busy={isResearching} disabled={isResearching || !query.trim()} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E3836C] text-white disabled:opacity-50"><IconSend size={16} /></button>
          </div>
        </form>

        {error && (
          <p role="alert" className="mt-4 rounded-xl border border-[#B86450]/20 bg-[#B86450]/10 px-3 py-2 text-xs text-[#9B4D3B]">
            {error}
            {upgradeHref ? <Link href="/billing" className="font-medium underline"> Upgrade</Link> : null}
          </p>
        )}
        {!result && !isResearching && (
          <div className="mt-5 flex flex-wrap gap-2">
            {prompts.map((prompt) => (
              <button key={prompt} type="button" onClick={() => { setQuery(prompt); void runResearch(prompt); }} className="btn-secondary text-xs">
                {prompt}
              </button>
            ))}
          </div>
        )}
        {isResearching && (
          <div className="mt-5">
            <p className="text-xs font-mono uppercase tracking-[0.14em] text-[#B86450]">
              {mode === 'report' ? 'Generating report… ' : ''}
              {status || 'Following sources…'}
            </p>
            <SourceChips sources={foundSources} />
          </div>
        )}
        {cancelled && <p className="mt-3 text-xs text-[#786F64]">Run cancelled.</p>}

        {proposalWidget && (
          <div className="app-card mt-6 overflow-hidden p-3">
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#8F8477]">Dashboard preview</p>
              <Link href="/Dashboard" className="text-[11px] text-[#E3836C]">Open full view</Link>
            </div>
            <SandboxedWidgetRenderer widget={proposalWidget} isDraftPreview />
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-[10px] text-[#8F8477]">Report stays in chat. Dashboard only if you add it.</p>
              <button type="button" disabled={!proposalMeta} onClick={() => void addProposalToDashboard()} className="btn-primary text-[11px] disabled:opacity-40">
                Add to dashboard
              </button>
            </div>
            {dashStatus ? <p className="mt-1 text-[10px] text-[#8F8477]">{dashStatus}</p> : null}
          </div>
        )}

        {result && (
          <div className="app-card mt-6 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#B86450]">Fresh research result</p>
                <h2 className="mt-1 text-lg font-medium">{result.kind === 'chart' ? 'Structured comparison' : result.kind === 'table' ? 'Structured findings' : 'Research brief'}</h2>
              </div>
              <button type="button" onClick={() => setResult(null)} className="rounded-full p-1 text-[#786F64]"><IconX size={17} /></button>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-[#6B6155]">{result.text}</p>
            <SourceChips sources={foundSources} />
            {result.artifacts.length > 0 && (
              <div className="mt-4 space-y-1 text-[11px] text-[#786F64]">
                {result.artifacts.map((art, index) => {
                  const rec = art as { filename: string; type: string; artifact_id?: string; id?: string };
                  const id = rec.artifact_id || rec.id;
                  return (
                    <div key={`${rec.filename}-${index}`} className="flex items-center gap-1.5">
                      <IconTable size={13} className="text-[#E3836C]" />
                      {id ? <a className="underline" href={getArtifactUrl(String(id))}>{rec.filename}</a> : <span>{rec.filename}</span>}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-5 flex items-center justify-between border-t border-[#4A4238]/10 pt-4">
              <div className="flex items-center gap-1.5 text-[11px] text-[#786F64]"><IconMapPin size={13} className="text-[#E3836C]" /> Agent stream complete</div>
              <Link href="/Dashboard" className="btn-primary text-xs">Open dashboard <IconArrowUpRight size={13} /></Link>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
