'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { IconLoader2, IconPlayerStop, IconSend } from '@tabler/icons-react';
import { ChatMarkdown } from '../chat/ChatMarkdown';
import { ChatRequestError, streamChat, type StreamEvent } from '../../lib/chatApi';
import { parseExtras } from '../../lib/chatExtras.mjs';
import { askSuggestions, clampAnswer, globeAskMessage, type AskState } from './askGlobe.mjs';
import { useGlobe } from './useGlobe';

type Place = { name: string; lat: number; lon: number };

type Props = {
  state: AskState;
  projectId?: string;
  /** Fly the map to a place the answer is about. */
  onFly: (place: Place) => void;
};

/**
 * Ask the globe: a question box docked in the right rail. The answer streams in place, and the places it is
 * about are pinned and the camera flies to the first one, so the user never leaves the map.
 */
export function GlobeAsk({ state, projectId, onFly }: Props) {
  const { ingestChatRun } = useGlobe();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [status, setStatus] = useState<'idle' | 'running' | 'error'>('idle');
  const [note, setNote] = useState<string | null>(null);
  const [needsAccess, setNeedsAccess] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const [lastQuestion, setLastQuestion] = useState('');

  useEffect(() => () => abortRef.current?.abort(), []);

  const ask = useCallback(
    async (raw?: string) => {
      const q = (raw ?? question).trim();
      if (!q || status === 'running') return;
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setLastQuestion(q);
      setQuestion('');
      setAnswer('');
      setPlaces([]);
      setNote(null);
      setNeedsAccess(false);
      setStatus('running');
      let streamed = '';
      const box: { final: Record<string, unknown> | null } = { final: null };
      try {
        await streamChat({
          message: globeAskMessage(q, state),
          projectId,
          signal: ac.signal,
          onEvent: (ev: StreamEvent) => {
            if (ev.event === 'model_delta' && typeof ev.payload?.text === 'string') {
              streamed += ev.payload.text;
              setAnswer(clampAnswer(streamed));
            } else if (ev.event === 'permission_request') {
              setNeedsAccess(true);
            } else if (ev.event === 'final') {
              box.final = ev.payload;
            }
          },
        });
        const text = typeof box.final?.text === 'string' ? box.final.text : streamed;
        setAnswer(clampAnswer(text));
        const found = (parseExtras(box.final) as { places: Place[] }).places;
        if (found.length) {
          setPlaces(found);
          ingestChatRun({ places: found });
          onFly(found[0]);
        }
        setStatus('idle');
      } catch (err) {
        if (ac.signal.aborted) {
          setStatus('idle');
          setNote('Stopped.');
          return;
        }
        setStatus('error');
        setNote(err instanceof ChatRequestError ? err.message : 'Could not reach the assistant. Try again.');
      }
    },
    [question, status, state, projectId, ingestChatRun, onFly],
  );

  const stop = () => abortRef.current?.abort();
  const suggestions = askSuggestions(state);
  const hasOutput = Boolean(answer || note || status === 'running');
  const researchHref = `/research?q=${encodeURIComponent(lastQuestion)}${projectId ? `&project=${encodeURIComponent(projectId)}` : ''}`;

  return (
    <section aria-label="Ask the globe" className="flex max-h-[55%] min-h-0 flex-col border-t border-[var(--border)] bg-[var(--surface)]">
      {hasOutput ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-3" aria-live="polite">
          {answer ? (
            <div className="text-[13px] leading-relaxed text-[var(--text-primary)]">
              <ChatMarkdown text={answer} />
            </div>
          ) : status === 'running' ? (
            <p className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <IconLoader2 size={14} className="animate-spin" /> Looking at the globe…
            </p>
          ) : null}
          {places.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {places.map((p) => (
                <button
                  key={`${p.lat},${p.lon}`}
                  type="button"
                  onClick={() => onFly(p)}
                  className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  {p.name}
                </button>
              ))}
            </div>
          ) : null}
          {needsAccess ? (
            <p className="mt-2 rounded-lg bg-[var(--surface-2)] p-2 text-xs text-[var(--text-secondary)]">
              To use your project data, allow AI access in{' '}
              <Link className="underline" href={researchHref}>
                Research
              </Link>
              , then ask again.
            </p>
          ) : null}
          {note ? <p className="mt-2 text-xs text-[var(--text-muted)]">{note}</p> : null}
          {status === 'idle' && answer ? (
            <Link href={researchHref} className="mt-2 inline-block text-[11px] text-[var(--text-muted)] underline">
              Continue in Research
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5 px-3 pt-3">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => void ask(s)}
              className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-left text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <form
        className="flex items-center gap-2 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void ask();
        }}
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask the globe…"
          aria-label="Ask the globe"
          maxLength={500}
          className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[#EA8069]"
        />
        {status === 'running' ? (
          <button type="button" onClick={stop} aria-label="Stop" className="btn-secondary flex h-9 w-9 items-center justify-center rounded-xl">
            <IconPlayerStop size={16} />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!question.trim()}
            aria-label="Send"
            className="btn-primary flex h-9 w-9 items-center justify-center rounded-xl disabled:opacity-50"
          >
            <IconSend size={16} />
          </button>
        )}
      </form>
    </section>
  );
}
