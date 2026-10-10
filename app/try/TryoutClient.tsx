'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ChatMarkdown } from '../Components/chat/ChatMarkdown';
import { SourceChips } from '../Components/research/SourceChips';
import { TryoutFailure, askTryout, getTryoutStatus, type TryoutStatus } from '../lib/tryoutApi';
import { TRYOUT_EXAMPLES, explainTryoutFailure, formatWait, runsLabel } from '../lib/tryout.mjs';
import type { DemoResult } from '../lib/demoChat.mjs';
import { warmAgent } from '../lib/warmApi';

type Turn = { question: string; result?: DemoResult; failure?: { kind: string; message: string } };

/** A few real model runs with no account. The server enforces every limit; this page only shows them. */
export function TryoutClient() {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);
  const [turn, setTurn] = useState<Turn | null>(null);
  const [status, setStatus] = useState<TryoutStatus | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    warmAgent({ guest: true });
    void getTryoutStatus().then(setStatus);
    return () => abortRef.current?.abort();
  }, []);

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    setBusy(true);
    setSlow(false);
    setTurn({ question: q });
    const slowTimer = window.setTimeout(() => setSlow(true), 6000);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const result = await askTryout(q, controller.signal);
      setTurn(result.error && !result.answer ? { question: q, failure: { kind: 'error', message: result.error.message || 'The run could not be completed.' } } : { question: q, result });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setTurn({ question: q, failure: err instanceof TryoutFailure ? explainTryoutFailure(err.status, err.detail) : explainTryoutFailure(0, null) });
    } finally {
      window.clearTimeout(slowTimer);
      setBusy(false);
      setSlow(false);
      void getTryoutStatus().then(setStatus);
    }
  };

  const out = status !== null && status.remaining <= 0;
  const unavailable = status !== null && !status.available;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Example questions">
        {TRYOUT_EXAMPLES.map((ex) => (
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
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(input);
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={400}
          rows={3}
          placeholder="Ask a question about analysing data, metrics or a business problem…"
          aria-label="Your question"
          className="w-full resize-none rounded-2xl border border-[#4A4238]/20 bg-white/70 px-5 py-3 text-base dark:border-[#504740] dark:bg-[#211E1C]"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[#5C534A] dark:text-[#C5B9AE]" role="status">
            {status && status.available ? runsLabel(status.remaining, status.limit) : ''}
          </p>
          <button
            type="submit"
            disabled={busy || out || unavailable || !input.trim()}
            className="rounded-full bg-[#EA8069] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#C96551] disabled:opacity-50"
          >
            {busy ? 'Working…' : 'Ask'}
          </button>
        </div>
      </form>

      {busy ? (
        <p className="text-sm text-[#5C534A] dark:text-[#C5B9AE]" role="status">
          {slow ? 'Still working. The first run after a quiet spell can take about 30 seconds…' : 'Working on it…'}
        </p>
      ) : null}

      {turn?.result ? (
        <article className="rounded-2xl border border-[#4A4238]/12 bg-white/60 p-5 dark:border-[#3A3430] dark:bg-[#211E1C]/60" aria-live="polite">
          <p className="text-xs font-mono uppercase tracking-wider text-[#5C534A] dark:text-[#C5B9AE]">{turn.question}</p>
          <div className="mt-3 text-base leading-relaxed">
            <ChatMarkdown text={turn.result.answer || 'No answer came back.'} />
          </div>
          <SourceChips sources={turn.result.sources} />
        </article>
      ) : null}

      {turn?.failure ? (
        <div role="alert" className="rounded-2xl border border-[#9B4D3B]/25 bg-[#9B4D3B]/5 p-5">
          <p className="text-sm">{turn.failure.message}</p>
          {turn.failure.kind === 'limit' ? (
            <Link href="/login?tab=register" className="mt-3 inline-flex rounded-full bg-[#EA8069] px-5 py-2 text-sm font-medium text-white hover:bg-[#C96551]">
              Create a free account
            </Link>
          ) : null}
        </div>
      ) : null}

      {out && !turn?.failure ? (
        <div className="rounded-2xl border border-[#4A4238]/12 bg-white/60 p-5 text-sm dark:border-[#3A3430] dark:bg-[#211E1C]/60">
          <p>
            You have used all {status?.limit} try-out runs. Create a free account to keep going
            {status && status.retry_after_seconds > 0 ? `, or come back in ${formatWait(status.retry_after_seconds)}.` : '.'}
          </p>
          <Link href="/login?tab=register" className="mt-3 inline-flex rounded-full bg-[#EA8069] px-5 py-2 text-sm font-medium text-white hover:bg-[#C96551]">
            Create a free account
          </Link>
        </div>
      ) : null}

      {unavailable ? <p className="text-sm text-[#9B4D3B]">The try-out is unavailable right now. Please try again in a few minutes.</p> : null}
    </div>
  );
}
