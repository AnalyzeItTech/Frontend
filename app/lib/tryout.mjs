// The try-out page: plain-words copy for its limits. The stream itself is read with parseDemoStream (demoChat.mjs).

export const TRYOUT_EXAMPLES = [
  { label: 'Is a sales spike real?', question: 'In general, how do I tell whether a one-week spike in a shop\'s sales is real or just random noise?' },
  { label: 'A/B test result', question: 'Explain what a p-value of 0.03 does and does not tell me about an A/B test.' },
  { label: 'Why conversion drops', question: 'What are the most common reasons a website conversion rate suddenly drops?' },
  { label: 'Practice datasets', question: 'Which free public datasets are good for practising business analysis, and what can I learn from each?' },
];

/** "about 23 hours", "about 40 minutes", "less than a minute". */
export function formatWait(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  if (s < 60) return 'less than a minute';
  if (s < 3600) {
    const m = Math.round(s / 60);
    return `about ${m} minute${m === 1 ? '' : 's'}`;
  }
  const h = Math.round(s / 3600);
  return `about ${h} hour${h === 1 ? '' : 's'}`;
}

export function runsLabel(remaining, limit) {
  if (!Number.isFinite(remaining) || !Number.isFinite(limit)) return '';
  if (remaining <= 0) return `All ${limit} try-out runs used`;
  return `${remaining} of ${limit} try-out ${remaining === 1 ? 'run' : 'runs'} left`;
}

/**
 * What to tell the visitor when a run did not start or did not finish.
 * @param {number} status HTTP status (0 for a network failure)
 * @param {any} detail parsed `detail` of the error body, if any
 */
export function explainTryoutFailure(status, detail) {
  const code = detail && typeof detail === 'object' ? detail.code : null;
  const message = detail && typeof detail === 'object' && typeof detail.message === 'string' ? detail.message : '';
  if (code === 'TRYOUT_LIMIT' || (status === 429 && detail && detail.retry_after_seconds)) {
    return { kind: 'limit', retryAfter: Number(detail.retry_after_seconds) || 0, message: `You have used all your try-out runs. Create a free account to keep going, or come back in ${formatWait(detail.retry_after_seconds)}.` };
  }
  if (code === 'TRYOUT_BUSY' && status === 429) return { kind: 'busy', message: message || 'One run at a time. Wait for the current answer.' };
  if (code === 'TRYOUT_BUSY') return { kind: 'full', message: message || 'Many people are trying it right now. Try again in a minute.' };
  if (code && String(code).startsWith('TRYOUT_') && status === 422) return { kind: 'input', message: message || 'That question cannot be used here.' };
  if (status === 0 || status === 502 || status === 503 || status === 504) {
    return { kind: 'unavailable', message: 'We could not reach AnalyzeIt just now. It may still be waking up: please try again in a few seconds.' };
  }
  return { kind: 'error', message: message || 'Something went wrong. Please try again.' };
}
