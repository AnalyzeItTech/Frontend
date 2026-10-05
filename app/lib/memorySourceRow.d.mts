export function describeSource(row: {
  title?: string | null;
  kind_label?: string | null;
  kind?: string | null;
  tokens?: number;
  created_at?: string | null;
  pinned?: boolean;
}): { heading: string; detail: string };
export function relativeTime(iso: string | null | undefined, now?: number): string;
export function usageLine(row: { cite_count?: number; last_cited_at?: string | null } | null | undefined, now?: number): string;
export function searchLine(level: string | null | undefined, state?: string | null): string;
