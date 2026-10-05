export const MAX_CITATIONS: number;
export interface MemoryCitation {
  key: string;
  label: string;
  excerpt: string;
  opened: boolean;
}
export function normalizeMemorySources(raw: unknown): MemoryCitation[];
