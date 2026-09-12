'use client';

/**
 * Phase 3 native widgets: donut, radar, choropleth tiles, transaction list,
 * bubble grid, multi-series line, and KPI+sparkline.
 * Styling matches later glass-card natives (terracotta / #E3836C accent).
 */

import React from 'react';
import { IconTrash } from '@tabler/icons-react';
import type { ProvenanceInfo, WidgetSpec } from '../../lib/chatApi';

const PALETTE = ['#E3836C', '#3D6FE0', '#3FB68C', '#D4A017', '#8B5CF6', '#EF6C6C', '#5B8CF5', '#9EBB9A'];

function WidgetEmptyState({ title }: { title?: string }) {
  return (
    <div className="bg-[#14171B] rounded-xl p-6 border border-dashed border-white/[0.12] flex flex-col items-center justify-center text-center h-full min-h-[140px] shadow-sm">
      <p className="text-sm font-medium text-[#EDEFF2]">{title || 'No data yet'}</p>
      <p className="mt-1.5 text-[11px] font-mono text-[#8B93A1] max-w-[220px]">
        Ask the agent or bind a source — sample charts are not shown.
      </p>
    </div>
  );
}

function CitationFooter({
  provenance,
  freshness,
}: {
  provenance?: ProvenanceInfo;
  freshness?: string;
}) {
  if (!provenance && !freshness) return null;
  const kind = provenance?.kind;
  const label =
    kind === 'live_api' ? 'Live API' : kind === 'verified_db' ? 'Verified DB' : 'Synthesized AI';
  return (
    <div className="mt-3 pt-2.5 border-t border-[#4A4238]/10 dark:border-[#3A3430] flex items-center justify-between text-[11px] font-sans text-[#4A4238]/60 dark:text-[#91867E]">
      {provenance ? (
        <span className="inline-flex items-center gap-1.5 truncate">
          <span className="font-medium">{label}</span>
          <span className="opacity-40">·</span>
          <span className="truncate max-w-[140px]">{provenance.source}</span>
        </span>
      ) : (
        <span />
      )}
      <span className="text-[10px] flex-shrink-0">
        {freshness || (kind === 'synthetic_ai' || !kind ? 'Preview' : 'Live')}
      </span>
    </div>
  );
}

function shell(
  title: string,
  metric: string,
  onDelete: (() => void) | undefined,
  children: React.ReactNode,
  provenance?: ProvenanceInfo,
  freshness?: string,
) {
  return (
    <div className="glass-card dark:bg-[#211E1C] rounded-2xl p-5 border border-[#4A4238]/10 dark:border-[#3A3430] flex flex-col justify-between h-full shadow-sm hover:border-[#E3836C]/30 transition-all group relative">
      <div className="flex items-center justify-between mb-3">
        <div className="min-w-0">
          <span className="text-[11px] font-mono text-[#4A4238]/60 dark:text-[#91867E] uppercase tracking-wider block">
            {metric}
          </span>
          <h3 className="font-serif text-lg font-medium text-[#4A4238] dark:text-[#F4EDE5] truncate">
            {title}
          </h3>
        </div>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-60 hover:opacity-100! text-[#4A4238]/40 hover:text-red-500 transition-all p-1"
            title="Remove widget"
          >
            <IconTrash size={14} />
          </button>
        )}
      </div>
      {children}
      <CitationFooter provenance={provenance} freshness={freshness} />
    </div>
  );
}

function readProps(widget: WidgetSpec) {
  return (widget.props || widget) as Record<string, unknown>;
}

// ── Donut Chart ──────────────────────────────────────────────────────────────

