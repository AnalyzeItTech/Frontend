/**
 * Free plan lists 10M context retention (memory). Upgrade copy uses the same
 * figure — not a 20,000-character soft-truncate. Premium stays 500M, VIP 1B.
 * Run: node --test app/lib/freeContextRetention.test.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  CONTEXT_RETENTION_TOKENS,
  CONTEXT_UPGRADE_COPY,
  formatContextRetention,
} from './contextWall.mjs';

const root = path.resolve(import.meta.dirname, '../..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (/\.(tsx|ts|jsx|js|mjs|md|mdx)$/.test(entry.name) && !entry.name.endsWith('.test.mjs')) {
      acc.push(full);
    }
  }
  return acc;
}

describe('Free context retention listing', () => {
  it('lists Free 10M, Premium 500M, and VIP 1B from one table', () => {
    assert.equal(CONTEXT_RETENTION_TOKENS.free, 10_000_000);
    assert.equal(CONTEXT_RETENTION_TOKENS.premium, 500_000_000);
    assert.equal(CONTEXT_RETENTION_TOKENS.premium_plus, 1_000_000_000);
    assert.equal(formatContextRetention(CONTEXT_RETENTION_TOKENS.free), '10M');
    assert.equal(formatContextRetention(CONTEXT_RETENTION_TOKENS.premium), '500M');
    assert.equal(formatContextRetention(CONTEXT_RETENTION_TOKENS.premium_plus), '1B');
    assert.match(CONTEXT_UPGRADE_COPY.body, /Free context retention \(memory\) is 10M/);
    assert.match(CONTEXT_UPGRADE_COPY.body, /Premium context retention \(memory\) is 500M/);
    assert.match(CONTEXT_UPGRADE_COPY.body, /VIP is 1B/);

    for (const rel of [
      'app/Components/landing/PricingTeaserSection.tsx',
      'app/billing/page.tsx',
      'app/products/page.tsx',
    ]) {
      const text = read(rel);
      assert.match(text, /CONTEXT_RETENTION_TOKENS/);
      assert.match(text, /formatContextRetention/);
      assert.doesNotMatch(text, /250M context retention/);
    }
    const pricing = read('app/Components/landing/PricingTeaserSection.tsx');
    assert.match(pricing, /CONTEXT_RETENTION_TOKENS\.free/);
    assert.match(pricing, /CONTEXT_RETENTION_TOKENS\.premium/);
    assert.match(pricing, /CONTEXT_RETENTION_TOKENS\.premium_plus/);
  });

  it('does not advertise 250M retention or a 20,000-character Free wall', () => {
    const banned = [
      /250\s*M context retention/i,
      /250[,_ ]000[,_ ]000/,
      /20,\s*000 characters/i,
      /soft-truncat/i,
      /20k client/i,
      /FREE_CLIENT_CONTEXT_CHARS/,
      /200k context/i,
      /2M context/i,
    ];
    const hits = [];
    for (const file of walk(root)) {
      const text = fs.readFileSync(file, 'utf8');
      for (const pattern of banned) {
        if (pattern.test(text)) hits.push(`${path.relative(root, file)}: ${pattern}`);
      }
    }
    assert.deepEqual(hits, []);
  });

  it('reads live context_retention_tokens ahead of the character meter', () => {
    const wall = read('app/lib/contextWall.mjs');
    const modal = read('app/Components/billing/UpgradeModal.tsx');
    const research = read('app/research/page.tsx');
    assert.match(wall, /context_retention_tokens/);
    assert.match(wall, /max_client_context_chars/);
    const retentionAt = wall.indexOf("'context_retention_tokens'");
    const charsAt = wall.indexOf("'max_client_context_chars'");
    assert.ok(retentionAt >= 0 && charsAt > retentionAt);
    assert.match(modal, /contextUpgradeBody\(contextLimitLabel\)/);
    assert.match(modal, /CAPACITY_UPGRADE_COPY/);
    assert.match(research, /quoteFreeContextLimit/);
    assert.doesNotMatch(modal, /20,000|soft-truncat/);
    assert.doesNotMatch(research, /reason:\s*'context'/);
  });
});
