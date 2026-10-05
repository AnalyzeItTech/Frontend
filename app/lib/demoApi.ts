import { parseDemoStream, type DemoResult } from './demoChat.mjs';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export class DemoFailure extends Error {
  status: number;
  detail: unknown;
  constructor(status: number, detail: unknown) {
    super('demo request failed');
    this.status = status;
    this.detail = detail;
  }
}

/** Ask one question with no account. Tool answers only: anything else comes back as a plain "needs an account" failure. */
export async function askDemo(question: string, signal?: AbortSignal): Promise<DemoResult> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/v1/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: question, incognito: true }),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new DemoFailure(0, null);
  }
  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => null);
    throw new DemoFailure(res.status, body && typeof body === 'object' && 'detail' in body ? (body as { detail: unknown }).detail : body);
  }
  const events: Array<{ event?: string; payload?: Record<string, unknown> }> = [];
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        events.push(JSON.parse(line));
      } catch {
        // a partial or non-JSON line is ignored
      }
    }
  }
  return parseDemoStream(events);
}

export async function getGuestStatus(): Promise<{ limit: number; remaining: number } | null> {
  try {
    const res = await fetch(`${API_BASE}/v1/guest/status`);
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.limit === 'number' && typeof data.remaining === 'number' ? data : null;
  } catch {
    return null;
  }
}
