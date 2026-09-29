/**
 * Globe view helpers: theme-aware basemap/atmosphere and layer-health chrome.
 * Labels still come from layerCountLabel — this module only adds tone for
 * styling. No live data.
 *
 * The full page follows the app theme. Dark keeps the research night stage.
 * The chat mini-globe follows the app theme for tiles and its own atmosphere.
 */
import { layerCountLabel } from './dataQuality.mjs';

/** Page/canvas background for a light full globe. Matches `--bg` in light mode. */
export const LIGHT_STAGE_BG = 'var(--bg)';
/** Near-black research stage. Full globe, dark theme only. */
export const RESEARCH_STAGE_BG = '#07090c';
/** WebGL space behind a light full globe — same cream as the light page. */
export const LIGHT_SPACE_COLOR = 'rgb(245, 238, 229)';

/**
 * Streets tiles in light theme, dark tiles in dark theme.
 * Both the full page and the chat mini-globe follow `appTheme`.
 * @param {{ variant?: string, appTheme?: string }} [opts]
 * @returns {'dark' | 'streets'}
 */
export function globeBasemapTheme({ variant = 'full', appTheme = 'light' } = {}) {
  void variant;
  return appTheme === 'dark' ? 'dark' : 'streets';
}

/** Dark limb, dim space, faint stars — the full globe in the dark theme. */
export function researchAtmosphere() {
  return {
    fog: {
      color: 'rgb(16, 20, 26)',
      'high-color': 'rgb(46, 60, 76)',
      'horizon-blend': 0.16,
      'space-color': 'rgb(5, 7, 10)',
      'star-intensity': 0.16,
      range: [0.45, 10],
    },
    light: {
      anchor: 'viewport',
      color: '#c5ced6',
      intensity: 0.3,
      position: [1.15, 200, 30],
    },
  };
}

/**
 * Light limb (blue rim, no steel, no stars). The full page uses a light
 * stage; the mini globe keeps its existing space color.
 * @param {{ mini?: boolean }} [opts]
 */
export function lightAtmosphere({ mini = false } = {}) {
  return {
    fog: {
      color: 'rgb(168, 204, 236)',
      'high-color': 'rgb(56, 118, 232)',
      'horizon-blend': mini ? 0.03 : 0.07,
      'space-color': mini ? 'rgb(8, 10, 26)' : LIGHT_SPACE_COLOR,
      'star-intensity': 0,
      range: [0.6, 10],
    },
    light: {
      anchor: 'viewport',
      color: '#fff4e8',
      intensity: 0.55,
      position: [1.3, 210, 35],
    },
  };
}

/**
 * @param {{ variant?: string, appTheme?: string }} [opts]
 */
export function globeAtmosphere({ variant = 'full', appTheme = 'light' } = {}) {
  const mini = variant === 'mini';
  if (!mini && appTheme === 'dark') return researchAtmosphere();
  if (appTheme === 'dark') {
    return {
      fog: {
        color: 'rgb(18, 28, 52)',
        'high-color': 'rgb(64, 110, 210)',
        'horizon-blend': mini ? 0.04 : 0.09,
        'space-color': 'rgb(3, 5, 14)',
        'star-intensity': 0,
        range: [0.5, 12],
      },
      light: {
        anchor: 'viewport',
        color: '#c8d4ea',
        intensity: 0.42,
        position: [1.3, 210, 35],
      },
    };
  }
  return lightAtmosphere({ mini });
}

/**
 * Stage chrome. Research night styles apply only to the full globe in dark theme.
 * @param {{ variant?: string, appTheme?: string }} [opts]
 * @returns {{
 *   research: boolean,
 *   background: string,
 *   pageClass: string,
 *   canvasClass: string,
 * }}
 */
export function globeStage({ variant = 'full', appTheme = 'light' } = {}) {
  const research = variant === 'full' && appTheme === 'dark';
  if (variant !== 'full') {
    return {
      research: false,
      background: LIGHT_STAGE_BG,
      pageClass: '',
      canvasClass: '',
    };
  }
  if (research) {
    return {
      research: true,
      background: RESEARCH_STAGE_BG,
      pageClass: 'globe-page-stage globe-page-stage--research',
      canvasClass: 'globe-map-canvas--research',
    };
  }
  return {
    research: false,
    background: LIGHT_STAGE_BG,
    pageClass: 'globe-page-stage globe-page-stage--light',
    canvasClass: 'globe-map-canvas--light',
  };
}

/**
 * Legend / toggle badge. Copy matches layerCountLabel exactly.
 * @param {number} count
 * @param {{ status?: string, message?: string | null } | null | undefined} health
 * @returns {{ label: string, tone: 'unavailable' | 'stale' | 'loading' | 'zero' | 'count' }}
 */
export function layerHealthView(count, health) {
  const label = layerCountLabel(count, health);
  const status = health?.status;
  let tone = 'count';
  if (label === 'unavailable' || status === 'error') tone = 'unavailable';
  else if (status === 'stale' || (typeof label === 'string' && label.endsWith(' stale'))) tone = 'stale';
  else if (status === 'loading' || label === '…') tone = 'loading';
  else if ((Number(count) || 0) === 0) tone = 'zero';
  return { label, tone };
}
