import assert from 'node:assert/strict';
import vm from 'node:vm';
import { describe, it } from 'node:test';

import {
  LANDING_NAV_OFFSET_PX,
  LOADER_DURATION_MS,
  LOADER_MAX_MS,
  LOADER_SKIP_AFTER_MS,
  LOADER_STALL_MS,
  hashId,
  landingHashScrollTop,
  loaderBootScript,
  loaderExpired,
  loaderProgress,
  loaderShouldDismiss,
  loaderStatus,
  skipVisible,
} from './loaderProgress.mjs';

describe('loaderProgress', () => {
  it('starts at 0 and reaches exactly 100', () => {
    assert.equal(loaderProgress(0), 0);
    assert.equal(loaderProgress(LOADER_DURATION_MS), 100);
    assert.equal(loaderProgress(LOADER_DURATION_MS * 5), 100);
  });
  it('only ever goes up', () => {
    let last = -1;
    for (let t = 0; t <= LOADER_DURATION_MS; t += 100) {
      const p = loaderProgress(t);
      assert.ok(p >= last, `${t}`);
      last = p;
    }
  });
  it('catches up after a stall: one long gap lands where continuous ticking would have', () => {
    assert.equal(loaderProgress(2900), loaderProgress(2900)); // a function of time, not of how many ticks ran
    assert.ok(loaderProgress(2900) > 90);
  });
  it('tolerates junk', () => {
    for (const bad of [undefined, null, NaN, -50, 'x']) assert.equal(loaderProgress(bad), 0);
  });
});

describe('the loader can never trap a visitor', () => {
  it('expires, and offers Skip long before that', () => {
    assert.equal(loaderExpired(LOADER_MAX_MS - 1), false);
    assert.equal(loaderExpired(LOADER_MAX_MS), true);
    assert.ok(LOADER_SKIP_AFTER_MS < LOADER_MAX_MS / 2);
    assert.equal(skipVisible(LOADER_SKIP_AFTER_MS - 1), false);
    assert.equal(skipVisible(LOADER_SKIP_AFTER_MS), true);
    assert.ok(LOADER_MAX_MS <= 8000);
  });
  it('labels the stages', () => {
    assert.equal(loaderStatus(0), 'CALIBRATING ATMOSPHERE');
    assert.equal(loaderStatus(45), 'PREPARING ISLANDS');
    assert.equal(loaderStatus(75), 'CONNECTING DATA FLOWS');
    assert.equal(loaderStatus(100), 'EXPERIENCE READY');
  });
  it('shows Skip within a second of the loader appearing', () => {
    assert.ok(LOADER_SKIP_AFTER_MS <= 1000);
    assert.equal(skipVisible(0), true);
    assert.equal(skipVisible(1000), true);
  });
});

describe('loader fail-open timing', () => {
  it('skips immediately when the visitor prefers reduced motion', () => {
    assert.equal(loaderShouldDismiss({ elapsedMs: 0, progress: null, reducedMotion: true }), true);
    assert.equal(loaderShouldDismiss({ elapsedMs: 0, progress: 0, reducedMotion: true }), true);
  });

  it('auto-skips when progress stays at 0% or never arrives for 3s', () => {
    assert.equal(LOADER_STALL_MS, 3000);
    for (const progress of [null, 0]) {
      assert.equal(loaderShouldDismiss({ elapsedMs: 2999, progress }), false, String(progress));
      assert.equal(loaderShouldDismiss({ elapsedMs: 3000, progress }), true, String(progress));
    }
  });

  it('does not treat a moving scene as a stall, and still caps it at 8s', () => {
    assert.equal(LOADER_MAX_MS, 8000);
    assert.equal(loaderShouldDismiss({ elapsedMs: 3000, progress: 12 }), false);
    assert.equal(loaderShouldDismiss({ elapsedMs: 7999, progress: 40, positiveProgressSeen: true }), false);
    assert.equal(loaderShouldDismiss({ elapsedMs: 8000, progress: 40, positiveProgressSeen: true }), true);
    assert.equal(loaderExpired(7999), false);
    assert.equal(loaderExpired(8000), true);
  });

  it('dismisses as soon as the scene is actually ready', () => {
    assert.equal(loaderShouldDismiss({ elapsedMs: 200, progress: 100, sceneReady: true }), true);
  });

  it('ignores junk clocks unless reduced motion or readiness already decided', () => {
    assert.equal(loaderShouldDismiss({ elapsedMs: Number.NaN, progress: null }), false);
    assert.equal(loaderShouldDismiss(null), false);
  });
});

describe('hash targets after a skip', () => {
  it('reads in-page ids and ignores empty hashes', () => {
    assert.equal(hashId('#pricing'), 'pricing');
    assert.equal(hashId('#how-it-works'), 'how-it-works');
    assert.equal(hashId(''), '');
    assert.equal(hashId('#'), '');
    assert.equal(hashId('pricing'), '');
  });

  it('places the section under the fixed nav, never above the page', () => {
    assert.equal(LANDING_NAV_OFFSET_PX, 112);
    assert.equal(landingHashScrollTop(2000), 2000 - 112);
    assert.equal(landingHashScrollTop(50), 0);
    assert.equal(landingHashScrollTop(112), 0);
    assert.equal(landingHashScrollTop(Number.NaN), 0);
  });
});

