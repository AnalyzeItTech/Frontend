// Guards for the public pages: the claims they make must stay true. Run with the rest of `npm test`.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import { CHANGELOG } from './changelog.mjs';

const root = path.resolve(import.meta.dirname, '../..');

function files(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files(full, acc);
    else if (/\.(tsx|ts|mjs)$/.test(e.name) && !e.name.endsWith('.test.mjs')) acc.push(full);
  }
  return acc;
}

const PUBLIC_DIRS = ['app/docs', 'app/cases', 'app/changelog', 'app/demo', 'app/products'];
const BANNED = [
  [/Premium\+/, 'the top plan is called VIP'],
  [/high demand/i, 'do not blame demand for an outage'],
  [/real-time 3D/i, 'overclaim'],
  [/high-leverage/i, 'jargon'],
  [/\bunlimited memory\b/i, 'memory has plan limits'],
  [/\bunlimited AI runs\b/i, 'AI runs are plan-limited; no unlimited claim'],
  [/\bunlimited LLM\b/i, 'LLM runs are plan-limited; no unlimited claim'],
  [/no size limit beyond your memory plan/i, 'cite real memory caps'],
  [/Slack & Email/, 'Slack and email delivery are rolling out'],
];

describe('public pages', () => {
  const all = PUBLIC_DIRS.flatMap((d) => files(path.join(root, d)));
  it('exist where the sitemap says they do', () => {
    const sitemap = fs.readFileSync(path.join(root, 'app/sitemap.ts'), 'utf8');
    for (const m of sitemap.matchAll(/path: '(\/(?:docs|cases|changelog|demo)[^']*)'/g)) {
      const rel = m[1].replace(/^\//, '');
      assert.ok(fs.existsSync(path.join(root, 'app', rel, 'page.tsx')), `${m[1]} is in the sitemap but has no page`);
    }
  });
  it('contain none of the claims we corrected', () => {
    for (const file of all) {
      const text = fs.readFileSync(file, 'utf8');
      for (const [rx, why] of BANNED) assert.doesNotMatch(text, rx, `${path.relative(root, file)}: ${why}`);
    }
  });
  it('talk about delivery honestly', () => {
    const text = fs.readFileSync(path.join(root, 'app/docs/connectors/page.tsx'), 'utf8');
    assert.match(text, /Still rolling out/);
    assert.match(text, /email, Slack and Notion/);
  });
  it('every page has its own title and description', () => {
    for (const file of all.filter((f) => f.endsWith('page.tsx') && !f.includes('/products/'))) {
      const text = fs.readFileSync(file, 'utf8');
      assert.match(text, /title:\s*/, `${path.relative(root, file)} needs metadata`);
      assert.match(text, /description:\s*/, `${path.relative(root, file)} needs a description`);
    }
  });
});

describe('the changelog', () => {
  it('is newest first, dated, and marks unfinished work', () => {
    const dates = CHANGELOG.map((e) => e.date);
    assert.deepEqual(dates, [...dates].sort().reverse());
    for (const e of CHANGELOG) {
      assert.match(e.date, /^\d{4}-\d{2}-\d{2}$/);
      assert.ok(e.items.length > 0);
      for (const i of e.items) assert.ok(i.title && i.body, e.date);
    }
    assert.ok(CHANGELOG.some((e) => e.items.some((i) => i.rollingOut)), 'memory is still rolling out and the log must say so');
  });
});

describe('contact addresses', () => {
  it('all use the product domain (analyzeit.in), never a second one', () => {
    const hits = [];
    for (const file of files(path.join(root, 'app'))) {
      const text = fs.readFileSync(file, 'utf8');
      for (const m of text.matchAll(/[A-Za-z0-9._-]+@analyzeit\.([a-z]+)/g)) {
        if (m[1] !== 'in') hits.push(`${path.relative(root, file)}: ${m[0]}`);
      }
    }
    assert.deepEqual(hits, []);
  });
});
