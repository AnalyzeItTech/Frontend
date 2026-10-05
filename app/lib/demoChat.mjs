// The public demo: parsing the stream and explaining failures in plain words. No login, tool answers only.

export const DEMO_EXAMPLES = [
  { label: 'Weather in Mumbai', question: 'What is the weather in Mumbai right now?' },
  { label: 'USD to INR', question: 'Convert 100 USD to INR' },
  { label: 'AAPL stock price', question: 'What is the stock price of AAPL?' },
  { label: '18% of 2,450', question: 'Calculate 18% of 2450' },
];

const TOOL_LABELS = {
  weather_lookup: 'weather',
  weather_fetch: 'weather',
  stock_lookup: 'stock quote',
  currency_converter: 'currency converter',
  calculator: 'calculator',
  unit_converter: 'unit converter',
  datetime_math: 'date math',
  economic_data: 'economic data',
};

export function toolLabel(name) {
  const key = String(name || '').trim();
  return TOOL_LABELS[key] || key.replace(/_/g, ' ');
}

/** `zero_token_tool:<name>` is the only success route; `zero_token_tool_failed:` must never look like success. */
export function zeroTokenToolFromRoute(route) {
  if (typeof route !== 'string' || route.startsWith('zero_token_tool_failed')) return null;
  const m = /^zero_token_tool:([a-z0-9_]+)$/i.exec(route.trim());
  return m ? m[1] : null;
}

/**
 * Fold the stream's events into what the page shows.
 * @param {Array<{ event?: string, payload?: Record<string, any> }>} events
 */
export function parseDemoStream(events) {
  const out = { answer: '', zeroTool: null, sources: [], error: null, failedTool: null };
  for (const e of events || []) {
    const p = e?.payload || {};
    if (e?.event === 'route_decision') {
      const t = zeroTokenToolFromRoute(p.route) || zeroTokenToolFromRoute(p.reason);
      if (t) out.zeroTool = t;
      if (typeof p.reason === 'string' && p.reason.startsWith('zero_token_tool_failed')) out.failedTool = p.reason.split(':')[1] || 'tool';
    } else if (e?.event === 'tool_result' && p.ok === false) {
      out.failedTool = p.tool || out.failedTool || 'tool';
      out.zeroTool = null; // a failed tool never gets the success badge
    } else if (e?.event === 'error') {
      out.error = { code: p.code || null, message: typeof p.message === 'string' ? p.message : '' };
    } else if (e?.event === 'final') {
      const text = typeof p.text === 'string' ? p.text : Array.isArray(p.text) ? p.text.map((x) => (typeof x === 'string' ? x : x?.text || '')).join('') : '';
      out.answer = text.trim() || out.answer;
      if (Array.isArray(p.sources)) {
        out.sources = p.sources.filter((s) => s && (s.url || s.host)).slice(0, 6).map((s) => ({ host: s.host || '', url: s.url || '', title: s.title || '', verified: Boolean(s.verified) }));
      }
      if (p.usage && p.usage.zero_token === true && !out.zeroTool && !out.failedTool) out.zeroTool = out.zeroTool || 'tool';
    }
  }
  return out;
}

/**
 * What to tell the visitor when the request did not produce an answer.
 * @param {number} status HTTP status (0 for a network failure)
 * @param {any} detail parsed `detail` of the error body, if any
 */
export function explainDemoFailure(status, detail) {
  const code = detail && typeof detail === 'object' ? detail.code : null;
  if (code === 'GUEST_TRIES_USED' || status === 429) {
    return { kind: 'limit', message: 'You have used today’s free tries. Create a free account to keep going: it takes a minute and there are no model charges for tool answers.' };
  }
  if (code === 'AUTH_REQUIRED' || status === 401) {
    return { kind: 'needs_account', message: 'That question needs an account. Try a weather, currency, stock or math question first, or create a free account for everything else.' };
  }
  if (status === 0 || status === 502 || status === 503 || status === 504) {
    return { kind: 'unavailable', message: 'We could not reach AnalyzeIt just now. The service may still be waking up: please try again in a few seconds.' };
  }
  return { kind: 'error', message: (detail && typeof detail === 'object' && detail.message) || 'Something went wrong. Please try again.' };
}

export function triesLabel(remaining, limit) {
  if (!Number.isFinite(remaining) || !Number.isFinite(limit)) return '';
  if (remaining <= 0) return 'No free tries left today';
  return `${remaining} of ${limit} free ${remaining === 1 ? 'try' : 'tries'} left today`;
}
