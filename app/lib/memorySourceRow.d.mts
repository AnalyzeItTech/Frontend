export function describeSource(row: {
  title?: string | null;
  kind_label?: string | null;
  kind?: string | null;
  tokens?: number;
  created_at?: string | null;
  pinned?: boolean;
}): { heading: string; detail: string };
