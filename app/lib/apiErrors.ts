export type ApiFailure = {
  status: number;
  message: string;
  upgradeRequired: boolean;
  code?: string;
  tier?: string;
};

export class ChatRequestError extends Error {
  status: number;
  upgradeRequired: boolean;
  code?: string;
  tier?: string;

  constructor(failure: ApiFailure) {
    super(failure.message);
    this.name = 'ChatRequestError';
    this.status = failure.status;
    this.upgradeRequired = failure.upgradeRequired;
    this.code = failure.code;
    this.tier = failure.tier;
  }
}

export function parseApiFailure(status: number, body: unknown): ApiFailure {
  const detail =
    body && typeof body === 'object' && 'detail' in body
      ? (body as { detail: unknown }).detail
      : body;
  if (detail && typeof detail === 'object') {
    const rec = detail as Record<string, unknown>;
    return {
      status,
      message: friendlyHttpMessage(
        status,
        String(rec.message || rec.detail || 'Request failed'),
      ),
      upgradeRequired: Boolean(rec.upgrade_required) || status === 429,
      code: typeof rec.code === 'string' ? rec.code : undefined,
      tier: typeof rec.tier === 'string' ? rec.tier : undefined,
    };
  }
  if (typeof detail === 'string') {
    return {
      status,
      message: friendlyHttpMessage(status, detail),
      upgradeRequired: status === 429,
    };
  }
  return {
    status,
    message: friendlyHttpMessage(status, 'Request failed'),
    upgradeRequired: status === 429,
  };
}

export function friendlyHttpMessage(status: number, fallback: string): string {
  if (status === 401) return 'Please sign in to continue.';
  if (status === 403) return 'You do not have access to this workspace.';
  if (status === 404) return 'Nothing was found for this request.';
  if (status === 409) return 'This changed in another session. Refresh and try again.';
  if (status === 429) return 'You have reached today’s limit. Try again later or upgrade.';
  if (status >= 500) return 'The service is unavailable right now. Try again in a moment.';
  return fallback;
}

export function redactClientError(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : fallback;
  if (/\b(401|403|404|409|429|500|502|503)\b/.test(raw) || /failed to fetch/i.test(raw)) {
    return fallback;
  }
  return raw || fallback;
}
