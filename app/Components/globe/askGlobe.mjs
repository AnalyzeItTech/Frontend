/**
 * Pure helpers for "Ask the globe": what the model is told about the current view, and the starter questions.
 * Kept free of React so Node's test runner can import it.
 */

import { globeAskPrompt } from './dataQuality.mjs';

const LAYER_LABELS = {
  earthquakes: 'Earthquakes',
  disasters: 'Disasters',
  wildfires: 'Wildfires',
  storms: 'Storms',
  volcanoes: 'Volcanoes',
  weather: 'Weather',
  air_quality: 'Air quality',
  markets: 'Markets',
  iss: 'Satellites',
  space_weather: 'Space weather',
  elevation: 'Elevation',
  my_data: 'My data',
};

const placeName = (p) => String(p?.name || '').trim() || `${Number(p?.lat).toFixed(2)}, ${Number(p?.lon).toFixed(2)}`;

/** Layers that are on and actually have something on the map, with counts. */
export function activeLayerSummary(layers, layerCounts) {
  const out = [];
  for (const [id, label] of Object.entries(LAYER_LABELS)) {
    if (!layers?.[id]) continue;
    const n = Number(layerCounts?.[id]);
    if (Number.isFinite(n) && n > 0) out.push({ id, label, count: n });
  }
  return out;
}

/**
 * The full message sent to the agent: the user's question, the pinned places, and a short factual
 * description of the view so "what's happening here?" is answerable without the user re-typing it.
 */
export function globeAskMessage(question, state = {}) {
  const places = [];
  if (state.selected) places.push(state.selected);
  for (const p of state.compare || []) {
    if (!places.some((q) => q.lat === p.lat && q.lon === p.lon)) places.push(p);
  }
  const base = globeAskPrompt(String(question || '').trim() || 'What should I look at on this globe?', places);
  const layers = activeLayerSummary(state.layers, state.layerCounts);
  const lines = [];
  if (layers.length) {
    lines.push(`Layers on the map: ${layers.map((l) => `${l.label} (${l.count})`).join(', ')}, last ${state.days || 7} days.`);
  }
  if (state.layers?.my_data && layers.some((l) => l.id === 'my_data')) {
    lines.push("'My data' pins are the user's own project records.");
  }
  lines.push('Name the specific places your answer is about so the globe can fly to them.');
  return `${base}\n\n[Globe view] ${lines.join(' ')}`;
}

/** Starter questions that fit what is selected and which layers are showing. Max 4. */
export function askSuggestions(state = {}) {
  const out = [];
  const sel = state.selected ? placeName(state.selected) : null;
  const cmp = (state.compare || []).map(placeName);
  if (cmp.length >= 2) out.push(`Compare ${cmp.slice(0, 3).join(' and ')}: risks, economy, what to watch.`);
  if (sel) out.push(`What is happening in ${sel} right now?`);
  const on = activeLayerSummary(state.layers, state.layerCounts);
  const has = (id) => on.some((l) => l.id === id);
  if (has('earthquakes')) out.push('Which of the earthquakes shown matter most, and why?');
  if (has('wildfires') || has('storms') || has('disasters')) out.push('Where is the most serious hazard on the map right now?');
  if (has('my_data')) out.push('Which of my places are exposed to the hazards on the map?');
  if (has('markets')) out.push('Which markets are moving the most today?');
  if (!out.length) out.push('What is the most important thing on the globe today?', 'Where should I look first?');
  return [...new Set(out)].slice(0, 4);
}

/** Cap a streamed answer so a runaway response cannot freeze the panel. */
export function clampAnswer(text, max = 6000) {
  const t = String(text || '');
  return t.length > max ? `${t.slice(0, max)}…` : t;
}
