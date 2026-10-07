'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChatMarkdown } from '../chat/ChatMarkdown';
import { FindingCards } from '../research/FindingCards';
import { RunSteps } from '../research/RunSteps';
import { sourceLines, withoutFindingList, type ParsedFindings, type RunStep } from '../../lib/findings.mjs';

/**
 * A finished case run: the question, the answer, the findings with their working, where the data came from, what was done to get it,
 * and a link to keep. The same view appears at the end of a live run and when a saved result is reopened from its link.
 */
export function CaseResult({
  title,
  question,
  text,
  findings,
  steps,
  sharePath,
  createdAt,
}: {
  title: string;
  question: string;
  text: string;
  findings: ParsedFindings;
  steps: RunStep[];
  sharePath?: string;
  createdAt?: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const url = sharePath && typeof window !== 'undefined' ? `${window.location.origin}${sharePath}` : '';
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* the link is shown, so it can be copied by hand */
    }
  };
  const date = createdAt ? new Date(createdAt).toLocaleDateString('en-GB', { dateStyle: 'medium' }) : '';
  return (
    <article className="space-y-5" aria-label={title}>
      <header>
        <p className="text-xs font-mono uppercase tracking-widest text-[var(--text-muted)]">Case run{date ? ` · ${date}` : ''}</p>
        <h1 className="mt-1 font-serif text-3xl sm:text-4xl text-[var(--text-primary)]">{title}</h1>
        <div className="mt-3 w-fit max-w-full rounded-2xl rounded-bl-md bg-[var(--surface-2)] px-4 py-2 text-sm text-[var(--text-primary)]">{question}</div>
      </header>

      {text ? (
        <div className="text-[15px] leading-relaxed text-[var(--text-primary)]">
          <ChatMarkdown text={withoutFindingList(text)} />
        </div>
      ) : null}

      <FindingCards data={findings} signedIn={false} />

      <section aria-label="Where the data came from" className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm">
        <h2 className="font-semibold text-[var(--text-primary)]">Sources</h2>
        {findings.scope.sources.length ? (
          <ul className="mt-2 space-y-3">
            {findings.scope.sources.map((s) => (
              <li key={s.table + s.url}>
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="font-medium text-[var(--finding-accent)] underline underline-offset-2">
                    {s.title || s.host}
                  </a>
                ) : (
                  <span className="font-medium">{s.title || s.host}</span>
                )}
                <ul className="mt-0.5 text-xs text-[var(--text-muted)]">
                  {sourceLines(s).map((l: string) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="mt-3 text-xs text-[var(--text-muted)]">This data comes from the internet and has not been checked by us. Check anything important at the source.</p>
      </section>

      {steps.length ? (
        <section aria-label="What it did">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">What it did</h2>
          <RunSteps steps={steps} />
        </section>
      ) : null}

      {sharePath ? (
        <section aria-label="Share this result" className="rounded-2xl border border-[var(--border)] p-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Keep and share this result</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Anyone with the link can open it. It is kept for 30 days.</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input readOnly value={url} aria-label="Link to this result" onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs" />
            <button type="button" onClick={() => void copy()} className="btn-secondary text-xs">
              {copied ? 'Copied' : 'Copy link'}
            </button>
            <Link href={sharePath} className="btn-secondary text-xs">
              Open
            </Link>
          </div>
        </section>
      ) : null}

      <section aria-label="Continue" className="rounded-2xl bg-[var(--surface-2)] p-5">
        <h2 className="font-serif text-xl text-[var(--text-primary)]">Continue in AnalyzeIt</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          You can read every number, assumption, and chart here without an account. Sign in when you want to run the same kind of analysis on your own files.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link href="/login?tab=register" className="btn-primary text-sm">
            Continue in AnalyzeIt
          </Link>
          <Link href="/case" className="btn-secondary text-sm">
            Run another case
          </Link>
        </div>
      </section>
    </article>
  );
}
