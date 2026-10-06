'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  bandGeometry,
  barsGeometry,
  chartAlt,
  forecastGeometry,
  formatNumber,
  formatPeriod,
  lineGeometry,
  meterGeometry,
  scatterGeometry,
  stepIndex,
  type BandVisual,
  type BarsVisual,
  type Finding,
  type ForecastVisual,
  type LineVisual,
  type MeterVisual,
  type ScatterVisual,
} from '../../lib/findings.mjs';

/**
 * The small chart on a finding card. Every mark uses the discovery tokens (one accent plus grey, checked for contrast in both
 * themes), the one thing that matters is labelled directly on the chart rather than by colour alone, and each chart has a text
 * alternative. Bars and the meter are plain HTML; the line, scatter and band are SVG drawn at the real pixel width of the card so
 * their text stays readable on a phone.
 */

const SOFT = 'var(--finding-soft)';
const NEUTRAL = 'var(--finding-neutral)';
const ACCENT = 'var(--finding-accent)';

function useWidth(initial = 320): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(initial);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const update = () => setWidth(Math.max(220, Math.round(el.clientWidth || initial)));
    update();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [initial]);
  return [ref, width];
}

function Legend({ items }: { items: Array<{ label: string; kind: 'main' | 'baseline' | 'fit' | 'accent' }> }) {
  return (
    <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: SOFT }}>
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-1.5">
          <svg width="22" height="8" aria-hidden="true">
            {it.kind === 'accent' ? (
              <circle cx="11" cy="4" r="4" fill={ACCENT} />
            ) : (
              <line x1="0" x2="22" y1="4" y2="4" stroke={it.kind === 'main' ? 'var(--text-primary)' : it.kind === 'fit' ? ACCENT : NEUTRAL} strokeWidth={it.kind === 'main' ? 2 : 1.5} strokeDasharray={it.kind === 'main' ? undefined : '4 3'} />
            )}
          </svg>
          {it.label}
        </li>
      ))}
    </ul>
  );
}

function LineChart({ finding, v }: { finding: Finding; v: LineVisual }) {
  const [ref, width] = useWidth();
  const g = lineGeometry(v, width);
  const main = g.series.find((s) => s.role === 'main') ?? g.series[0];
  const startAt = Math.max(0, main.points.findIndex((p) => p.i === g.highlight[0]?.i));
  const [active, setActive] = useState<number | null>(null);
  const pos = active ?? (g.highlight.length ? startAt : main.points.length - 1);
  const cur = main.points[Math.min(pos, main.points.length - 1)];
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    setActive(stepIndex(pos, e.key, main.points.length));
  };
  const alt = chartAlt(finding);
  return (
    <div ref={ref} className="w-full">
      <div
        tabIndex={0}
        role="group"
        aria-label={`${alt} Use the arrow keys to step through the points.`}
        onKeyDown={onKey}
        className="rounded-md outline-offset-2"
      >
        <div className="flex items-baseline justify-between gap-2 px-1 text-xs" aria-live="polite" style={{ color: SOFT }}>
          <span className="truncate">{v.yLabel}</span>
          {cur ? (
            <span className="shrink-0 tabular-nums text-[var(--text-primary)]">
              {formatPeriod(v.x[cur.i])}: <b>{formatNumber(cur.v, v.format)}</b>
            </span>
          ) : null}
        </div>
        <svg width={g.width} height={g.height} viewBox={`0 0 ${g.width} ${g.height}`} role="img" aria-label={alt} className="block max-w-full">
          {g.yTicks.map((t, i) => (
            <g key={i}>
              <line x1={g.plot.l} x2={g.plot.r} y1={t.y} y2={t.y} stroke="var(--border)" strokeWidth={1} />
              <text x={g.plot.l - 6} y={t.y + 4} textAnchor="end" fontSize={11} fill={SOFT}>
                {t.label}
              </text>
            </g>
          ))}
          {g.xTicks.map((t) => (
            <text key={t.i} x={t.x} y={g.height - 6} textAnchor="middle" fontSize={11} fill={SOFT}>
              {t.label}
            </text>
          ))}
          {g.series
            .filter((s) => s.role !== 'main')
            .map((s) => (
              <path key={s.name + s.role} d={s.path} fill="none" stroke={s.role === 'fit' ? ACCENT : NEUTRAL} strokeWidth={1.5} strokeDasharray="5 4" />
            ))}
          <path d={main.path} fill="none" stroke="var(--text-primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {main.points.map((p) => (
            <circle key={p.i} cx={p.x} cy={p.y} r={2.4} fill="var(--text-primary)" />
          ))}
          {g.highlight.map((h) => {
            const below = h.y < g.plot.t + 26;
            const anchor = h.x < g.plot.l + 70 ? 'start' : h.x > g.plot.r - 70 ? 'end' : 'middle';
            return (
              <g key={h.i}>
                <circle cx={h.x} cy={h.y} r={6} fill={ACCENT} stroke="var(--surface)" strokeWidth={2} />
                <text
                  x={h.x}
                  y={below ? h.y + 22 : h.y - 12}
                  textAnchor={anchor}
                  fontSize={12}
                  fontWeight={600}
                  fill="var(--text-primary)"
                  stroke="var(--surface)"
                  strokeWidth={4}
                  paintOrder="stroke"
                >
                  {h.label}: {h.valueLabel}
                </text>
              </g>
            );
          })}
          {cur ? <circle cx={cur.x} cy={cur.y} r={8} fill="none" stroke={ACCENT} strokeWidth={1.5} /> : null}
        </svg>
      </div>
      <Legend
        items={[
          ...(g.highlight.length ? [{ label: 'Where it stands out', kind: 'accent' as const }] : []),
          ...g.series.filter((s) => s.role !== 'main').map((s) => ({ label: s.name, kind: s.role as 'baseline' | 'fit' })),
        ]}
      />
    </div>
  );
}