export function DonutChartWidget({
  widget,
  onWidgetAction,
}: {
  widget: WidgetSpec;
  onWidgetAction?: (widgetId: string, action: string, payload?: unknown) => void;
}) {
  const p = readProps(widget);
  const title = String(p.title || widget.title || 'Share');
  const metric = String(p.metric || widget.metric || 'BREAKDOWN');
  const centerLabel = p.centerLabel != null ? String(p.centerLabel) : undefined;
  const slicesRaw = Array.isArray(p.slices) ? p.slices : Array.isArray(p.data) ? p.data : [];
  const slices = slicesRaw
    .map((s: any, i: number) => ({
      label: String(s.label || s.name || `Slice ${i + 1}`),
      value: typeof s.value === 'number' ? s.value : Number(s.value) || 0,
      color: String(s.color || PALETTE[i % PALETTE.length]),
    }))
    .filter((s) => s.value > 0);

  if (slices.length === 0) return <WidgetEmptyState title={title} />;

  const total = slices.reduce((a, s) => a + s.value, 0) || 1;
  const r = 42;
  const stroke = 14;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return shell(
    title,
    metric,
    onWidgetAction ? () => onWidgetAction(widget.id, 'delete') : undefined,
    <div className="flex items-center gap-4">
      <div className="relative w-28 h-28 flex-shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          {slices.map((s, i) => {
            const len = (s.value / total) * c;
            const el = (
              <circle
                key={i}
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={stroke}
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
                className="transition-all duration-700"
              />
            );
            offset += len;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-serif text-base font-bold text-[#4A4238] dark:text-[#F4EDE5] tabular-nums">
            {centerLabel || String(Math.round(total))}
          </span>
        </div>
      </div>
      <ul className="flex-1 min-w-0 space-y-1.5 max-h-32 overflow-auto">
        {slices.slice(0, 8).map((s, i) => (
          <li
            key={i}
            className="flex items-center justify-between gap-2 text-[11px] cursor-pointer hover:bg-black/[0.03] dark:hover:bg-[#292522] rounded px-1 py-0.5"
            onClick={() =>
              onWidgetAction?.(widget.id, 'filter', { dimension: metric, value: s.label })
            }
          >
            <span className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
              <span className="truncate text-[#4A4238] dark:text-[#F4EDE5]">{s.label}</span>
            </span>
            <span className="font-mono tabular-nums text-[#4A4238]/60 dark:text-[#91867E]">
              {((s.value / total) * 100).toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>,
    widget.provenance || (p.provenance as ProvenanceInfo | undefined),
    widget.freshness,
  );
}

// ── Radar Chart ──────────────────────────────────────────────────────────────

export function RadarChartWidget({
  widget,
  onWidgetAction,
}: {
  widget: WidgetSpec;
  onWidgetAction?: (widgetId: string, action: string, payload?: unknown) => void;
}) {
  const p = readProps(widget);
  const title = String(p.title || widget.title || 'Radar');
  const metric = String(p.metric || widget.metric || 'COMPARISON');
  const axes: string[] = Array.isArray(p.axes) ? p.axes.map(String) : [];
  const seriesRaw: Array<{ name: string; values: number[]; color?: string }> = Array.isArray(p.series)
    ? (p.series as any[])
    : [];
  if (axes.length < 3 || seriesRaw.length === 0) {
    return <WidgetEmptyState title={title} />;
  }

  const max = Number(p.max) || Math.max(...seriesRaw.flatMap((s) => s.values), 1);
  const cx = 80;
  const cy = 80;
  const radius = 58;
  const n = axes.length;

  const pointAt = (i: number, value: number) => {
    const angle = -Math.PI / 2 + (i / n) * 2 * Math.PI;
    const r = (Math.max(0, Math.min(value, max)) / max) * radius;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as const;
  };

  return shell(
    title,
    metric,
    onWidgetAction ? () => onWidgetAction(widget.id, 'delete') : undefined,
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 160 160" className="w-full max-w-[200px] h-auto">
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <polygon
            key={t}
            fill="none"
            stroke="currentColor"
            className="text-[#4A4238]/15 dark:text-[#3A3430]"
            strokeWidth="1"
            points={axes
              .map((_, i) => {
                const [x, y] = pointAt(i, max * t);
                return `${x},${y}`;
              })
              .join(' ')}
          />
        ))}
        {axes.map((axis, i) => {
          const [x, y] = pointAt(i, max);
          return (
            <g key={axis}>
              <line
                x1={cx}
                y1={cy}
                x2={x}
                y2={y}
                stroke="currentColor"
                className="text-[#4A4238]/20 dark:text-[#3A3430]"
                strokeWidth="1"
              />
              <text
                x={cx + (radius + 12) * Math.cos(-Math.PI / 2 + (i / n) * 2 * Math.PI)}
                y={cy + (radius + 12) * Math.sin(-Math.PI / 2 + (i / n) * 2 * Math.PI)}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-[#4A4238]/70 dark:fill-[#91867E] text-[8px]"
                fontSize="8"
              >
                {axis.length > 10 ? `${axis.slice(0, 9)}…` : axis}
              </text>
            </g>
          );
        })}
        {seriesRaw.map((s, si) => {
          const color = s.color || PALETTE[si % PALETTE.length];
          const pts = axes
            .map((_, i) => {
              const v = s.values[i] ?? 0;
              const [x, y] = pointAt(i, v);
              return `${x},${y}`;
            })
            .join(' ');
          return (
            <polygon
              key={si}
              points={pts}
              fill={color}
              fillOpacity={0.18}
              stroke={color}
              strokeWidth="2"
            />
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-2 mt-1 justify-center">
        {seriesRaw.map((s, i) => (
          <span key={i} className="text-[10px] font-mono flex items-center gap-1 text-[#4A4238]/70 dark:text-[#91867E]">
            <span className="w-2 h-2 rounded-full" style={{ background: s.color || PALETTE[i % PALETTE.length] }} />
            {s.name}
          </span>
        ))}
      </div>
    </div>,
    widget.provenance || (p.provenance as ProvenanceInfo | undefined),
    widget.freshness,
  );
}

// ── Choropleth (honest region tiles — not a fake world map) ──────────────────

export function ChoroplethMapWidget({
  widget,
  onWidgetAction,
}: {
  widget: WidgetSpec;
  onWidgetAction?: (widgetId: string, action: string, payload?: unknown) => void;
}) {
  const p = readProps(widget);
  const title = String(p.title || widget.title || 'Regions');
  const metric = String(p.metric || widget.metric || 'GEO');
  const regionsRaw = Array.isArray(p.regions) ? p.regions : Array.isArray(p.data) ? p.data : [];
  const regions = regionsRaw.map((r: any, i: number) => ({
    id: String(r.id || r.label || `r${i}`),
    label: String(r.label || r.id || `Region ${i + 1}`),
    value: typeof r.value === 'number' ? r.value : Number(r.value) || 0,
  }));
  if (regions.length === 0) return <WidgetEmptyState title={title} />;

  const max = Math.max(...regions.map((r) => r.value), 1);
  const scale = String(p.colorScale || 'warm');
  const colorAt = (t: number) => {
    const clamped = Math.max(0, Math.min(1, t));
    if (scale === 'cool') return `rgba(61, 111, 224, ${0.2 + clamped * 0.75})`;
    if (scale === 'emerald') return `rgba(63, 182, 140, ${0.2 + clamped * 0.75})`;
    return `rgba(227, 131, 108, ${0.2 + clamped * 0.75})`;
  };

  return shell(
    title,
    metric,
    onWidgetAction ? () => onWidgetAction(widget.id, 'delete') : undefined,
    <>
      <p className="text-[10px] font-mono text-[#4A4238]/50 dark:text-[#91867E] mb-2">
        Region intensity tiles (not a geographic basemap)
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {regions.slice(0, 12).map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() =>
              onWidgetAction?.(widget.id, 'filter', { dimension: metric, value: r.label })
            }
            className="rounded-xl p-3 text-left border border-[#4A4238]/10 dark:border-[#3A3430] hover:border-[#E3836C]/40 transition-colors cursor-pointer"
            style={{ background: colorAt(r.value / max) }}
          >
            <div className="text-[11px] font-medium text-[#4A4238] dark:text-[#F4EDE5] truncate">
              {r.label}
            </div>
            <div className="text-sm font-mono font-semibold tabular-nums text-[#4A4238] dark:text-[#F4EDE5] mt-1">
              {r.value.toLocaleString()}
            </div>
          </button>
        ))}
      </div>
    </>,
    widget.provenance || (p.provenance as ProvenanceInfo | undefined),
    widget.freshness,
  );
}

// ── Transaction List ─────────────────────────────────────────────────────────

export function TransactionListWidget({
  widget,
  onWidgetAction,
}: {
  widget: WidgetSpec;
  onWidgetAction?: (widgetId: string, action: string, payload?: unknown) => void;
}) {
  const p = readProps(widget);
  const title = String(p.title || widget.title || 'Transactions');
  const metric = String(p.metric || widget.metric || 'LEDGER');
  const rowsRaw: Array<Record<string, unknown>> = Array.isArray(p.rows)
    ? (p.rows as any[])
    : Array.isArray(p.data)
      ? (p.data as any[])
      : [];
  const limit = Math.min(Number(p.limit) || 12, 40);
  const rows = rowsRaw.slice(0, limit);
  if (rows.length === 0) return <WidgetEmptyState title={title} />;

  const normalize = (row: Record<string, unknown>) => {
    const time = String(row.time || row.date || row.order_date || row.created_at || '—');
    const description = String(
      row.description || row.memo || row.label || row.region || row.name || Object.values(row)[0] || '—',
    );
    const amountRaw = row.amount ?? row.revenue ?? row.value ?? row.total;
    const amount =
      typeof amountRaw === 'number'
        ? amountRaw
        : amountRaw != null
          ? Number(amountRaw)
          : null;
    const status = row.status != null ? String(row.status) : undefined;
    return { time, description, amount, status };
  };

  return shell(
    title,
    metric,
    onWidgetAction ? () => onWidgetAction(widget.id, 'delete') : undefined,
    <div className="divide-y divide-[#4A4238]/8 dark:divide-[#3A3430]/50 max-h-64 overflow-auto">
      {rows.map((raw, i) => {
        const row = normalize(raw);
        return (
          <div
            key={i}
            className="py-2 flex items-center justify-between gap-2 hover:bg-black/[0.02] dark:hover:bg-[#292522] px-1 rounded cursor-pointer"
            onClick={() =>
              onWidgetAction?.(widget.id, 'filter', {
                dimension: 'description',
                value: row.description,
              })
            }
          >
            <div className="min-w-0">
              <div className="text-[12px] font-medium text-[#4A4238] dark:text-[#F4EDE5] truncate">
                {row.description}
              </div>
              <div className="text-[10px] font-mono text-[#4A4238]/50 dark:text-[#91867E]">
                {row.time}
                {row.status ? ` · ${row.status}` : ''}
              </div>
            </div>
            <div
              className={`text-[13px] font-mono font-semibold tabular-nums flex-shrink-0 ${
                row.amount != null && row.amount < 0
                  ? 'text-[#D97870]'
                  : 'text-[#4A4238] dark:text-[#F4EDE5]'
              }`}
            >
              {row.amount != null
                ? row.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })
                : '—'}
            </div>
          </div>
        );
      })}
    </div>,
    widget.provenance || (p.provenance as ProvenanceInfo | undefined),
    widget.freshness,
  );
}

// ── Bubble Grid ──────────────────────────────────────────────────────────────

export function BubbleGridWidget({
  widget,
  onWidgetAction,
}: {
  widget: WidgetSpec;
  onWidgetAction?: (widgetId: string, action: string, payload?: unknown) => void;
}) {
  const p = readProps(widget);
  const title = String(p.title || widget.title || 'Bubble Grid');
  const metric = String(p.metric || widget.metric || 'SCATTER');
  const pointsRaw = Array.isArray(p.points) ? p.points : Array.isArray(p.data) ? p.data : [];
  const points = pointsRaw.map((pt: any, i: number) => ({
    x: Number(pt.x) || 0,
    y: Number(pt.y) || 0,
    r: Math.max(Number(pt.r) || 1, 0.1),
    label: String(pt.label || `P${i + 1}`),
    group: pt.group != null ? String(pt.group) : undefined,
  }));
  if (points.length === 0) return <WidgetEmptyState title={title} />;

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const rs = points.map((p) => p.r);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const maxR = Math.max(...rs, 1);
  const pad = 24;
  const W = 280;
  const H = 160;
  const sx = (v: number) => pad + ((v - minX) / (maxX - minX || 1)) * (W - pad * 2);
  const sy = (v: number) => H - pad - ((v - minY) / (maxY - minY || 1)) * (H - pad * 2);
  const sr = (v: number) => 4 + (v / maxR) * 18;

  return shell(
    title,
    metric,
    onWidgetAction ? () => onWidgetAction(widget.id, 'delete') : undefined,
    <>
      {(p.xLabel || p.yLabel) && (
        <p className="text-[10px] font-mono text-[#4A4238]/50 dark:text-[#91867E] mb-1">
          {String(p.xLabel || 'X')} × {String(p.yLabel || 'Y')} · size = magnitude
        </p>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="#4A423840" />
        <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke="#4A423840" />
        {points.map((pt, i) => (
          <circle
            key={i}
            cx={sx(pt.x)}
            cy={sy(pt.y)}
            r={sr(pt.r)}
            fill={PALETTE[i % PALETTE.length]}
            fillOpacity={0.55}
            stroke={PALETTE[i % PALETTE.length]}
            strokeWidth={1}
            className="cursor-pointer"
            onClick={() =>
              onWidgetAction?.(widget.id, 'filter', { dimension: 'label', value: pt.label })
            }
          >
            <title>{`${pt.label}: (${pt.x}, ${pt.y}) r=${pt.r}`}</title>
          </circle>
        ))}
      </svg>
    </>,
    widget.provenance || (p.provenance as ProvenanceInfo | undefined),
    widget.freshness,
  );
}

// ── Multi-series / stacked-friendly line chart ───────────────────────────────

export function MultiSeriesChartWidget({
  widget,
  onWidgetAction,
}: {
  widget: WidgetSpec;
  onWidgetAction?: (widgetId: string, action: string, payload?: unknown) => void;
}) {
  const p = readProps(widget);
  const title = String(p.title || widget.title || 'Multi-series');
  const metric = String(p.metric || widget.metric || 'TREND');
  const seriesRaw: Array<{ name: string; data: Array<{ x: string; y: number }>; color?: string }> =
    Array.isArray(p.series) ? (p.series as any[]) : [];
  if (seriesRaw.length === 0 || seriesRaw.every((s) => !s.data?.length)) {
    return <WidgetEmptyState title={title} />;
  }

  const allY = seriesRaw.flatMap((s) => (s.data || []).map((d) => Number(d.y) || 0));
  const minY = Math.min(...allY, 0);
  const maxY = Math.max(...allY, 1);
  const range = maxY - minY || 1;
  const labels = seriesRaw[0]?.data?.map((d) => String(d.x)) || [];
  const n = Math.max(labels.length, 2);

  return shell(
    title,
    metric,
    onWidgetAction ? () => onWidgetAction(widget.id, 'delete') : undefined,
    <>
      <svg viewBox="0 0 300 140" className="w-full h-auto">
        {seriesRaw.map((s, si) => {
          const color = s.color || PALETTE[si % PALETTE.length];
          const pts = (s.data || [])
            .map((d, i) => {
              const x = 20 + (i / Math.max(n - 1, 1)) * 260;
              const y = 120 - ((Number(d.y) - minY) / range) * 95;
              return `${x},${y}`;
            })
            .join(' ');
          return (
            <polyline
              key={si}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={pts}
            />
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-2 mt-1">
        {seriesRaw.map((s, i) => (
          <span key={i} className="text-[10px] font-mono flex items-center gap-1 text-[#4A4238]/70 dark:text-[#91867E]">
            <span className="w-2 h-2 rounded-full" style={{ background: s.color || PALETTE[i % PALETTE.length] }} />
            {s.name}
          </span>
        ))}
      </div>
    </>,
    widget.provenance || (p.provenance as ProvenanceInfo | undefined),
    widget.freshness,
  );
}

// ── KPI + Sparkline ──────────────────────────────────────────────────────────

export function KpiSparklineWidget({
  widget,
  onWidgetAction,
}: {
  widget: WidgetSpec;
  onWidgetAction?: (widgetId: string, action: string, payload?: unknown) => void;
}) {
  const p = readProps(widget);
  const title = String(p.title || widget.title || 'KPI');
  const metric = String(p.metric || widget.metric || 'KPI');
  const value = p.value !== undefined ? String(p.value) : '—';
  const change = p.change != null ? String(p.change) : undefined;
  const positive = p.positive !== false;
  const spark: number[] = Array.isArray(p.sparkline)
    ? (p.sparkline as any[]).map((v) => Number(v) || 0)
    : [];

  let sparkSvg: React.ReactNode = null;
  if (spark.length >= 2) {
    const min = Math.min(...spark);
    const max = Math.max(...spark);
    const rng = max - min || 1;
    const w = 120;
    const h = 36;
    const pts = spark
      .map((v, i) => {
        const x = (i / (spark.length - 1)) * (w - 4) + 2;
        const y = h - ((v - min) / rng) * (h - 8) - 4;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
    const stroke = positive ? '#3FB68C' : '#EF6C6C';
    sparkSvg = (
      <svg width={w} height={h} className="overflow-visible">
        <polyline
          fill="none"
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={pts}
        />
      </svg>
    );
  }

  return shell(
    title,
    metric,
    onWidgetAction ? () => onWidgetAction(widget.id, 'delete') : undefined,
    <div className="flex items-end justify-between gap-3">
      <div>
        <div className="text-[28px] font-medium leading-none tabular-nums text-[#4A4238] dark:text-[#F4EDE5]">
          {value}
        </div>
        {change && (
          <span
            className={`inline-block mt-2 text-xs font-mono font-medium px-1.5 py-0.5 rounded ${
              positive
                ? 'text-[#3FB68C] bg-[#3FB68C]/10 border border-[#3FB68C]/20'
                : 'text-[#EF6C6C] bg-[#EF6C6C]/10 border border-[#EF6C6C]/20'
            }`}
          >
            {change}
          </span>
        )}
      </div>
      {sparkSvg}
    </div>,
    widget.provenance || (p.provenance as ProvenanceInfo | undefined),
    widget.freshness,
  );
}
