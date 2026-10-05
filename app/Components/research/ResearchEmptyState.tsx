'use client';

import { RESEARCH_EMPTY_SUB, RESEARCH_EMPTY_TITLE } from '../../lib/composerMode.mjs';

/** Small coral crystal. Decorative only — no motion. */
function ResearchMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 32 36"
      className="mx-auto mb-4 h-8 w-7 text-[var(--coral)]"
    >
      <path fill="currentColor" fillOpacity="0.16" d="M16 1.2 29.2 12.4 16 34.6 2.8 12.4Z" />
      <path fill="currentColor" d="M16 5 25.4 12.6 16 30.2 6.6 12.6Z" />
      <path fill="var(--surface)" fillOpacity="0.5" d="M16 5 25.4 12.6 16 16.4 6.6 12.6Z" />
    </svg>
  );
}

function EmptyTitle() {
  const accent = 'already knows';
  const at = RESEARCH_EMPTY_TITLE.indexOf(accent);
  if (at < 0) return <>{RESEARCH_EMPTY_TITLE}</>;
  return (
    <>
      {RESEARCH_EMPTY_TITLE.slice(0, at)}
      <em className="italic text-[var(--coral)]">{accent}</em>
      {RESEARCH_EMPTY_TITLE.slice(at + accent.length)}
    </>
  );
}

export function ResearchEmptyState({
  prompts,
  onPick,
}: {
  prompts: readonly string[];
  onPick: (prompt: string) => void;
}) {
  return (
    <div className="flex min-h-[min(28rem,70%)] items-center justify-center py-8 sm:py-12">
      <div className="w-full max-w-[28rem] rounded-[var(--radius-card)] bg-[var(--surface)]/80 px-5 py-7 text-center backdrop-blur-sm sm:px-6 sm:py-8">
        <ResearchMark />
        <h1 className="font-serif text-[1.75rem] font-medium leading-[1.15] tracking-tight text-[var(--text)] sm:text-[2rem] dark:text-[var(--text-primary)]">
          <EmptyTitle />
        </h1>
        <p className="mx-auto mt-3 max-w-[22rem] text-sm leading-relaxed text-[var(--text-muted)]">
          {RESEARCH_EMPTY_SUB}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2" role="group" aria-label="Suggested questions">
          {prompts.map((prompt) => (
            <button key={prompt} type="button" className="research-prompt-chip" onClick={() => onPick(prompt)}>
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
