import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCountry, resolveCountry, cookieCountry, trustProfile } from './countryProfile.mjs';

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

test('trust: outside India the currency point says the price is in the visitor currency', () => {
  assert.match(trustProfile('GB', 'p@x.in').points[0].title, /your currency/i);
});
