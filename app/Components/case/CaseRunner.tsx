'use client';

import Link from 'next/link';
import { useEffect, useReducer, useRef, useState } from 'react';
import { RunSteps } from '../research/RunSteps';
import { CaseResult } from './CaseResult';
import { explainCaseFailure, initialRun, parseCaseLine, reduceRun } from '../../lib/caseRun.mjs';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface CaseInfo {
  id: string;
  title: string;
  question: string;
  source: string;
}

/** Pick one public dataset and watch AnalyzeIt find it, pull it and read it. No account. */
export function CaseRunner() {
  const [cases, setCases] = useState<CaseInfo[]>([]);
  const [run, dispatch] = useReducer(reduceRun, initialRun);
  const [failure, setFailure] = useState<{ message: string; signup: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    let live = true;
    fetch(`${API}/v1/case-runs/cases`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (live && d && Array.isArray(d.cases)) setCases(d.cases as CaseInfo[]);
      })
      .catch(() => undefined);
    return () => {
      live = false;
      abort.current?.abort();
    };
  }, []);

  const start = async (id: string) => {
    if (busy) return;
    setBusy(true);
    setFailure(null);
    dispatch({ type: 'reset' });
    const controller = new AbortController();
    abort.current = controller;
    try {
      const res = await fetch(`${API}/v1/case-runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ case_id: id }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => null);
        setFailure(explainCaseFailure(res.status, body && typeof body === 'object' ? (body as { detail?: unknown }).detail : null));
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl = buffer.indexOf('\n');
        while (nl >= 0) {
          const ev = parseCaseLine(buffer.slice(0, nl));
          buffer = buffer.slice(nl + 1);
          if (ev) dispatch(ev);
          nl = buffer.indexOf('\n');
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setFailure(explainCaseFailure(0, null));
    } finally {
      setBusy(false);
    }
  };

  const showResult = run.status === 'answered' && run.findings;
  return (
    <div className="space-y-8">
      {!showResult ? (
        <section aria-label="Choose a case">
          <h1 className="font-serif text-3xl sm:text-5xl text-[var(--text-primary)]">Watch it work on real public data.</h1>
          <p className="mt-3 max-w-2xl text-[var(--text-muted)]">
            Pick a question. AnalyzeIt finds the public data, downloads it, reads it, and shows what stands out, with the source and the working. No account, no model, nothing typed
            in by hand.
          </p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-3">
            {cases.map((c) => (
              <li key={c.id} className="flex flex-col justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <div>
                  <h2 className="font-serif text-xl text-[var(--text-primary)]">{c.title}</h2>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{c.question}</p>
                  <p className="mt-2 text-xs font-mono text-[var(--text-muted)]">Data: {c.source}</p>
                </div>
                <button type="button" disabled={busy} onClick={() => void start(c.id)} className="btn-primary mt-4 text-sm disabled:opacity-50">
                  {busy && run.title === c.title ? 'Running…' : 'Run this case'}
                </button>
              </li>
            ))}
          </ul>
          {!cases.length ? <p className="mt-6 text-sm text-[var(--text-muted)]">Loading the cases…</p> : null}
        </section>
      ) : null}

      {run.status === 'running' ? (
        <section aria-label="Running" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="text-xs font-mono uppercase tracking-widest text-[var(--text-muted)]">Live</p>
          <h2 className="mt-1 font-serif text-2xl text-[var(--text-primary)]">{run.title}</h2>
          <RunSteps steps={run.steps} />
        </section>
      ) : null}

      {run.status === 'unavailable' || run.status === 'error' || failure ? (
        <div role="alert" className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm text-[var(--text-primary)]">
          {failure?.message || run.message}
          {failure?.signup ? (
            <>
              {' '}
              <Link href="/login?tab=register" className="underline underline-offset-2">
                Create a free account
              </Link>
              .
            </>
          ) : null}
        </div>
      ) : null}

      {showResult && run.findings ? (
        <CaseResult title={run.title} question={run.question} text={run.text} findings={run.findings} steps={run.steps} sharePath={run.saved?.path} />
      ) : null}
    </div>
  );
}