function BarsChart({ v }: { v: BarsVisual }) {
  const g = barsGeometry(v);
  return (
    <div>
      <ul className="space-y-1.5" aria-label="Values by group">
        {g.rows.map((r) => (
          <li key={r.label} className="grid grid-cols-[minmax(4rem,8.5rem)_minmax(0,1fr)_auto] items-center gap-2 text-xs sm:text-[13px]">
            <span className={`truncate ${r.highlight ? 'font-semibold text-[var(--text-primary)]' : ''}`} style={r.highlight ? undefined : { color: SOFT }} title={r.label}>
              {r.label}
            </span>
            <div className="relative h-4 rounded-sm" style={{ background: 'var(--surface-3)' }} aria-hidden="true">
              <div className="h-full rounded-sm" style={{ width: `${r.pct}%`, background: r.highlight ? ACCENT : NEUTRAL }} />
              {g.baselinePct !== null ? (
                <div className="absolute inset-y-[-2px] w-0 border-l-2 border-dashed" style={{ left: `${g.baselinePct}%`, borderColor: 'var(--text-primary)' }} />
              ) : null}
            </div>
            <span className="tabular-nums text-[var(--text-primary)]">
              <b className="font-semibold">{r.valueLabel}</b>
              {r.n !== null ? <span className="ml-1 text-[11px]" style={{ color: SOFT }}>({r.n.toLocaleString('en-US')})</span> : null}
            </span>
          </li>
        ))}
      </ul>
      {g.baselinePct !== null ? (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs" style={{ color: SOFT }}>
          <span aria-hidden="true" className="inline-block h-3 w-0 border-l-2 border-dashed" style={{ borderColor: 'var(--text-primary)' }} />
          {g.baselineLabel || 'Overall'}: {g.baselineValue}
        </p>
      ) : null}
    </div>
  );
}

function MeterChart({ finding, v }: { finding: Finding; v: MeterVisual }) {
  const g = meterGeometry(v);
  return (
    <div>
      <div className="flex h-4 w-full overflow-hidden rounded-sm" role="img" aria-label={chartAlt(finding)} style={{ background: 'var(--surface-3)' }}>
        {g.parts.map((p) => (
          <div key={p.label} style={{ width: `${p.pct}%`, background: p.tone === 'warn' ? ACCENT : NEUTRAL }} />
        ))}
      </div>
      <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: SOFT }}>
        {g.parts.map((p) => (
          <li key={p.label} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: p.tone === 'warn' ? ACCENT : NEUTRAL }} />
            <span className="text-[var(--text-primary)]">{p.label}</span> {p.valueLabel}
          </li>
        ))}
      </ul>
    </div>
  );
}

