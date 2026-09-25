/**
 * Free plan marketing lists context retention (memory), not the per-request paste budget.
 * The listed number must match Backend Free context_retention_tokens (10_000_000).
 * Run: node --test app/lib/freeContextRetention.test.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

const root = path.resolve(import.meta.dirname, '../..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (/\.(tsx|ts|jsx|js|mjs|md|mdx)$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

describe('Free context retention listing', () => {
  it('lists 10M memory on the homepage Free card, same wording as paid plans', () => {
    const pricing = read('app/Components/landing/PricingTeaserSection.tsx');
    assert.match(pricing, /'10M context retention \(memory\)'/);
    assert.doesNotMatch(pricing, /250M context retention/);
    assert.match(pricing, /'500M context retention \(memory\)'/);
    assert.match(pricing, /'1B context retention \(memory\) · account-wide memory'/);
  });

  it('does not advertise 250M context retention anywhere in user-facing sources', () => {
    const banned = [/250\s*M context retention/i, /250[,_ ]000[,_ ]000/];
    const hits = [];
    for (const file of walk(root)) {
      if (file.endsWith('freeContextRetention.test.mjs')) continue;
      const text = fs.readFileSync(file, 'utf8');
      for (const pattern of banned) {
        if (pattern.test(text)) hits.push(`${path.relative(root, file)}: ${pattern}`);
      }
    }
    assert.deepEqual(hits, []);
  });

  it('leaves Premium and VIP retention copy, and the Free paste budget, unchanged', () => {
    const billing = read('app/billing/page.tsx');
    const products = read('app/products/page.tsx');
    const wall = read('app/lib/contextWall.mjs');
    assert.match(billing, /'500M context retention \(memory\)'/);
    assert.match(billing, /'1B context retention \(memory\) · account-wide memory'/);
    assert.match(products, /'500M context retention \(memory\)'/);
    assert.match(wall, /FREE_CLIENT_CONTEXT_CHARS = 20000/);
    assert.doesNotMatch(wall, /10M context/);
    assert.doesNotMatch(read('app/Components/billing/UpgradeModal.tsx'), /10M context/);
  });
});
