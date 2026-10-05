/**
 * App nav contract: logo always home, authenticated shell mounts AppNav.
 * Marketing home keeps its own floating pill.
 * Run: node --test app/Components/app/appNav.test.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  APP_NAV_LINKS,
  LOGO_HREF,
  MARKETING_SECTION_LINKS,
  isAppLinkActive,
  resolveActiveNav,
} from './appNavConfig.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('shared app nav contract', () => {
  it('sends the brand mark to Home', () => {
    assert.equal(LOGO_HREF, '/');
    const home = APP_NAV_LINKS.find((link) => link.id === 'home');
    assert.ok(home);
    assert.equal(home.href, '/');
    assert.equal(home.label, 'Home');
  });

  it('keeps marketing sections and app routes as separate link sets', () => {
    const marketingIds = MARKETING_SECTION_LINKS.map((link) => link.id);
    assert.deepEqual(marketingIds, [
      'capabilities',
      'how-it-works',
      'comparison',
      'pricing',
      'faq',
    ]);
    assert.equal(APP_NAV_LINKS.some((link) => link.href === '/dashboard'), true);
    assert.equal(MARKETING_SECTION_LINKS.some((link) => link.id === 'dashboard'), false);
  });

  it('surfaces Memory in authenticated app chrome', () => {
    const ids = APP_NAV_LINKS.map((link) => link.id);
    const memory = APP_NAV_LINKS.find((link) => link.id === 'memory');
    assert.ok(memory);
    assert.equal(memory.href, '/memory');
    assert.equal(memory.label, 'Memory');
    assert.ok(ids.indexOf('objects') < ids.indexOf('memory'));
    assert.ok(ids.indexOf('memory') < ids.indexOf('billing'));
    assert.equal(isAppLinkActive('memory', 'memory'), true);
  });

  it('treats research as the Chat item', () => {
    assert.equal(resolveActiveNav('research'), 'chat');
    assert.equal(isAppLinkActive('chat', 'research'), true);
    assert.equal(isAppLinkActive('home', 'dashboard'), false);
    assert.equal(isAppLinkActive('dashboard', 'dashboard'), true);
  });

  it('mounts AppNav from the authenticated shell only', () => {
    const appNav = read('app/Components/app/AppNav.tsx');
    const appShell = read('app/Components/app/AppShell.tsx');
    const landingNav = read('app/Components/landing/Navbar.tsx');

    assert.match(appNav, /LOGO_HREF/);
    assert.match(appNav, /href=\{LOGO_HREF\}/);
    assert.match(appNav, /className=\{`app-topnav/);
    assert.match(appShell, /<AppNav\s+surface="app"/);
    assert.doesNotMatch(appShell, /<header/);
    assert.doesNotMatch(landingNav, /AppNav/);
    assert.match(landingNav, /Floating Pill Header/);
  });
});
