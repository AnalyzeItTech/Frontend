import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import { PLAN_FEATURES, PLAN_NAMES, PLAN_TAGLINES, USD_REFERENCE, presentPlans, priceLabel, priceNote } from './planCatalog.mjs';

const root = path.resolve(import.meta.dirname, '../..');
function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

/** The live India quote shape: whole rupees on screen, USD only as a reference. */
const HOMEPAGE_INR_QUOTE = {
  country: 'IN',
  plans: {
    premium: { currency: 'INR', amount: 1831.08, amount_usd: 19, amount_display: '1831.08' },
    premium_plus: { currency: 'INR', amount: 4722.26, amount_usd: 49, amount_display: '4722.26' },
  },
};

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

describe('home and products show the same Premium price', () => {
  it('renders Premium in whole rupees when the homepage quote is INR, with USD only as a reference', () => {
    const cards = presentPlans(HOMEPAGE_INR_QUOTE);
    const premium = cards.find((p) => p.id === 'premium');
    const vip = cards.find((p) => p.id === 'premium_plus');
    const free = cards.find((p) => p.id === 'free');
    assert.equal(free.price, '₹0');
    assert.equal(free.note, 'No charge');
    assert.equal(premium.name, 'Premium');
    assert.equal(premium.price, '₹1,831');
    assert.equal(premium.note, 'INR per month via Razorpay · $19 USD reference');
    assert.equal(vip.name, 'VIP');
    assert.equal(vip.price, '₹4,722');
    assert.match(vip.note, /\$49 USD reference/);
    for (const card of [premium, vip]) {
      assert.doesNotMatch(card.price, /^\$/);
      assert.doesNotMatch(card.note, /Shown in USD/);
    }
    // Missing quote still must not invent a rupee amount.
    const unpaid = presentPlans(null).find((p) => p.id === 'premium');
    assert.equal(unpaid.price, '$19');
    assert.match(unpaid.note, /Shown in USD/);
  });

  it('would fail if Products rendered Premium in USD while the homepage quote is INR', () => {
    const homePremium = presentPlans(HOMEPAGE_INR_QUOTE).find((p) => p.id === 'premium');
    const productsPremium = presentPlans(HOMEPAGE_INR_QUOTE).find((p) => p.id === 'premium');
    assert.equal(productsPremium.price, homePremium.price);
    assert.equal(productsPremium.note, homePremium.note);
    assert.equal(productsPremium.price, '₹1,831');
    assert.doesNotMatch(`${productsPremium.price} ${productsPremium.note}`, /Shown in USD/);

    const products = read('app/products/ProductsPlans.tsx');
    const home = read('app/Components/landing/PricingTeaserSection.tsx');
    const page = read('app/products/page.tsx');
    // Both cards go through presentPlans, so a page cannot format Premium on its own.
    assert.match(products, /presentPlans\(quote\)/);
    assert.match(home, /presentPlans\(quote\)/);
    assert.doesNotMatch(products, /priceLabel\(/);
    assert.doesNotMatch(home, /priceLabel\(/);
    assert.doesNotMatch(products, /Shown in USD for now/);
    // The products HTML is seeded with the same quote. Without this, the prerender
    // stays on the USD-only fallback while the homepage already shows rupees.
    assert.match(page, /loadMarketingQuote\(/);
    assert.match(page, /initialQuote=\{quote\}/);
    assert.match(products, /useState<MarketingQuote>\(initialQuote \?\? null\)/);
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
