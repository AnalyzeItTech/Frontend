/** Plan-capped model size tiers (not Foundry deployment names). */
export type ModelAccess = 'small' | 'medium' | 'large';

export const MODEL_ACCESS_ORDER: ModelAccess[] = ['small', 'medium', 'large'];

export const MODEL_ACCESS_LABELS: Record<ModelAccess, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
};

const STORAGE_KEY = 'analyzeit.preferred_model_access';

export function normalizeModelAccess(value: unknown): ModelAccess {
  const v = String(value || '').toLowerCase();
  if (v === 'medium' || v === 'large' || v === 'small') return v;
  return 'small';
}

/** Cap list: free→small only; premium→small+medium; premium+→all. */
export function allowedModelAccessList(maxAllowed: ModelAccess): ModelAccess[] {
  const maxRank = MODEL_ACCESS_ORDER.indexOf(maxAllowed);
  return MODEL_ACCESS_ORDER.slice(0, Math.max(0, maxRank) + 1);
}

export function readStoredModelAccess(): ModelAccess | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeModelAccess(raw);
  } catch {
    return null;
  }
}

export function writeStoredModelAccess(value: ModelAccess): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* ignore quota / private mode */
  }
}

/** Prefer stored if still allowed; else plan default (maxAllowed). */
export function resolveInitialModelAccess(maxAllowed: ModelAccess): ModelAccess {
  const allowed = allowedModelAccessList(maxAllowed);
  const stored = readStoredModelAccess();
  if (stored && allowed.includes(stored)) return stored;
  return maxAllowed;
}
