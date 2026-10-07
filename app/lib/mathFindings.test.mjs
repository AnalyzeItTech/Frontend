// Phase 1 math findings: contract, fixture, honesty bans, copy summary.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { parseFindings } from './findings.mjs';
import {
  DEFAULT_CAVEAT,
  MATH_BANNED,
  METHOD_LABEL,
  TOOL_TO_METHOD,
  assumptionsFromPayload,
  buildMathSteps,
  copyAllMathSummaries,
  copyMathFindingSummary,
  findBannedMathPhrases,
  isMathFinding,
  mathCardTitle,
  mathProvenanceLine,
  mathStepStatusLabel,
  parseMathBlock,
  resolveMathMethod,
} from './mathFindings.mjs';

const mathFixture = JSON.parse(readFileSync(new URL('./fixtures/findings.math.json', import.meta.url), 'utf8'));
const parsed = parseFindings(mathFixture);

describe('tool → Design method mapping', () => {
  it('maps existing Model compute tools', () => {
    assert.equal(TOOL_TO_METHOD.linear_trend, 'regression');
    assert.equal(TOOL_TO_METHOD.forecast_tool, 'forecast');
    assert.equal(TOOL_TO_METHOD.arima, 'forecast');
    assert.equal(resolveMathMethod('linear_trend', null, null), 'regression');
    assert.equal(resolveMathMethod('forecast_tool', null, 'forecast'), 'forecast');
    assert.equal(resolveMathMethod(null, 'what_if', null), 'what_if');
    assert.equal(resolveMathMethod(null, null, 'correlation'), null); // discovery correlation alone is not math chrome
  });
});

describe('math fixture sample run', () => {
  it('parses one of each method with structured fields', () => {
    assert.ok(parsed);
    assert.equal(parsed.findings.length, 3);
    const methods = parsed.findings.map((f) => f.math?.method);
    assert.deepEqual(methods, ['regression', 'forecast', 'what_if']);
    for (const f of parsed.findings) {
      assert.ok(isMathFinding(f), f.id);
      assert.ok(f.math.caveat, f.id);
      assert.ok(f.math.structured.method === f.math.method);
      assert.ok(Array.isArray(f.math.structured.kpis));
      assert.ok(Array.isArray(f.math.structured.assumptions));
      assert.ok('chartRef' in f.math.structured);
      assert.ok('caveat' in f.math.structured);
      assert.ok(Array.isArray(f.math.structured.sources));
    }
    const reg = parsed.findings[0];
    assert.equal(reg.math.tool, 'linear_trend');
    assert.equal(reg.visual?.type, 'scatter');
    assert.ok(reg.math.kpis.some((k) => /slope/i.test(k.label)));
    assert.ok(reg.math.kpis.some((k) => /R²|R2/i.test(k.label)));
    assert.ok(reg.math.assumptions.some((a) => /defaulted/i.test(a)));

    const fc = parsed.findings[1];
    assert.equal(fc.math.tool, 'forecast_tool');
    assert.equal(fc.visual?.type, 'forecast');
    assert.ok(fc.math.kpis.length >= 2);

    const wi = parsed.findings[2];
    assert.equal(wi.math.mathStatus, 'unwired');
    assert.equal(wi.math.kpis.length, 0);
    assert.equal(wi.visual, null);
  });

  it('builds a clickable step rail with ordinal statuses', () => {
    assert.equal(parsed.mathSteps.length, 3);
    assert.deepEqual(
      parsed.mathSteps.map((s) => [s.label, mathStepStatusLabel(s.state)]),
      [
        ['Regression', 'Done'],
        ['Forecast', 'Done'],
        ['What-if', 'Failed'],
      ],
    );
  });
});

describe('assumptions + params_used', () => {
  it('marks defaulted params explicitly', () => {
    const lines = assumptionsFromPayload(null, { window_days: 90, defaulted: true, transform: 'none' });
    assert.ok(lines.some((l) => /window days: 90 \(defaulted\)/i.test(l)));
    assert.ok(lines.some((l) => /transform: none/i.test(l) && !/defaulted/i.test(l)));
  });
});

