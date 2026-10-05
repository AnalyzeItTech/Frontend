// Homepage intro loader.
//
// The ring used to advance only when a client interval ran, and the first HTML
// paint was always 0% with no Skip control. The WebGL scene (three.js) starts
// on that same visit and does not emit THREE.DefaultLoadingManager progress:
// the crystal is procedural and the environment is a lightformer portal with no
// files/preset, so a gate waiting on a progress event stays at 0% forever.
// Dismissal is therefore a pure function of elapsed time, the last real scene
// progress, reduced motion, and an absolute cap — it fails open even if the
// scene never reports anything.

export const LOADER_DURATION_MS = 3200; // legacy curve; not used to dismiss the loader
export const LOADER_SKIP_AFTER_MS = 0; // Skip is part of the first loader paint (< 1s)
export const LOADER_STALL_MS = 3000; // stuck at 0%, or no progress event, for this long → skip
export const LOADER_MAX_MS = 8000; // absolute cap, even if progress is advancing

/** 0..100, easing out so it feels like loading and not a stopwatch. */
export function loaderProgress(elapsedMs) {
  const t = Math.min(1, Math.max(0, (Number(elapsedMs) || 0) / LOADER_DURATION_MS));
  return 100 * (1 - Math.pow(1 - t, 2.2));
}

export function loaderStatus(progress) {
  const value = Number(progress) || 0;
  if (value < 30) return 'CALIBRATING ATMOSPHERE';
  if (value < 60) return 'PREPARING ISLANDS';
  if (value < 90) return 'CONNECTING DATA FLOWS';
  return 'EXPERIENCE READY';
}

/** True once the loader has run too long and must give way. */
export function loaderExpired(elapsedMs) {
  return Number(elapsedMs) >= LOADER_MAX_MS;
}

/** Skip control is on screen once the loader has been up this long. */
export function skipVisible(elapsedMs) {
  const elapsed = Number(elapsedMs);
  if (!Number.isFinite(elapsed)) return false;
  return elapsed >= LOADER_SKIP_AFTER_MS;
}

/**
 * Whether the loader must dismiss.
 * `progress` is the last scene progress event (null when none has fired).
 * `positiveProgressSeen` is true once any event was greater than 0.
 * A value stuck at 0, or silence, dismisses at LOADER_STALL_MS.
 * Movement past 0 waits until the scene is ready or LOADER_MAX_MS.
 */
export function loaderShouldDismiss(state) {
  const input = state || {};
  if (input.reducedMotion || input.sceneReady) return true;
  const elapsed = Number(input.elapsedMs);
  if (!Number.isFinite(elapsed)) return false;
  if (elapsed >= LOADER_MAX_MS) return true;
  const numeric = input.progress == null || input.progress === '' ? null : Number(input.progress);
  const noEvent = numeric == null || !Number.isFinite(numeric);
  const positive = input.positiveProgressSeen || (!noEvent && numeric > 0);
  if (!positive && elapsed >= LOADER_STALL_MS) return true;
  return false;
}

/** Hash fragment without '#', or '' when there is nothing to scroll to. */
export function hashId(hash) {
  if (typeof hash !== 'string' || hash.length < 2 || hash[0] !== '#') return '';
  try {
    return decodeURIComponent(hash.slice(1));
  } catch {
    return '';
  }
}

/**
 * Fixed floating nav (~96px) + breathing room. Matches
 * scroll-mt-[calc(var(--nav-h,96px)+16px)] on landing sections.
 */
export const LANDING_NAV_OFFSET_PX = 112;

/** Window Y so a section's absolute top sits just under the fixed nav. */
export function landingHashScrollTop(absoluteTop, offsetPx = LANDING_NAV_OFFSET_PX) {
  const top = Number(absoluteTop);
  const offset = Number(offsetPx);
  if (!Number.isFinite(top)) return 0;
  const pad = Number.isFinite(offset) ? offset : LANDING_NAV_OFFSET_PX;
  return Math.max(0, top - pad);
}

