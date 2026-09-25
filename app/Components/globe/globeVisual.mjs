/**
 * Globe view helpers: research-instrument basemap/atmosphere and layer-health
 * chrome. Labels still come from layerCountLabel — this module only adds
 * tone for styling. No live data.
 */
import { layerCountLabel } from './dataQuality.mjs';

/**
 * Full globe always uses the dark basemap so the page reads as research
 * tooling. The chat mini-globe follows the app theme.
 * @param {{ variant?: string, appTheme?: string }} [opts]
 * @returns {'dark' | 'streets'}
 */
export function globeBasemapTheme({ variant = 'full', appTheme = 'light' } = {}) {
  if (variant === 'full') return 'dark';
  return appTheme === 'dark' ? 'dark' : 'streets';
}

/** Dark limb, dim space, faint stars — not a bright consumer sky. */
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
 * @param {{ variant?: string, appTheme?: string }} [opts]
 */
export function globeAtmosphere({ variant = 'full', appTheme = 'light' } = {}) {
  if (variant === 'full') return researchAtmosphere();
  const mini = true;
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
  return {
    fog: {
      color: 'rgb(168, 204, 236)',
      'high-color': 'rgb(56, 118, 232)',
      'horizon-blend': mini ? 0.03 : 0.07,
      'space-color': 'rgb(8, 10, 26)',
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