describe('loader boot script', () => {
  function boot(options = {}) {
    const timers = [];
    const contentClasses = new Set(['opacity-0', 'pointer-events-none']);
    const htmlClasses = new Set();
    const scrolled = [];
    const windowScrolls = [];
    const clicks = [];
    const keys = [];
    const attrs = { 'data-progress': options.progress ?? '0' };
    const loaderAttrs = {};
    const html = {
      classList: { add(name) { htmlClasses.add(name); } },
      dataset: {},
      scrollTop: 0,
    };
    const pricingTop = options.pricingTop ?? 2000;
    const document = {
      documentElement: html,
      getElementById(id) {
        if (id === 'v3d-loader') {
          return {
            getAttribute: (name) => (name in loaderAttrs ? loaderAttrs[name] : null),
            setAttribute: (name, value) => { loaderAttrs[name] = String(value); },
          };
        }
        if (id === 'scene-skip') return { addEventListener: (_type, fn) => clicks.push(fn) };
        if (id === 'scene-loader-progress') {
          return { getAttribute: (name) => (name in attrs ? attrs[name] : null) };
        }
        if (id === 'landing-content') {
          return {
            classList: {
              remove(...names) { names.forEach((name) => contentClasses.delete(name)); },
              add(...names) { names.forEach((name) => contentClasses.add(name)); },
            },
          };
        }
        if (id === 'pricing') {
          return {
            getBoundingClientRect: () => ({ top: pricingTop - (sandbox.window.pageYOffset || 0) }),
            scrollIntoView: (opts) => scrolled.push(opts),
          };
        }
        return null;
      },
      addEventListener(type, fn) { if (type === 'keydown') keys.push(fn); },
    };
    const sandbox = {
      document,
      location: { hash: options.hash ?? '' },
      decodeURIComponent,
      isFinite,
      Number,
      Math,
      timers,
      now: 5_000,
      Date: { now() { return sandbox.now; } },
      setTimeout(fn, ms) { timers.push({ fn, ms }); return timers.length; },
      window: {
        document,
        pageYOffset: 0,
        history: { scrollRestoration: 'auto' },
        matchMedia: () => ({ matches: Boolean(options.reduced) }),
        scrollTo(...args) {
          windowScrolls.push(args);
          if (typeof args[0] === 'number') sandbox.window.pageYOffset = args[1] ?? args[0];
          else if (args[0] && typeof args[0] === 'object') sandbox.window.pageYOffset = args[0].top ?? 0;
        },
      },
    };
    // Boot script calls window.scrollTo and also bare scrollTo in some engines — mirror it.
    sandbox.scrollTo = (...args) => sandbox.window.scrollTo(...args);
    vm.runInNewContext(loaderBootScript(), sandbox);
    return { sandbox, timers, contentClasses, htmlClasses, scrolled, windowScrolls, clicks, keys, loaderAttrs, html };
  }

  it('skips reduced-motion visitors before any timer', () => {
    const env = boot({ reduced: true, hash: '#pricing', pricingTop: 2000 });
    assert.equal(env.sandbox.window.__ANALYZIT_SCENE_SKIP__, 'reduced-motion');
    assert.equal(env.timers.length, 0);
    assert.equal(env.htmlClasses.has('scene-skipped'), true);
    assert.equal('sceneLoader' in env.html.dataset, false);
    assert.equal(env.contentClasses.has('opacity-0'), false);
    assert.equal(env.contentClasses.has('opacity-100'), true);
    // Offset-aware window.scrollTo — pricing cards sit under the fixed nav.
    assert.ok(env.windowScrolls.length >= 1);
    const last = env.windowScrolls[env.windowScrolls.length - 1];
    assert.deepEqual(last, [0, 2000 - LANDING_NAV_OFFSET_PX]);
    assert.equal(env.sandbox.window.__ANALYZIT_HASH_SCROLLED__, 'pricing');
  });

  it('arms a 3s stall and an 8s cap, and Skip works immediately', () => {
    const env = boot({ hash: '#pricing', pricingTop: 1800 });
    assert.deepEqual(env.timers.map((timer) => timer.ms).sort((a, b) => a - b), [LOADER_STALL_MS, LOADER_MAX_MS]);
    assert.equal(env.sandbox.window.__ANALYZIT_LOADER_ARMED__, 1);
    assert.equal(env.loaderAttrs['data-armed'], undefined);
    // While armed, the page is pinned at the top (no /#pricing under the overlay).
    assert.equal(env.html.dataset.sceneLoader, '1');
    assert.equal(env.sandbox.window.history.scrollRestoration, 'manual');
    env.clicks[0]();
    assert.equal(env.sandbox.window.__ANALYZIT_SCENE_SKIP__, 'skip');
    assert.equal(env.contentClasses.has('pointer-events-none'), false);
    const last = env.windowScrolls[env.windowScrolls.length - 1];
    assert.deepEqual(last, [0, 1800 - LANDING_NAV_OFFSET_PX]);
    assert.equal(env.sandbox.window.__ANALYZIT_HASH_SCROLLED__, 'pricing');
  });

  it('auto-skips a 0% stall at 3s and still force-opens a slow scene at 8s', () => {
    const stalled = boot({ progress: '0' });
    stalled.sandbox.now += LOADER_STALL_MS;
    stalled.timers.find((timer) => timer.ms === LOADER_STALL_MS).fn();
    assert.equal(stalled.sandbox.window.__ANALYZIT_SCENE_SKIP__, 'stall');

    const moving = boot({ progress: '12' });
    moving.sandbox.now += LOADER_STALL_MS;
    moving.timers.find((timer) => timer.ms === LOADER_STALL_MS).fn();
    assert.equal(moving.sandbox.window.__ANALYZIT_SCENE_SKIP__, undefined);
    moving.sandbox.now += LOADER_MAX_MS - LOADER_STALL_MS;
    moving.timers.find((timer) => timer.ms === LOADER_MAX_MS).fn();
    assert.equal(moving.sandbox.window.__ANALYZIT_SCENE_SKIP__, 'cap');
  });
});
