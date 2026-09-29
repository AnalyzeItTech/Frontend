/**
 * Profile hero: tier names and monthly LLM-run usage.
 * Run: node --test app/lib/profileHero.test.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  profileInitials,
  profileMonthUsage,
  profilePeriodLabel,
  profileTierName,
} from './profileHero.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

describe('profile tier name', () => {
  it('maps plan tiers to Free, Premium, and VIP', () => {
    assert.equal(profileTierName(undefined), 'Free');
    assert.equal(profileTierName(''), 'Free');
    assert.equal(profileTierName('free'), 'Free');
    assert.equal(profileTierName('FREE'), 'Free');
    assert.equal(profileTierName('free_trial'), 'Free');
    assert.equal(profileTierName('premium'), 'Premium');
    assert.equal(profileTierName('premium_plus'), 'VIP');
    assert.equal(profileTierName('vip'), 'VIP');
  });
});

describe('profile initials', () => {
  it('uses the first letters of a two-word name', () => {
    assert.equal(profileInitials('Ada Lovelace', 'ada@analyzeit.in'), 'AL');
  });

  it('falls back to the email when the name is blank', () => {
    assert.equal(profileInitials('  ', 'ada@analyzeit.in'), 'AD');
    assert.equal(profileInitials(null, null), 'U');
  });
});

describe('profile monthly LLM runs', () => {
  it('labels a YYYY-MM period', () => {
    assert.equal(profilePeriodLabel('2026-09'), 'September 2026');
    assert.equal(profilePeriodLabel('not-a-month'), null);
  });

  it('shows used over the free ceiling and withholds upgrade while there is room', () => {
    const usage = profileMonthUsage(
      {
        unit: 'runs',
        used: 12,
        limit: 75,
        remaining: 63,
        unlimited: false,
        nearCap: false,
        exhausted: false,
        period: '2026-09',
      },
      'free',
    );
    assert.equal(usage.available, true);
    assert.equal(usage.summary, '12 / 75 LLM runs this month');
    assert.equal(usage.showUpgrade, false);
    assert.equal(usage.periodLabel, 'September 2026');
    assert.match(usage.footnote, /no model tokens/i);
    assert.equal(usage.detail, '');
  });

  it('asks for an upgrade when the free ceiling is near or used up', () => {
    const near = profileMonthUsage(
      {
        unit: 'runs',
        used: 70,
        limit: 75,
        remaining: 5,
        nearCap: true,
        exhausted: false,
      },
      'free',
    );
    assert.equal(near.showUpgrade, true);
    assert.equal(near.detail, '5 LLM runs left this month.');

    const spent = profileMonthUsage(
      {
        unit: 'runs',
        used: 75,
        limit: 75,
        remaining: 0,
        nearCap: true,
        exhausted: true,
      },
      'free_trial',
    );
    assert.equal(spent.showUpgrade, true);
    assert.equal(spent.exhausted, true);
    assert.equal(spent.percent, 100);
  });

  it('does not offer an upgrade on VIP, even at a ceiling', () => {
    const usage = profileMonthUsage(
      {
        unit: 'runs',
        used: 75,
        limit: 75,
        remaining: 0,
        exhausted: true,
        nearCap: true,
      },
      'premium_plus',
    );
    assert.equal(usage.showUpgrade, false);
    assert.equal(usage.exhausted, true);
  });

  it('treats an unlimited run plan as having no ceiling and no upgrade', () => {
    const usage = profileMonthUsage(
      {
        unit: 'runs',
        used: 40,
        limit: null,
        remaining: null,
        unlimited: true,
        period: '2026-09',
      },
      'premium',
    );
    assert.equal(usage.unlimited, true);
    assert.equal(usage.ceiling, null);
    assert.equal(usage.showUpgrade, false);
    assert.equal(usage.summary, '40 LLM runs this month');
    assert.match(usage.detail, /No monthly ceiling/);
  });

  it('does not turn a token fallback into a run count', () => {
    const usage = profileMonthUsage(
      {
        unit: 'tokens',
        used: 1200,
        limit: 8000,
        remaining: 6800,
        unlimited: false,
        nearCap: false,
        exhausted: false,
      },
      'free',
    );
    assert.equal(usage.available, false);
    assert.equal(usage.used, null);
    assert.equal(usage.showUpgrade, false);
    assert.equal(usage.summary.includes('1,200'), false);
    assert.equal(usage.summary.includes('8000'), false);
  });
});

describe('profile page', () => {
  it('uses the shared shell and the hero helpers, without trial or token-bar copy', () => {
    const page = fs.readFileSync(path.join(root, 'app/profile/page.tsx'), 'utf8');
    assert.match(page, /<AppShell active="profile">/);
    assert.match(page, /profileTierName/);
    assert.match(page, /profileMonthUsage/);
    assert.match(page, /parseLlmQuota/);
    assert.equal(page.includes('tokens_used_today'), false);
    assert.equal(page.includes('tokens_per_day'), false);
    assert.equal(page.toLowerCase().includes('trial'), false);
  });
});
