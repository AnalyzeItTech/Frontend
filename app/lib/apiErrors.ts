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
      message: String(rec.message || rec.detail || `Request failed (${status})`),
      upgradeRequired: Boolean(rec.upgrade_required) || status === 429,
      code: typeof rec.code === 'string' ? rec.code : undefined,
      tier: typeof rec.tier === 'string' ? rec.tier : undefined,
    };
  }
  if (typeof detail === 'string') {
    return {
      status,
      message: detail,
      upgradeRequired: status === 429,
    };
  }
  return {
    status,
    message: `Request failed (${status})`,
    upgradeRequired: status === 429,
  };
}
