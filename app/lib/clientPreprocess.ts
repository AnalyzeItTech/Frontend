/**
 * Client-side (CSR) lightweight preprocessing.
 * Goal: shrink/shape payloads before they hit Backend A / Model APIs,
 * so SSR and A do less trivial work. API-only models — no local weights.
 *
 * See docs/client-preprocess-contract.md for the A-side contract.
 */

export type FrequencyMap = Record<string, number>;

const TOKEN_RE = /[A-Za-z0-9_'’-]+/g;

/** Numeric frequency encoding: token → occurrence count. */
export function buildFrequencyEncoding(
  text: string,
  opts: { maxTokens?: number; minLen?: number } = {},
): FrequencyMap {
  const maxTokens = opts.maxTokens ?? 256;
  const minLen = opts.minLen ?? 2;
  const counts: FrequencyMap = {};
  const matches = text.toLowerCase().match(TOKEN_RE) || [];
  for (const raw of matches) {
    const t = raw.trim();
    if (t.length < minLen) continue;
    counts[t] = (counts[t] || 0) + 1;
  }
  const ranked = Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, maxTokens);
  return Object.fromEntries(ranked);
}

export interface ChatTurn {
  role: 'user' | 'assistant' | 'system' | string;
  content: string;
}

export interface CompressedChatPayload {
  /** Recent turns kept verbatim (most recent last). */
  recent: ChatTurn[];
  /** Frequency encoding over older dropped turns (cheap long-context hint). */
  older_freq?: FrequencyMap;
  /** Character counts for observability / tier metering (client-computed). */
  stats: {
    original_chars: number;
    recent_chars: number;
    older_chars: number;
    older_unique_tokens: number;
  };
}

/**
 * Keep the last `keepRecent` turns intact; encode older text as frequencies
 * instead of resending full history (CSR load shed).
 */
export function compressMessagesForApi(
  messages: ChatTurn[],
  opts: { keepRecent?: number; maxTokens?: number } = {},
): CompressedChatPayload {
  const keepRecent = Math.max(1, opts.keepRecent ?? 6);
  const recent = messages.slice(-keepRecent);
  const older = messages.slice(0, Math.max(0, messages.length - keepRecent));
  const olderText = older.map((m) => m.content || '').join('\n');
  const older_freq = olderText
    ? buildFrequencyEncoding(olderText, { maxTokens: opts.maxTokens ?? 256 })
    : undefined;
  const original_chars = messages.reduce((n, m) => n + (m.content?.length || 0), 0);
  const recent_chars = recent.reduce((n, m) => n + (m.content?.length || 0), 0);
  const older_chars = older.reduce((n, m) => n + (m.content?.length || 0), 0);
  return {
    recent,
    older_freq,
    stats: {
      original_chars,
      recent_chars,
      older_chars,
      older_unique_tokens: older_freq ? Object.keys(older_freq).length : 0,
    },
  };
}

/** Light row cleanup before upload/query — client owns this, A should not redo. */
export function normalizeDatasetRows<T extends Record<string, unknown>>(
  rows: T[],
  opts: { dedupeKey?: keyof T; maxRows?: number } = {},
): T[] {
  const maxRows = opts.maxRows ?? 5000;
  let out = rows.filter((r) => r && typeof r === 'object');
  if (opts.dedupeKey) {
    const seen = new Set<unknown>();
    const key = opts.dedupeKey;
    out = out.filter((r) => {
      const v = r[key];
      if (v === undefined || v === null || v === '') return true;
      if (seen.has(v)) return false;
      seen.add(v);
      return true;
    });
  }
  if (out.length > maxRows) out = out.slice(0, maxRows);
  return out;
}

/**
 * Build optional client_context blob for chat POST (A may ignore until wired).
 * Prior turns only in history.recent — the live outbound message already goes
 * as body.message (+ message_freq). Do not double-append it here. Free context
 * retention (memory) is 10M; duplicating a large paste is still the wrong shape.
 */
export function buildChatClientContext(message: string, history: ChatTurn[] = []) {
  const compressed = compressMessagesForApi(history, { keepRecent: 6 });
  return {
    version: 1,
    source: 'csr-client-preprocess',
    message_freq: buildFrequencyEncoding(message),
    history: compressed,
  };
}
