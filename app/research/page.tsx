'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconArrowUpRight,
  IconMapPin,
  IconSearch,
  IconSend,
  IconSparkles,
  IconTable,
  IconX,
} from '@tabler/icons-react';
import { getStoredToken } from '../lib/auth';
import { ChatRequestError, streamChat, StreamEvent, WidgetSpec, getArtifactUrl } from '../lib/chatApi';

const EarthGlobe = dynamic(
  () => import('../Components/3d/EarthGlobe').then((module) => module.EarthGlobe),
  { ssr: false, loading: () => <div className="absolute inset-0 bg-[#E8DFD3]" /> }
);

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
  const [expanded, setExpanded] = useState(true);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [isResearching, setIsResearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [mode, setMode] = useState<'chat' | 'report' | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const [upgradeHref, setUpgradeHref] = useState(false);

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
    setMode(null);
    setStatus('Routing…');

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
          if (event.event === 'tool_call') {
            const name = typeof event.payload?.tool === 'string' ? event.payload.tool : 'tool';
            const args = event.payload?.args as Record<string, unknown> | undefined;
            const hint = typeof args?.symbol === 'string' ? args.symbol : typeof args?.city === 'string' ? args.city : '';
            setStatus(hint ? `Looking up ${hint}…` : `Calling ${name}…`);
            return;
          }
          if (event.event === 'tool_progress') {
            const detail = typeof event.payload?.detail === 'string' ? event.payload.detail : 'Gathering sources…';
            setStatus(detail);
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
          }
        },
      });
      streamed = response.finalText;
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

  return (
    <main className="min-h-screen overflow-hidden bg-[#E8DFD3] text-[#4A4238]">
      <EarthGlobe isExpanded={expanded} onToggleExpand={setExpanded} className="!fixed opacity-95" />
      <div className="fixed inset-0 z-10 bg-gradient-to-r from-[#F3EDE4]/90 via-[#F3EDE4]/25 to-transparent pointer-events-none" />

      <header className="fixed top-5 left-4 right-4 z-[70] flex items-center justify-between gap-4 rounded-full border border-[#4A4238]/15 bg-[#F3EDE4]/80 px-5 py-3 shadow-sm backdrop-blur-xl sm:left-8 sm:right-8">
        <Link href="/" className="flex items-center gap-2 font-serif text-xl tracking-tight">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E3836C] text-sm font-semibold text-white">A</span>
          AnalyzeIt
        </Link>
        <div className="hidden items-center gap-2 text-[10px] font-mono uppercase tracking-[0.16em] text-[#786F64] md:flex">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#8FA98F]" /> Research & Discovery
        </div>
        <Link href="/Dashboard" className="inline-flex items-center gap-1.5 rounded-full border border-[#4A4238]/15 px-3 py-1.5 text-xs font-medium transition hover:border-[#E3836C] hover:text-[#B86450]">
          Structured data <IconArrowUpRight size={14} />
        </Link>
      </header>

      <section className="relative z-[60] flex min-h-screen pointer-events-none items-center px-5 py-28 sm:px-12 lg:px-20">
        <div className="w-full max-w-xl pointer-events-auto">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#4A4238]/10 bg-[#F3EDE4]/80 px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.14em] text-[#786F64] backdrop-blur">
            <IconSparkles size={13} className="text-[#E3836C]" /> Ask about the world, not a schema
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="font-serif text-5xl leading-[0.96] tracking-tight sm:text-6xl">
            Follow a question<br />
            <em className="text-[#E3836C]">where it leads.</em>
          </motion.h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-[#6B6155]">
            Search the web, news, geography, and your files. The research agent gathers context, condenses it, then chooses the clearest form for an answer.
          </p>

          <form onSubmit={(event) => { event.preventDefault(); runResearch(); }} className="mt-7 rounded-[1.35rem] border border-[#4A4238]/15 bg-[#FFF9F3]/90 p-2 shadow-xl shadow-[#4A4238]/10 backdrop-blur-xl">
            <div className="flex items-center gap-3 px-3 py-2">
              <IconSearch size={18} className="shrink-0 text-[#E3836C]" />
              <input value={query} onChange={(event) => { setQuery(event.target.value); setError(null); }} disabled={isResearching} placeholder="Ask a question or explore a place…" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#8F8477] disabled:opacity-60" />
              <button type="submit" aria-label="Research" aria-busy={isResearching} disabled={isResearching || !query.trim()} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E3836C] text-white transition hover:bg-[#C96F5A] disabled:cursor-not-allowed disabled:opacity-50"><IconSend size={16} /></button>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-[#4A4238]/10 px-3 pt-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#8F8477]">Sources selected per question</span>
            </div>
          </form>

          {error && (
            <p role="alert" className="mt-4 rounded-xl border border-[#B86450]/20 bg-[#B86450]/10 px-3 py-2 text-xs text-[#9B4D3B]">
              {error}
              {upgradeHref ? (
                <>
                  {' '}
                  <Link href="/billing" className="font-medium underline">
                    Upgrade
                  </Link>
                </>
              ) : null}
            </p>
          )}
          {!query.trim() && !result && !isResearching && (
            <p className="mt-4 text-xs text-[#8F8477]">Ask anything. Empty queries are ignored.</p>
          )}
          {!result && !isResearching && <div className="mt-5 flex flex-wrap gap-2">{prompts.map((prompt) => <button key={prompt} onClick={() => { setQuery(prompt); void runResearch(prompt); }} className="rounded-full border border-[#4A4238]/12 bg-[#F3EDE4]/75 px-3 py-1.5 text-xs text-[#6B6155] backdrop-blur transition hover:border-[#E3836C]/50 hover:text-[#B86450]">{prompt}</button>)}</div>}
          {isResearching && (
            <p className="mt-5 text-xs font-mono uppercase tracking-[0.14em] text-[#B86450]">
              {mode === 'report' ? 'Generating report… ' : ''}
              {status || 'Following sources…'}
            </p>
          )}
          {cancelled && <p className="mt-3 text-xs text-[#786F64]">Run cancelled.</p>}
        </div>
      </section>

      <AnimatePresence>
        {result && (
          <motion.aside initial={{ opacity: 0, x: 22 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 22 }} className="fixed bottom-6 right-5 z-[70] w-[calc(100%-2.5rem)] max-w-md rounded-[1.5rem] border border-[#4A4238]/15 bg-[#FFF9F3]/95 p-5 shadow-2xl shadow-[#4A4238]/20 backdrop-blur-2xl sm:right-8">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#B86450]">Fresh research result</p><h2 className="mt-1 font-serif text-2xl">{result.kind === 'chart' ? 'Structured comparison' : result.kind === 'table' ? 'Structured findings' : 'Research brief'}</h2></div>
              <button onClick={() => setResult(null)} className="rounded-full p-1 text-[#786F64] hover:bg-[#EDE4D8]"><IconX size={17} /></button>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-[#6B6155]">{result.text}</p>
            {result.artifacts.length > 0 && (
              <div className="mt-4 space-y-1 text-[11px] text-[#786F64]">
                {result.artifacts.map((art, index) => {
                  const rec = art as { filename: string; type: string; artifact_id?: string; id?: string };
                  const id = rec.artifact_id || rec.id;
                  return (
                    <div key={`${rec.filename}-${index}`} className="flex items-center gap-1.5">
                      <IconTable size={13} className="text-[#E3836C]" />
                      {id ? (
                        <a className="underline" href={getArtifactUrl(String(id))}>
                          {rec.filename}
                        </a>
                      ) : (
                        <span>{rec.filename}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-5 flex items-center justify-between border-t border-[#4A4238]/10 pt-4"><div className="flex items-center gap-1.5 text-[11px] text-[#786F64]"><IconMapPin size={13} className="text-[#E3836C]" /> Agent stream complete</div><Link href="/Dashboard" className="inline-flex items-center gap-1.5 rounded-full bg-[#4A4238] px-3 py-2 text-xs font-medium text-[#FFF9F3] hover:bg-[#E3836C]">Open structured data <IconArrowUpRight size={13} /></Link></div>
          </motion.aside>
        )}
      </AnimatePresence>
    </main>
  );
}
