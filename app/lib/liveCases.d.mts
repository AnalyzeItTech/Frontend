export interface LiveCase {
  slug: string;
  kind: 'currency' | 'weather' | 'unit';
  title: string;
  description: string;
  h1: string;
  subtitle: string;
  question: string;
  label: string;
  group: 'Currency' | 'Weather' | 'Units';
  sections: Array<{ h: string; p: string[] }>;
  also: string[];
  related: Array<{ slug: string; label: string }>;
}
export const LIVE_CASES_UPDATED: string;
export const LIVE_CASES: LiveCase[];
export const CASE_GROUP_ORDER: Array<LiveCase['group']>;
export function liveCase(slug: string): LiveCase | null;
