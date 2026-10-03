export const MAX_LAYOUT_WIDGETS: number;
export function kitWidgets(projectId: string, created: Array<{ api_name: string; label: string }>): Array<Record<string, any>>;
export function mergeKitWidgets(
  existing: Array<Record<string, any>>,
  added: Array<Record<string, any>>,
  max?: number,
): { widgets: Array<Record<string, any>>; dropped: number };
export function askHref(projectId: string | undefined, prompt: string): string;
export function kitSummary(kit: { objects: Array<{ sample_rows: number; label: string }> }): string;