describe('copy summary', () => {
  it('includes title, KPIs, assumptions, caveat, and chart omission note', () => {
    const text = copyMathFindingSummary(parsed.findings[0]);
    assert.match(text, /^Regression — revenue vs\. spend/m);
    assert.match(text, /Slope:/);
    assert.match(text, /Assumptions/);
    assert.match(text, /defaulted/i);
    assert.match(text, /not a trading signal/i);
    assert.match(text, /Chart in case link/);
    assert.doesNotMatch(text, /Black-?Scholes|Greeks|\balpha\b|\bedge\b|low latency|execution|\bdesk\b|signal to trade/i);
  });

  it('does not invent what-if numbers when unwired', () => {
    const text = copyMathFindingSummary(parsed.findings[2]);
    assert.match(text, /not wired/i);
    assert.doesNotMatch(text, /Baseline:|Shocked:|Δ%/);
    const all = copyAllMathSummaries(parsed);
    assert.ok(all.includes('Regression'));
    assert.ok(all.includes('Forecast'));
    assert.ok(all.includes('What-if'));
  });
});

describe('honesty ban list', () => {
  it('flags banned trading/quant theater phrases', () => {
    assert.ok(findBannedMathPhrases('Black-Scholes badge').length);
    assert.ok(findBannedMathPhrases('our alpha and edge').length);
    assert.equal(findBannedMathPhrases(DEFAULT_CAVEAT.regression).length, 0);
    assert.equal(findBannedMathPhrases(METHOD_LABEL.forecast).length, 0);
  });

  it('sample fixture and method labels stay clean', () => {
    const blob = JSON.stringify(mathFixture) + Object.values(METHOD_LABEL).join(' ') + Object.values(DEFAULT_CAVEAT).join(' ');
    for (const rx of MATH_BANNED) {
      // "signal" alone is fine; ban is "signal to trade"
      assert.doesNotMatch(blob, rx);
    }
  });

  it('math UI components and caveats contain none of the banned phrases', () => {
    const files = [
      '../Components/research/FindingCards.tsx',
      '../Components/research/MathStepRail.tsx',
      '../Components/case/CaseResult.tsx',
      './fixtures/findings.math.json',
    ];
    for (const rel of files) {
      const text = readFileSync(new URL(rel, import.meta.url), 'utf8');
      for (const rx of MATH_BANNED) assert.doesNotMatch(text, rx, `${rel} ${rx}`);
    }
    const surface = Object.values(DEFAULT_CAVEAT).join('\n') + Object.values(METHOD_LABEL).join('\n');
    for (const rx of MATH_BANNED) assert.doesNotMatch(surface, rx);
  });
});

describe('parseMathBlock edge cases', () => {
  it('returns null for ordinary discovery findings', () => {
    assert.equal(parseMathBlock({ kind: 'change', title: 'x' }), null);
    assert.equal(parseMathBlock({ kind: 'correlation', title: 'x' }), null);
  });

  it('accepts nested compute / stats_guards-style payloads', () => {
    const m = parseMathBlock({
      kind: 'forecast',
      title: 'Forecast — next week',
      compute: {
        tool: 'forecast_tool',
        method: 'forecast',
        assumptions: ['Window: 12 weeks'],
        params_used: { band: '80%' },
        disclaimer: DEFAULT_CAVEAT.forecast,
        kpis: [{ label: 'Point', value: '100' }, { label: 'Band', value: '90–110' }],
      },
    });
    assert.equal(m.method, 'forecast');
    assert.equal(m.tool, 'forecast_tool');
    assert.equal(m.kpis.length, 2);
    assert.deepEqual(m.assumptions, ['Window: 12 weeks']);
  });

  it('titles and provenance use plain method names', () => {
    const m = parseMathBlock({ method: 'regression', tool: 'linear_trend', target: 'revenue vs. spend', title: 'fit' });
    assert.equal(mathCardTitle(m, 'fit'), 'Regression — revenue vs. spend');
    assert.equal(mathProvenanceLine(m), 'From tools · Regression');
  });
});

describe('buildMathSteps', () => {
  it('falls back to findings when math_steps omitted', () => {
    const steps = buildMathSteps(undefined, parsed.findings);
    assert.equal(steps.length, 3);
    assert.equal(steps[0].label, 'Regression');
  });
});
