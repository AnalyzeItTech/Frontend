import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PLAN_FEATURES, PLAN_NAMES, PLAN_TAGLINES, USD_REFERENCE, priceLabel, priceNote } from './planCatalog.mjs';

describe('the plan catalogue', () => {
  it('names the top plan VIP and never "Premium+"', () => {
    assert.equal(PLAN_NAMES.premium_plus, 'VIP');
    const text = JSON.stringify([PLAN_FEATURES, PLAN_TAGLINES, PLAN_NAMES]);
    assert.ok(!text.includes('Premium+'));
  });
  it('states real limits, not multipliers that contradict each other', () => {
    assert.ok(PLAN_FEATURES.free.some((f) => f.includes('50,000 tokens a month')));
    assert.ok(!JSON.stringify(PLAN_FEATURES).match(/\d×/), 'no "3×" / "6×" multipliers');
    assert.ok(PLAN_FEATURES.premium.some((f) => f.includes('10M tokens a month')));
    assert.ok(PLAN_FEATURES.premium_plus.some((f) => f.includes('50M tokens a month')));
  });
  it('lists memory per plan using the same figures as the entitlement table', () => {
    assert.ok(PLAN_FEATURES.free.some((f) => f.startsWith('10M tokens of memory')));
    assert.ok(PLAN_FEATURES.premium.some((f) => f.startsWith('500M tokens of memory')));
    assert.ok(PLAN_FEATURES.premium_plus.some((f) => f.startsWith('1B tokens of memory')));
  });
  it('does not sell Slack, Notion or email digests', () => {
    assert.ok(!/slack|notion|digest/i.test(JSON.stringify(PLAN_FEATURES)));
  });
  it('has the USD references the checkout uses', () => {
    assert.deepEqual(USD_REFERENCE, { free: 0, premium: 19, premium_plus: 49 });
  });
});

describe('priceLabel and priceNote', () => {
  it('shows whole rupees with Indian grouping', () => {
    assert.equal(priceLabel({ currency: 'INR', amount: 1814.76 }, 19), '₹1,815');
    assert.equal(priceLabel({ currency: 'INR', amount: '4680.18' }, 49), '₹4,680');
    assert.equal(priceLabel({ currency: 'INR', amount: 100000 }, 49), '₹1,00,000');
  });
  it('falls back to USD, never an invented rupee figure', () => {
    assert.equal(priceLabel(undefined, 19), '$19');
    assert.equal(priceLabel({ currency: 'INR', amount: null }, 49), '$49');
    assert.equal(priceLabel({ currency: 'INR', amount: 'abc' }, 19), '$19');
    assert.equal(priceLabel(undefined, 0), '₹0');
    assert.match(priceNote(undefined, 19), /checkout/);
    assert.equal(priceNote(undefined, 0), 'No charge');
  });
  it('handles other currencies', () => {
    assert.equal(priceLabel({ currency: 'USD', amount: 19 }, 19), 'USD 19.00');
    assert.equal(priceLabel({ currency: 'JPY', amount: 2850.4 }, 19), 'JPY 2,850');
    assert.equal(priceNote({ currency: 'INR', amount: 1815 }, 19), 'INR per month via Razorpay · $19 USD reference');
  });
});

describe('deep read is described the way it works', () => {
  it('Premium and VIP read long pasted documents, with the real sizes; Free does not claim it', () => {
    assert.ok(PLAN_FEATURES.premium.some((f) => f.includes('section by section') && f.includes('150,000')));
    assert.ok(PLAN_FEATURES.premium_plus.some((f) => f.includes('section by section') && f.includes('300,000')));
    assert.ok(!PLAN_FEATURES.free.some((f) => /section|deep/i.test(f)));
    assert.ok(!JSON.stringify(PLAN_FEATURES).match(/recursive|RLM|orchestrated/i));
  });
});
