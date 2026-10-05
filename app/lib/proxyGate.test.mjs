// The sign-in gate must cover every signed-in surface, and keep the public ones open.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

const proxy = fs.readFileSync(path.resolve(import.meta.dirname, '../../proxy.ts'), 'utf8');
const protectedList = [...proxy.slice(proxy.indexOf('PROTECTED_PREFIXES'), proxy.indexOf('];')).matchAll(/'(\/[a-z-]+)'/g)].map((m) => m[1]);
const matcher = [...proxy.slice(proxy.indexOf('matcher:')).matchAll(/'(\/[A-Za-z-]+)'/g)].map((m) => m[1]);

describe('the sign-in gate', () => {
  it('covers Research, the globe and the dashboard alike', () => {
    for (const p of ['/research', '/globe', '/dashboard', '/memory', '/billing']) assert.ok(protectedList.includes(p), `${p} must be gated`);
  });
  it('keeps the public pages open', () => {
    for (const p of ['/demo', '/docs', '/cases', '/changelog', '/products', '/login']) {
      assert.ok(!protectedList.includes(p), `${p} must stay public`);
    }
  });
  it('every gated page is also in the matcher, or the gate never runs for it', () => {
    for (const p of protectedList) assert.ok(matcher.includes(p), `${p} is gated but not matched`);
  });
});