function BandChart({ finding, v }: { finding: Finding; v: BandVisual }) {
  const [ref, width] = useWidth();
  const g = bandGeometry(v, width);
  const h = 96;
  return (
    <div ref={ref} className="w-full">
      <svg width={g.width} height={h} viewBox={`0 0 ${g.width} ${h}`} role="img" aria-label={chartAlt(finding)} className="block max-w-full">
        <line x1={12} x2={g.width - 12} y1={56} y2={56} stroke="var(--border)" strokeWidth={1} />
        <rect x={g.bandL} y={46} width={Math.max(2, g.bandR - g.bandL)} height={20} rx={3} fill="var(--surface-3)" stroke={NEUTRAL} strokeWidth={1} />
        <line x1={g.center} x2={g.center} y1={42} y2={70} stroke="var(--text-primary)" strokeWidth={2} />
        <text
          x={Math.max(12, Math.min(g.width - 12, g.center))}
          y={90}
          textAnchor={g.center < 64 ? 'start' : g.center > g.width - 64 ? 'end' : 'middle'}
          fontSize={11}
          fill={SOFT}
        >
          typical {g.centerLabel}
        </text>
        {g.points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={56} r={6} fill={p.flag ? ACCENT : NEUTRAL} stroke="var(--surface)" strokeWidth={2} />
            {i < 3 ? (
              <text
                x={Math.max(10, Math.min(g.width - 10, p.x))}
                y={14 + p.row * 12}
                textAnchor={p.x < 60 ? 'start' : p.x > g.width - 60 ? 'end' : 'middle'}
                fontSize={11}
                fontWeight={600}
                fill="var(--text-primary)"
                stroke="var(--surface)"
                strokeWidth={4}
                paintOrder="stroke"
              >
                {p.label}: {p.valueLabel}
              </text>
            ) : null}
          </g>
        ))}
      </svg>
      <p className="text-xs" style={{ color: SOFT }}>
        Shaded = the normal range ({g.lowLabel} to {g.highLabel}). Dots = unusual values.
      </p>
    </div>
  );
}

function ScatterChart({ finding, v }: { finding: Finding; v: ScatterVisual }) {
  const [ref, width] = useWidth();
  const g = scatterGeometry(v, width);
  return (
    <div ref={ref} className="w-full">
      <svg width={g.width} height={g.height} viewBox={`0 0 ${g.width} ${g.height}`} role="img" aria-label={chartAlt(finding)} className="block max-w-full">
        {g.yTicks.map((t, i) => (
          <g key={i}>
            <line x1={g.plot.l} x2={g.plot.r} y1={t.y} y2={t.y} stroke="var(--border)" strokeWidth={1} />
            <text x={g.plot.l - 6} y={t.y + 4} textAnchor="end" fontSize={11} fill={SOFT}>
              {t.label}
            </text>
          </g>
        ))}
        {g.xTicks.map((t, i) => (
          <text key={i} x={t.x} y={g.plot.b + 16} textAnchor="middle" fontSize={11} fill={SOFT}>
            {t.label}
          </text>
        ))}
        {g.points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={2.8} fill={NEUTRAL} fillOpacity={0.75} />
        ))}
        {g.fit ? <line x1={g.fit[0][0]} y1={g.fit[0][1]} x2={g.fit[1][0]} y2={g.fit[1][1]} stroke={ACCENT} strokeWidth={2.5} strokeLinecap="round" /> : null}
      </svg>
      <p className="text-xs" style={{ color: SOFT }}>
        Across: {v.xLabel || 'first measure'} · Up: {v.yLabel || 'second measure'}
        {g.fit ? ' · Line: the overall direction' : ''}
      </p>
    </div>
  );
}

