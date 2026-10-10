import { parseDemoStream, type DemoResult } from './demoChat.mjs';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const DEVICE_KEY = 'analyzeit_tryout_device';

export class TryoutFailure extends Error {
  status: number;
  detail: unknown;
  constructor(status: number, detail: unknown) {
    super('try-out request failed');
    this.status = status;
    this.detail = detail;
  }
}

export type TryoutStatus = { available: boolean; limit: number; remaining: number; cooldown_hours: number; retry_after_seconds: number };

/** A random id for this browser, so changing network alone does not give more runs. Missing storage just means the address limit alone applies. */
function deviceId(): string {
  try {
    let id = window.localStorage.getItem(DEVICE_KEY);
    if (!id || !/^[A-Za-z0-9_-]{16,64}$/.test(id)) {
      const bytes = new Uint8Array(18);
      window.crypto.getRandomValues(bytes);
      id = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
      window.localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return '';
  }
}

function headers(): Record<string, string> {
  const id = deviceId();
  return id ? { 'X-Tryout-Device': id } : {};
}

export async function getTryoutStatus(): Promise<TryoutStatus | null> {
  try {
    const res = await fetch(`${API_BASE}/v1/tryout/status`, { headers: headers() });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.limit === 'number' && typeof data.remaining === 'number' ? data : null;
  } catch {
    return null;
  }
}

/** Ask one question with no account. Reads the stream to its end and returns the answer. */
export async function askTryout(question: string, signal?: AbortSignal): Promise<DemoResult> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/v1/tryout/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers() },
      body: JSON.stringify({ message: question }),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new TryoutFailure(0, null);
  }
  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => null);
    throw new TryoutFailure(res.status, body && typeof body === 'object' && 'detail' in body ? (body as { detail: unknown }).detail : body);
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
