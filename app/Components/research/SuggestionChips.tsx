'use client';

/** Context-aware follow-up questions under an answer; one click sends it. */
export function SuggestionChips({ suggestions, onPick, disabled }: { suggestions: string[]; onPick: (q: string) => void; disabled?: boolean }) {
  if (!suggestions.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Suggested follow-up questions">
      {suggestions.map((s) => (
        <button
          key={s}
          type="button"
          disabled={disabled}
          onClick={() => onPick(s)}
          className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-left text-xs text-[var(--text-secondary)] transition hover:border-[var(--coral,#EA8069)] hover:text-[var(--text-primary)] disabled:opacity-40"
        >
          {s}
        </button>
      ))}
    </div>
  );
}
