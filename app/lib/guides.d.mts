export type GuideBlock = { p?: string; h2?: string; ul?: string[]; ol?: string[] };
export interface Guide {
  slug: string;
  title: string;
  description: string;
  published: string;
  blocks: GuideBlock[];
  cta: { href: string; label: string };
}
export const GUIDES_UPDATED: string;
export const GUIDES: Guide[];
export function guide(slug: string): Guide | null;
export function wordCount(g: Guide): number;
export function readMinutes(g: Guide): number;
