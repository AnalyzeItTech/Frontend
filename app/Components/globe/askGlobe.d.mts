export interface AskState {
  selected?: { lat: number; lon: number; name?: string; country?: string } | null;
  compare?: Array<{ lat: number; lon: number; name?: string; country?: string }>;
  layers?: Record<string, boolean>;
  layerCounts?: Record<string, number | undefined>;
  days?: number;
}
export function activeLayerSummary(
  layers: Record<string, boolean> | undefined,
  layerCounts: Record<string, number | undefined> | undefined,
): Array<{ id: string; label: string; count: number }>;
export function globeAskMessage(question: string, state?: AskState): string;
export function askSuggestions(state?: AskState): string[];
export function clampAnswer(text: string, max?: number): string;
