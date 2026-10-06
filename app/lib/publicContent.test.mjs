// Guards for the public pages: the claims they make must stay true. Run with the rest of `npm test`.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import { CHANGELOG } from './changelog.mjs';
import { GUIDES, readMinutes, wordCount } from './guides.mjs';
import { LIVE_CASES } from './liveCases.mjs';
import { parseFindings } from './findings.mjs';

const root = path.resolve(import.meta.dirname, '../..');

function files(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files(full, acc);
    else if (/\.(tsx|ts|mjs)$/.test(e.name) && !e.name.endsWith('.test.mjs')) acc.push(full);
  }
  return acc;
}

const PUBLIC_DIRS = ['app/docs', 'app/cases', 'app/changelog', 'app/demo', 'app/products', 'app/guides'];
const BANNED = [
  [/Premium\+/, 'the top plan is called VIP'],
  [/high demand/i, 'do not blame demand for an outage'],
  [/real-time 3D/i, 'overclaim'],
  [/high-leverage/i, 'jargon'],
  [/\bunlimited memory\b/i, 'memory has plan limits'],
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

describe('the landing page', () => {
  const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
  it('has no intro loader to wait behind', () => {
    const exp = read('app/Components/landing/LandingExperience.tsx');
    assert.doesNotMatch(exp, /LoadingScreen|isLoading|opacity-0/, 'content must be visible at once');
    assert.ok(!fs.existsSync(path.join(root, 'app/Components/ui/LoadingScreen.tsx')));
    assert.doesNotMatch(read('app/Components/landing/HeroSection.tsx') + exp, /CALIBRATING/i);
  });
  it('names a pain for one kind of customer, and shows a real output on labelled sample data', () => {
    const hero = read('app/Components/landing/HeroSection.tsx');
    assert.match(hero, /<HeroAnswer \/>/);
    assert.match(hero, /Razorpay/);
    assert.match(hero, /failing/);
    assert.doesNotMatch(hero, /Weather in Mumbai|AAPL|12 \* 30|globe|map-first/i, 'the hero is about one thing');
    assert.match(read('app/page.tsx'), /<LeaksSection \/>/);
    const ex = JSON.parse(read('app/lib/fixtures/hero.example.json'));
    const parsed = parseFindings(ex.findings);
    assert.ok(parsed && parsed.findings.length === 2);
    assert.ok(parsed.findings.every((f) => f.visual && /\d/.test(f.title)), 'the figures come from the run, not from hand-typed copy');
    assert.match(ex.dataset, /sample data/);           // the caption must say it is not a real business
    assert.match(ex.dataset, /not a real business/);
    const code = read('app/Components/landing/HeroAnswer.tsx').replace(/className="[^"]*"/g, '').replace(/import .*;/g, '');
    assert.doesNotMatch(code, /\d{2,}/, 'no figure is typed into the component');
  });
  it('compares itself honestly with uploading a file to a chatbot', () => {
    const cmp = read('app/Components/landing/ComparisonSection.tsx');
    assert.match(cmp, /chatbot/);
    assert.doesNotMatch(cmp, /Place & context|billion tokens|Calm studio/);
    assert.match(read('app/Components/landing/LeaksSection.tsx'), /never stores customer email, phone, card or UPI/);
  });
  it('does not feature things that are still rolling out, or claim what does not exist', () => {
    for (const f of ['HeroSection', 'DescentSection', 'CapabilitiesSection', 'PricingTeaserSection']) {
      assert.doesNotMatch(read(`app/Components/landing/${f}.tsx`), /rolling out|Slack|Notion/i, f);
    }
    assert.doesNotMatch(read('app/Components/landing/DescentSection.tsx'), /30-Day Rolling|Root Cause|Probabilistic|multi-metric graph/i);
  });
});

describe('live worked examples', () => {
  it('have unique slugs, titles and queries, and search-sized metadata', () => {
    for (const key of ['slug', 'title', 'question']) {
      const values = LIVE_CASES.map((c) => c[key]);
      assert.equal(new Set(values).size, values.length, `${key} must be unique`);
    }
    for (const c of LIVE_CASES) {
      assert.match(c.slug, /^[a-z0-9-]+$/, c.slug);
      assert.ok(c.title.length <= 70, `${c.slug}: title too long for a search result`);
      assert.ok(c.description.length >= 80 && c.description.length <= 160, `${c.slug}: description length ${c.description.length}`);
      assert.ok(c.related.length >= 2, `${c.slug} should link to other examples`);
      assert.ok(c.related.every((r) => LIVE_CASES.some((o) => o.slug === r.slug)), `${c.slug}: related page missing`);
    }
  });
  it('never put a figure that should come from the tool into the page text', () => {
    // The numbers on these pages come from the live tool. The static text may only hold definitions, so it must contain no exchange
    // rate, temperature or price (a digit followed by a currency or degree), apart from exact unit definitions.
    for (const c of LIVE_CASES) {
      const text = [c.subtitle, ...c.sections.flatMap((s) => s.p)].join(' ');
      assert.doesNotMatch(text, /\d\s?°|₹\s?\d|\bINR\s?\d|=\s?\d+\.\d+\s?(INR|USD)/, `${c.slug}: hard-coded live figure`);
    }
  });
  it('are all in the sitemap and have a page to render them', () => {
    const sitemap = fs.readFileSync(path.join(root, 'app/sitemap.ts'), 'utf8');
    assert.match(sitemap, /LIVE_CASES\.map/);
    assert.ok(fs.existsSync(path.join(root, 'app/cases/[slug]/page.tsx')));
  });
});

describe('guides', () => {
  it('are complete, unique and long enough to be worth reading', () => {
    assert.equal(new Set(GUIDES.map((g) => g.slug)).size, GUIDES.length);
    for (const g of GUIDES) {
      assert.match(g.published, /^\d{4}-\d{2}-\d{2}$/);
      assert.ok(g.title.length <= 90 && g.description.length >= 80 && g.description.length <= 170, g.slug);
      assert.ok(wordCount(g) >= 350, `${g.slug} is too thin`);
      assert.ok(readMinutes(g) >= 1);
      assert.ok(g.blocks.some((b) => b.h2), `${g.slug} needs headings`);
      assert.ok(fs.existsSync(path.join(root, 'app', g.cta.href.replace(/^\//, ''), 'page.tsx')), `${g.slug}: cta target missing`);
    }
  });
  it('make no claim we have retired, and give no invented statistics', () => {
    const text = GUIDES.map((g) => JSON.stringify(g.blocks)).join(' ');
    for (const [rx, why] of BANNED) assert.doesNotMatch(text, rx, why);
    assert.doesNotMatch(text, /\b\d{1,3}(\.\d+)?\s?% of (businesses|companies|people|users)/i, 'a made-up statistic');
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
