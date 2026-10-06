// A guest case run: reading the stream the Backend sends, and turning a saved run's activity back into the same step list the live run shows.
// The payload crosses a network boundary and ends up on a public page, so everything is read defensively and strings are bounded.

import { parseFindings, reduceSteps, STEP_DEFS_ONLINE } from './findings.mjs';

const text = (v, max) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

/** One NDJSON line to an event, or null. Only the events the page uses are kept. */
export function parseCaseLine(line) {
  let e;
  try {
    e = JSON.parse(line);
  } catch {
    return null;
  }
  if (!e || typeof e !== 'object' || typeof e.event !== 'string') return null;
  const p = e.payload && typeof e.payload === 'object' ? e.payload : {};
  switch (e.event) {
    case 'case_started':
      return { type: 'started', title: text(p.title, 120), question: text(p.question, 200), source: text(p.source, 60) };
    case 'tool_progress':
      return { type: 'progress', payload: p };
    case 'final':
      return { type: 'final', text: typeof p.text === 'string' ? p.text.slice(0, 20000) : '', findings: parseFindings(p.findings) };
    case 'case_saved':
      return typeof p.path === 'string' && /^\/case\/[A-Za-z0-9_-]{8,64}$/.test(p.path) ? { type: 'saved', path: p.path, expiresAt: text(p.expires_at, 40) } : null;
    case 'case_unavailable':
      return { type: 'unavailable', message: text(p.message, 240) || 'The public source did not give usable data this time.' };
    case 'error':
      return { type: 'error', message: text(p.message, 240) || 'The run could not be completed.' };
    default:
      return null;
  }
}

export const initialRun = { status: 'idle', title: '', question: '', steps: [], text: '', findings: null, saved: null, message: '' };

/** Fold one event into the run state. */
export function reduceRun(state, ev) {
  if (!ev) return state;
  switch (ev.type) {
    case 'reset':
      return initialRun;
    case 'started':
      return { ...initialRun, status: 'running', title: ev.title, question: ev.question, steps: STEP_DEFS_ONLINE.map((s) => ({ ...s, state: 'pending', detail: '' })) };
    case 'progress':
      return { ...state, steps: reduceSteps(state.steps, { ...ev.payload, mode: 'online' }) };
    case 'final':
      return { ...state, status: 'answered', text: ev.text, findings: ev.findings, steps: state.steps.map((s) => ({ ...s, state: 'done' })) };
    case 'saved':
      return { ...state, saved: { path: ev.path, expiresAt: ev.expiresAt } };
    case 'unavailable':
      return { ...state, status: 'unavailable', message: ev.message };
    case 'error':
      return { ...state, status: 'error', message: ev.message };
    default:
      return state;
  }
}

/** The step list of a saved run: only the steps it recorded, all finished, with the counts it reported. */
export function stepsFromActivity(activity) {
  const list = Array.isArray(activity) ? activity.slice(0, 12) : [];
  let steps = null;
  for (const a of list) {
    if (a && typeof a === 'object') steps = reduceSteps(steps, { ...a, mode: 'online', state: a.state === 'running' ? 'done' : a.state });
  }
  const seen = new Set(list.map((a) => a?.step));
  return (steps || []).filter((s) => seen.has(s.id)).map((s) => ({ ...s, state: 'done' }));
}

/** The error to show for a refused request (rate limit, busy, unknown). */
export function explainCaseFailure(status, detail) {
  const d = detail && typeof detail === 'object' ? detail : {};
  if (status === 429) return { message: text(d.message, 240) || 'You have run the free cases for now.', signup: true };
  if (status === 503) return { message: text(d.message, 240) || 'Several people are running cases right now. Try again in a minute.', signup: false };
  if (status === 404) return { message: 'That case is not available.', signup: false };
  return { message: 'We could not reach AnalyzeIt just now. The service may be waking up: try again in a few seconds.', signup: false };
}
