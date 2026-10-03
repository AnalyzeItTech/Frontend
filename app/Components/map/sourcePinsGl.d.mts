export function pinDiameter(point: { kind: string; tier?: string }): number;
export function isLayerKind(kind: string): boolean;
export function sourcePinFeatures(
  hubs: ReadonlyArray<{ name: string; lat: number; lon: number }>,
  points: ReadonlyArray<{ id: string; lat: number; lon: number; label: string; kind: string; tier?: string }>,
): GeoJSON.FeatureCollection;
export function selectedSourceId(
  selected: { lat: number; lon: number; name?: string } | null | undefined,
  activeHub: string | null | undefined,
  points: Array<{ id: string; lat: number; lon: number; label: string; kind: string }>,
): string | null;
