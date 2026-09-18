/** Plan-capped model size tiers (not Foundry deployment names). */
export type ModelSize = 'small' | 'medium' | 'large';

/** @deprecated use ModelSize */
export type ModelAccess = ModelSize;

export const MODEL_SIZE_ORDER: ModelSize[] = ['small', 'medium', 'large'];

export const MODEL_SIZE_LABELS: Record<ModelSize, string> = {
  small: 'Small (Fast)',
  medium: 'Medium (Standard)',
  large: 'Large (Advanced)',
};

/** Short labels for compact selects. */
export const MODEL_SIZE_SHORT_LABELS: Record<ModelSize, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
};

/** All sizes for picker UI (plan lock is enforced in the UI, not by hiding options). */
export function allModelSizes(): ModelSize[] {
  return [...MODEL_SIZE_ORDER];
}

export function modelSizeLocked(size: ModelSize, maxAllowed: ModelSize): boolean {
  return MODEL_SIZE_ORDER.indexOf(size) > MODEL_SIZE_ORDER.indexOf(maxAllowed);
}

/** Back-compat aliases for existing imports. */
export const MODEL_ACCESS_ORDER = MODEL_SIZE_ORDER;
export const MODEL_ACCESS_LABELS = MODEL_SIZE_LABELS;

const STORAGE_KEY = 'analyzeit.model_size';
const LEGACY_STORAGE_KEY = 'analyzeit.preferred_model_access';

export type ModelOption = {
  size: ModelSize;
  label: string;
  description?: string;
  deployment?: string;
  available?: boolean;
};

export function normalizeModelSize(value: unknown): ModelSize {
  const v = String(value || '').toLowerCase();
  if (v === 'medium' || v === 'large' || v === 'small') return v;
  if (v === 'fast') return 'small';
  if (v === 'standard') return 'medium';
  if (v === 'advanced') return 'large';
  return 'small';
}

/** @deprecated use normalizeModelSize */
export const normalizeModelAccess = normalizeModelSize;

/** Cap list from plan max (free→small, premium→medium, plus→large). */
export function allowedModelSizes(maxAllowed: ModelSize): ModelSize[] {
  const maxRank = MODEL_SIZE_ORDER.indexOf(maxAllowed);
  return MODEL_SIZE_ORDER.slice(0, Math.max(0, maxRank) + 1);
}

/** @deprecated use allowedModelSizes */
export const allowedModelAccessList = allowedModelSizes;

export function readStoredModelSize(): ModelSize | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ||
      window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    return normalizeModelSize(raw);
  } catch {
    return null;
  }
}

export function writeStoredModelSize(value: ModelSize): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}

/** @deprecated */
export const readStoredModelAccess = readStoredModelSize;
/** @deprecated */
export const writeStoredModelAccess = writeStoredModelSize;

/** Prefer stored if still allowed; else plan default (maxAllowed). */
export function resolveInitialModelSize(maxAllowed: ModelSize): ModelSize {
  const allowed = allowedModelSizes(maxAllowed);
  const stored = readStoredModelSize();
  if (stored && allowed.includes(stored)) return stored;
  return maxAllowed;
}

/** @deprecated */
export const resolveInitialModelAccess = resolveInitialModelSize;

export function optionsFromAllowlist(
  models: unknown,
  maxAllowed: ModelSize,
): ModelOption[] {
  const allowed = allowedModelSizes(maxAllowed);
  const rows = Array.isArray(models) ? models : [];
  const parsed: ModelOption[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const rec = row as Record<string, unknown>;
    const size = normalizeModelSize(rec.size ?? rec.id ?? rec.model_size);
    if (!allowed.includes(size)) continue;
    parsed.push({
      size,
      label: String(rec.label || MODEL_SIZE_LABELS[size]),
      description: typeof rec.description === 'string' ? rec.description : undefined,
      deployment: typeof rec.deployment === 'string' ? rec.deployment : undefined,
      available: rec.available !== false,
    });
  }
  if (parsed.length > 0) {
    // de-dupe by size, keep first
    const seen = new Set<string>();
    return parsed.filter((p) => (seen.has(p.size) ? false : (seen.add(p.size), true)));
  }
  return allowed.map((size) => ({ size, label: MODEL_SIZE_LABELS[size], available: true }));
}