/**
 * Inline boot script for the homepage. It runs from the server HTML, before the
 * client bundle hydrates, so Skip / reduced-motion / the 3s stall / the 8s cap
 * still fire when the scene chunk is slow to download or evaluate.
 */
export function loaderBootScript() {
  return `(function () {
    var STALL = ${LOADER_STALL_MS};
    var CAP = ${LOADER_MAX_MS};
    function shouldDismiss(elapsed, progress) {
      if (!(elapsed >= 0) || !isFinite(elapsed)) return '';
      if (elapsed >= CAP) return 'cap';
      var noEvent = progress == null || !isFinite(progress);
      var positive = !noEvent && progress > 0;
      if (!positive && elapsed >= STALL) return 'stall';
      return '';
    }
    function mark(reason) {
      window.__ANALYZIT_SCENE_SKIP__ = window.__ANALYZIT_SCENE_SKIP__ || reason;
      document.documentElement.classList.add('scene-skipped');
      if (document.documentElement.dataset) delete document.documentElement.dataset.sceneLoader;
      try { document.dispatchEvent(new Event('analyzit-scene-skip')); } catch (e) {}
    }
    function scrollHash() {
      // Best-effort only (pre-hydrate). React clears __ANALYZIT_HASH_SCROLLED__
      // on loader unlock and re-measures after layout settle so /#pricing lands
      // on the Free/Premium/VIP cards, not the footer.
      var hash = (location && location.hash) || '';
      if (!hash || hash.length < 2 || hash.charAt(0) !== '#') return;
      var id;
      try { id = decodeURIComponent(hash.slice(1)); } catch (e) { return; }
      var el = id && document.getElementById(id);
      if (!el) return;
      var abs = el.getBoundingClientRect().top + (window.pageYOffset || document.documentElement.scrollTop || 0);
      var top = Math.max(0, abs - ${LANDING_NAV_OFFSET_PX});
      window.scrollTo(0, top);
      window.__ANALYZIT_HASH_SCROLLED__ = id;
    }
    function dismiss(reason) {
      if (window.__ANALYZIT_SCENE_SKIP__) return;
      mark(reason);
      var loader = document.getElementById('v3d-loader');
      if (loader) loader.setAttribute('data-skipped', reason);
      var content = document.getElementById('landing-content');
      if (content && content.classList) {
        content.classList.remove('opacity-0', 'pointer-events-none');
        content.classList.add('opacity-100');
      }
      scrollHash();
    }
    function readProgress() {
      var el = document.getElementById('scene-loader-progress');
      if (!el || !el.getAttribute) return null;
      var raw = el.getAttribute('data-progress');
      if (raw == null || raw === '') return null;
      var n = Number(raw);
      return n;
    }
    function boot() {
      var loader = document.getElementById('v3d-loader');
      if (!loader || window.__ANALYZIT_LOADER_ARMED__) return;
      // Do not write attributes onto the React loader node here. That mismatched
      // hydration. A window flag is enough to arm the timers once.
      window.__ANALYZIT_LOADER_ARMED__ = 1;
      // Hold the page at the top while the overlay is up so a cold /#pricing
      // visit is not scrolled underneath Skip, then applied again later.
      try {
        if (window.history && 'scrollRestoration' in window.history) {
          window.history.scrollRestoration = 'manual';
        }
      } catch (e) {}
      window.scrollTo(0, 0);
      if (document.documentElement.dataset) document.documentElement.dataset.sceneLoader = '1';
      var started = Date.now();
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        dismiss('reduced-motion');
        return;
      }
      var btn = document.getElementById('scene-skip');
      if (btn && btn.addEventListener) btn.addEventListener('click', function () { dismiss('skip'); });
      document.addEventListener('keydown', function (e) {
        if (e && e.key === 'Escape') dismiss('skip');
      });
      function tick() {
        var reason = shouldDismiss(Date.now() - started, readProgress());
        if (reason) dismiss(reason);
      }
      setTimeout(tick, STALL);
      setTimeout(tick, CAP);
    }
    if (document.getElementById('v3d-loader')) boot();
    else document.addEventListener('DOMContentLoaded', boot);
  })();`;
}