function ForecastChart({ finding, v }: { finding: Finding; v: ForecastVisual }) {
  const [ref, width] = useWidth();
  const g = forecastGeometry(v, width);
  const nh = v.history.length;
  const [active, setActive] = useState<number | null>(null);
  const pos = active ?? g.points.length - 1;
  const cur = g.points[Math.min(pos, g.points.length - 1)];
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    setActive(stepIndex(pos, e.key, g.points.length));
  };
  const alt = chartAlt(finding);
  return (
    <div ref={ref} className="w-full">
      <div tabIndex={0} role="group" aria-label={`${alt} Use the arrow keys to step through the points.`} onKeyDown={onKey} className="rounded-md outline-offset-2">
        <div className="flex items-baseline justify-between gap-2 px-1 text-xs" aria-live="polite" style={{ color: SOFT }}>
          <span className="truncate">{v.yLabel}</span>
          {cur ? (
            <span className="shrink-0 tabular-nums text-[var(--text-primary)]">
              {cur.label}: <b>{cur.valueLabel}</b>
              {cur.future ? ` (80% range ${cur.lowLabel} to ${cur.highLabel})` : ''}
            </span>
          ) : null}
        </div>
        <svg width={g.width} height={g.height} viewBox={`0 0 ${g.width} ${g.height}`} role="img" aria-label={alt} className="block max-w-full">
          {g.yTicks.map((t, i) => (
            <g key={i}>
              <line x1={g.plot.l} x2={g.plot.r} y1={t.y} y2={t.y} stroke="var(--border)" strokeWidth={1} />
              <text x={g.plot.l - 6} y={t.y + 4} textAnchor="end" fontSize={11} fill={SOFT}>
                {t.label}
              </text>
            </g>
          ))}
          {g.xTicks.map((t) => (
            <text key={t.i} x={t.x} y={g.height - 6} textAnchor="middle" fontSize={11} fill={SOFT}>
              {t.label}
            </text>
          ))}
          <line x1={g.splitX} x2={g.splitX} y1={g.plot.t} y2={g.plot.b} stroke={NEUTRAL} strokeWidth={1} strokeDasharray="2 4" />
          <path d={g.bandPath} fill={ACCENT} fillOpacity={0.16} stroke="none" />
          <path d={g.historyPath} fill="none" stroke="var(--text-primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          <path d={g.forecastPath} fill="none" stroke={ACCENT} strokeWidth={2.2} strokeDasharray="6 4" strokeLinejoin="round" strokeLinecap="round" />
          {g.points.filter((p) => p.i >= nh - 1 && p.i < nh).map((p) => (
            <circle key={`h${p.i}`} cx={p.x} cy={p.y} r={2.6} fill="var(--text-primary)" />
          ))}
          {g.points.filter((p) => p.future).map((p) => (
            <circle key={p.i} cx={p.x} cy={p.y} r={3.2} fill={ACCENT} stroke="var(--surface)" strokeWidth={1.5} />
          ))}
          {cur ? <circle cx={cur.x} cy={cur.y} r={5.5} fill="none" stroke="var(--text-primary)" strokeWidth={1.5} /> : null}
        </svg>
      </div>
      <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: SOFT }}>
        <li className="flex items-center gap-1.5">
          <svg width="22" height="8" aria-hidden="true">
            <line x1="0" x2="22" y1="4" y2="4" stroke="var(--text-primary)" strokeWidth={2} />
          </svg>
          What happened
        </li>
        <li className="flex items-center gap-1.5">
          <svg width="22" height="8" aria-hidden="true">
            <line x1="0" x2="22" y1="4" y2="4" stroke={ACCENT} strokeWidth={2.2} strokeDasharray="6 4" />
          </svg>
          Forecast
        </li>
        <li className="flex items-center gap-1.5">
          <svg width="22" height="10" aria-hidden="true">
            <rect x="0" y="1" width="22" height="8" fill={ACCENT} fillOpacity={0.3} />
          </svg>
          80% range
        </li>
      </ul>
    </div>
  );
}

export function FindingChart({ finding }: { finding: Finding }) {
  const v = finding.visual;
  if (!v) return null;
  switch (v.type) {
    case 'line':
      return <LineChart finding={finding} v={v} />;
    case 'bars':
      return <BarsChart v={v} />;
    case 'meter':
      return <MeterChart finding={finding} v={v} />;
    case 'band':
      return <BandChart finding={finding} v={v} />;
    case 'scatter':
      return <ScatterChart finding={finding} v={v} />;
    case 'forecast':
      return <ForecastChart finding={finding} v={v} />;
    default:
      return null;
  }
}
