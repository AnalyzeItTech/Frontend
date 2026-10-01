'use client';

import { useId, useMemo, useState } from 'react';
import { chartGeometry, formatValue } from '../../lib/chatExtras.mjs';

export interface ChartSpec {
  type: 'line' | 'bar';
  title: string;
  unit: string;
  xLabel: string;
  source: string;
  sourceUrl: string;
  series: Array<{ name: string; points: Array<[number, number]> }>;
}

/** Dependency-free SVG chart for research answers: hover/focus readout, legend, data-table fallback. */
export function ChartCard({ chart }: { chart: ChartSpec }) {
  const uid = useId();
  const geo = useMemo(() => chartGeometry(chart, 560, 240), [chart]);
  const [hover, setHover] = useState<{ si: number; pi: number } | null>(null);
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const active = hover ? geo.series[hover.si]?.points[hover.pi] : null;
  const activeName = hover ? geo.series[hover.si]?.name : '';
  const years = useMemo(() => [...new Set(chart.series.flatMap((s) => s.points.map((p) => p[0])))].sort((a, b) => a - b), [chart]);

  const toggle = (i: number) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else if (next.size < chart.series.length - 1) next.add(i); // always keep at least one visible
      return next;
    });

  return (
    <figure className="app-card mt-3 space-y-2 p-4" aria-labelledby={`${uid}-t`}>
      <figcaption id={`${uid}-t`} className="text-sm font-medium text-[var(--text-primary)]">
        {chart.title}
      </figcaption>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Series">
        {geo.series.map((s, i) => (
          <button
            key={s.name}
            type="button"
            onClick={() => toggle(i)}
            aria-pressed={!hidden.has(i)}
            className={`flex items-center gap-1.5 rounded-full border border-[var(--border)] px-2.5 py-1 text-xs transition ${
              hidden.has(i) ? 'opacity-40' : ''
            }`}
          >
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
            {s.name}
          </button>
        ))}
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${geo.width} ${geo.height}`}
          role="img"
          aria-label={`${chart.title}. ${chart.series.map((s) => s.name).join(', ')}.`}
          className="h-auto w-full"
          onMouseLeave={() => setHover(null)}
        >
          {geo.yTicks.map((t) => (
            <g key={t.v}>
              <line x1={geo.pad.l} x2={geo.width - geo.pad.r} y1={t.y} y2={t.y} stroke="var(--border)" strokeWidth={1} />
              <text x={geo.pad.l - 8} y={t.y + 3} textAnchor="end" fontSize={10} fill="var(--text-muted)">
                {formatValue(t.v, chart.unit)}
              </text>
            </g>
          ))}
          {geo.xTicks.map((t) => (
            <text key={t.v} x={t.x} y={geo.height - 8} textAnchor="middle" fontSize={10} fill="var(--text-muted)">
              {t.v}
            </text>
          ))}
          {geo.series.map((s, si) =>
            hidden.has(si) ? null : (
              <g key={s.name}>
                <path d={s.d} fill="none" stroke={s.color} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />
                {s.points.map((p, pi) => (
                  <circle
                    key={pi}
                    cx={p.x}
                    cy={p.y}
                    r={hover?.si === si && hover?.pi === pi ? 5 : 3}
                    fill={s.color}
                    tabIndex={0}
                    onMouseEnter={() => setHover({ si, pi })}
                    onFocus={() => setHover({ si, pi })}
                    onBlur={() => setHover(null)}
                    aria-label={`${s.name}, ${p.xv}: ${formatValue(p.yv, chart.unit)}`}
                  />
                ))}
              </g>
            ),
          )}
        </svg>
        {active ? (
          <div
            className="pointer-events-none absolute z-10 whitespace-nowrap rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-xs text-[var(--text-primary)] shadow-lg"
            style={{
              left: `${(active.x / geo.width) * 100}%`,
              top: `${(active.y / geo.height) * 100}%`,
              // keep the readout inside the card near the left/right edges
              transform: `translate(${(active.x / geo.width) < 0.2 ? '0' : (active.x / geo.width) > 0.8 ? '-100%' : '-50%'}, -130%)`,
            }}
          >
            <b>{activeName}</b> · {active.xv}: {formatValue(active.yv, chart.unit)}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
        <span>{chart.unit}</span>
        {chart.source ? (
          chart.sourceUrl ? (
            <a href={chart.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
              Source: {chart.source}
            </a>
          ) : (
            <span>Source: {chart.source}</span>
          )
        ) : null}
      </div>

      <details className="text-xs">
        <summary className="cursor-pointer text-[var(--text-muted)]">View data table</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className="py-1 pr-3">{chart.xLabel || 'X'}</th>
                {chart.series.map((s) => (
                  <th key={s.name} className="py-1 pr-3">
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {years.map((y) => (
                <tr key={y} className="border-t border-[var(--border)]">
                  <td className="py-1 pr-3">{y}</td>
                  {chart.series.map((s) => {
                    const pt = s.points.find((p) => p[0] === y);
                    return (
                      <td key={s.name} className="py-1 pr-3">
                        {pt ? formatValue(pt[1], chart.unit) : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
