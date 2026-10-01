export const LAYER_IDS: string[];
export const DAY_OPTIONS: number[];
export const DATA_VIEWS: string[];
export const PROJECTIONS: string[];
export const MAX_SCENE_PLACES: number;
export interface SceneInput {
  layers?: string[];
  days?: number;
  view?: string;
  projection?: string;
  places?: Array<{ name?: string; lat: number; lon: number }>;
  camera?: { lat: number; lng: number; zoom: number } | null;
}
export interface DecodedScene {
  layers: string[] | null;
  days: number | null;
  view: 'pins' | 'heat' | 'density' | 'bars' | null;
  projection: 'globe' | 'mercator' | null;
  places: Array<{ name: string; lat: number; lon: number }>;
  camera: { lat: number; lng: number; zoom: number } | null;
}
export function encodeScene(scene?: SceneInput): string;
export function decodeScene(search?: string): DecodedScene;
export function globeLinkForPlaces(places: Array<{ name?: string; lat: number; lon: number }>, layers?: string[]): string;
export function eventEpoch(p: unknown): number | null;
export function windowBounds(days: number, now?: number): { start: number; end: number };
export function cursorTime(frac: number, bounds: { start: number; end: number }): number;
export function filterByCursor<T extends object>(points: T[], cursorMs: number): T[];
export function recency(p: unknown, cursorMs: number, bounds: { start: number; end: number }): number;
export function formatCursor(ms: number, days: number): string;
