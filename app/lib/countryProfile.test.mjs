import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCountry, resolveCountry, cookieCountry, localPriceNote, trustProfile } from './countryProfile.mjs';

test('country: cookie wins, then locale region, else null', () => {
  assert.equal(resolveCountry({ cookie: 'gb', language: 'en-US' }), 'GB');
  assert.equal(resolveCountry({ cookie: '', language: 'en-AU' }), 'AU');
  assert.equal(resolveCountry({ language: 'en' }), null);
  assert.equal(normalizeCountry('XX'), null);
  assert.equal(normalizeCountry('India'), null);
  assert.equal(cookieCountry('a=1; ai_country=DE; b=2'), 'DE');
  assert.equal(cookieCountry('a=1'), null);
});

test('trust: India is billed-in-rupees and names the DPDP Act and the Razorpay module', () => {
  const p = trustProfile('IN', 'p@x.in');
  assert.match(p.points[0].title, /rupees/i);
  assert.ok(p.points.some((x) => /Digital Personal Data Protection/.test(x.body)));
  assert.ok(p.points.some((x) => /Razorpay payments/.test(x.body)));
});

test('trust: EU member states get the GDPR, an unknown country gets the generic rights line', () => {
  assert.ok(trustProfile('FR', 'p@x.in').points.some((x) => /GDPR/.test(x.body)));
  const generic = trustProfile(null, 'p@x.in');
  assert.ok(generic.points.every((x) => !/GDPR|CCPA|DPDP/.test(x.body)));
  assert.ok(generic.points.some((x) => /p@x\.in/.test(x.body)));
});

test('trust: the refund claim keeps its condition and never promises money back unconditionally', () => {
  for (const c of ['IN', 'US', null]) {
    const refund = trustProfile(c, 'p@x.in').points.find((x) => /Cancel/.test(x.title));
    assert.match(refund.body, /materially unavailable/);
  }
});

test('price note: only for a real estimate outside India; never invents one', () => {
  assert.equal(localPriceNote(null, 'GB'), null);
  assert.equal(localPriceNote({ currency: 'GBP', amount: 15.2 }, 'IN'), null);
  assert.equal(localPriceNote({ currency: 'GBP' }, 'GB'), null);
  assert.match(localPriceNote({ currency: 'GBP', amount: 15.2 }, 'GB'), /£15\.20.*billed in INR/);
  assert.match(localPriceNote({ currency: 'JPY', amount: 2850 }, 'JP'), /¥2,850/);
});
