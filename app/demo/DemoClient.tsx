'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { SourceChips } from '../Components/research/SourceChips';
import { DemoFailure, askDemo, getGuestStatus } from '../lib/demoApi';
import { DEMO_EXAMPLES, explainDemoFailure, toolLabel, triesLabel, type DemoResult } from '../lib/demoChat.mjs';
import { warmAgent } from '../lib/warmApi';

type Turn = { question: string; result?: DemoResult; failure?: { kind: string; message: string } };

/** Ask a weather, currency, stock or math question with no account. The answer comes from a live tool, not a model. */
export function DemoClient({ preset }: { preset?: string } = {}) {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);
  const [turn, setTurn] = useState<Turn | null>(null);
  const [tries, setTries] = useState<{ limit: number; remaining: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const startedFromLink = useRef(false);
  useEffect(() => {
    // A shared or hero link like /demo?q=Weather in Mumbai asks that question straight away (once).
    const fromLink = new URLSearchParams(window.location.search).get('q')?.slice(0, 240).trim();
    const start = fromLink || preset?.trim();
    if (start && !startedFromLink.current) {
      startedFromLink.current = true;
      setInput(start);
      void ask(start);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    warmAgent({ guest: true }); // the first question after a quiet spell would otherwise wait for a cold start
    void getGuestStatus().then(setTries);
    return () => abortRef.current?.abort();
  }, []);

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    setBusy(true);
    setSlow(false);
    setTurn({ question: q });
    const slowTimer = window.setTimeout(() => setSlow(true), 4000);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const result = await askDemo(q, controller.signal);
      setTurn(result.error && !result.answer ? { question: q, failure: explainDemoFailure(0, { message: result.error.message }) } : { question: q, result });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const f = err instanceof DemoFailure ? explainDemoFailure(err.status, err.detail) : explainDemoFailure(0, null);
      setTurn({ question: q, failure: f });
    } finally {
      window.clearTimeout(slowTimer);
      setBusy(false);
      setSlow(false);
      void getGuestStatus().then(setTries);
    }
  };

  const out = tries !== null && tries.remaining <= 0;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Example questions">
        {DEMO_EXAMPLES.map((ex) => (
          <button
            key={ex.label}
            type="button"
            disabled={busy || out}
            onClick={() => {
              setInput(ex.question);
              void ask(ex.question);
            }}
            className="rounded-full border border-[#4A4238]/20 bg-white/50 px-4 py-2 text-sm transition-colors hover:border-[#E3836C] hover:text-[#C45A42] disabled:opacity-50 dark:border-[#504740] dark:bg-[#211E1C]/60"
          >
            {ex.label}
          </button>
        ))}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={240}
          placeholder="Weather in Pune, EUR to USD, TSLA price, 15% of 8200…"
          aria-label="Your question"
          className="min-w-0 flex-1 rounded-full border border-[#4A4238]/20 bg-white/70 px-5 py-3 text-base dark:border-[#504740] dark:bg-[#211E1C]"
        />
        <button
          type="submit"
          disabled={busy || out || !input.trim()}
          className="rounded-full bg-[#EA8069] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#C96551] disabled:opacity-50"
        >
          {busy ? 'Asking…' : 'Ask'}
        </button>
      </form>
      <p className="text-xs text-[#5C534A] dark:text-[#C5B9AE]" role="status">
        {tries ? triesLabel(tries.remaining, tries.limit) : ''}
      </p>

      {busy ? (
        <p className="text-sm text-[#5C534A] dark:text-[#C5B9AE]" role="status">
          {slow ? 'Waking the agent. The first question after a quiet spell can take about 15 seconds…' : 'Looking it up…'}
        </p>
      ) : null}

      {turn?.result ? (
        <article className="rounded-2xl border border-[#4A4238]/12 bg-white/60 p-5 dark:border-[#3A3430] dark:bg-[#211E1C]/60" aria-live="polite">
          <p className="text-xs font-mono uppercase tracking-wider text-[#5C534A] dark:text-[#C5B9AE]">{turn.question}</p>
          <p className="mt-3 whitespace-pre-wrap text-lg leading-relaxed">{turn.result.answer || 'No answer came back.'}</p>
          {turn.result.zeroTool ? (
            <p className="mt-3">
              <span
                className="inline-flex items-center gap-1 rounded-full bg-[#8FA98F]/15 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-[#4A7C59] dark:text-[#9EBB9A]"
                title="This answer came from a live tool. No AI model was used."
              >
                From tools · 0 tokens · {toolLabel(turn.result.zeroTool)}
              </span>
            </p>
          ) : null}
          {turn.result.failedTool ? (
            <p className="mt-3 text-xs text-[#9B4D3B]">The {toolLabel(turn.result.failedTool)} tool did not return a result, so nothing here is a live figure.</p>
          ) : null}
          <SourceChips sources={turn.result.sources} />
        </article>
      ) : null}

      {turn?.failure ? (
        <div role="alert" className="rounded-2xl border border-[#9B4D3B]/25 bg-[#9B4D3B]/5 p-5">
          <p className="text-sm">{turn.failure.message}</p>
          {turn.failure.kind === 'limit' || turn.failure.kind === 'needs_account' ? (
            <Link href="/login?tab=register" className="mt-3 inline-flex rounded-full bg-[#EA8069] px-5 py-2 text-sm font-medium text-white hover:bg-[#C96551]">
              Create a free account
            </Link>
          ) : null}
        </div>
      ) : null}

      {out && !turn?.failure ? (
        <p className="text-sm">
          That is all for today without an account.{' '}
          <Link href="/login?tab=register" className="text-[#C45A42] underline underline-offset-2">Create a free account</Link> to keep going.
        </p>
      ) : null}
    </div>
  );
}
