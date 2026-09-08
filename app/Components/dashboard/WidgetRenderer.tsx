'use client';

import React, { useRef, useState, useEffect } from 'react';
import {
  IconAlertTriangle,
  IconTrash,
  IconSparkles,
  IconArrowUp,
  IconArrowDown,
  IconColumns,
  IconInfoCircle,
  IconCheck,
  IconX,
  IconFilter,
  IconDatabase,
  IconActivity,
  IconLayersLinked,
  IconChartDots,
  IconChartHistogram,
  IconChartFunnel,
  IconFlame,
  IconLock,
  IconRefresh,
  IconUser,
  IconPin,
  IconCopy,
} from '@tabler/icons-react';
import { useTheme } from '../ui/ThemeProvider';
import { resolveWidgetData, type WidgetSpec, type ProvenanceInfo, type ChartAnnotation } from '../../lib/chatApi';

// ── Universal Citation & Provenance Footer ───────────────────────────────────

export function CitationFooter({
  provenance,
  freshness,
  binding,
  onRefresh,
}: {
  provenance?: ProvenanceInfo;
  freshness?: string;
  binding?: unknown;
  onRefresh?: () => void;
}) {
  if (!provenance && !freshness && !binding) return null;

  const getKindConfig = (kind?: string) => {
    switch (kind) {
      case 'live_api':
        return {
          dotColor: 'bg-[#9EBBB0]',
          badgeClass: 'bg-[#9EBBB0]/10 text-[#9EBBB0] dark:bg-[#283329] dark:text-[#9EBB9A] border-[#9EBBB0]/20 dark:border-[#9EBB9A]/30',
          label: 'Live API',
        };
      case 'verified_db':
        return {
          dotColor: 'bg-[#91AEB5]',
          badgeClass: 'bg-[#91AEB5]/10 text-[#91AEB5] dark:bg-[#253034] dark:text-[#91AEB5] border-[#91AEB5]/20 dark:border-[#91AEB5]/30',
          label: 'Verified DB',
        };
      case 'synthetic_ai':
      default:
        return {
          dotColor: 'bg-[#A99BB5]',
          badgeClass: 'bg-[#A99BB5]/10 text-[#A99BB5] dark:bg-[#2D2833] dark:text-[#A99BB5] border-[#A99BB5]/20 dark:border-[#A99BB5]/30',
          label: 'Synthesized AI',
        };
    }
  };

  const badge = provenance ? getKindConfig(provenance.kind) : null;
  const lastRefreshed = (binding as any)?.last_refreshed_at
    ? `Refreshed ${new Date((binding as any).last_refreshed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : null;

  return (
    <div className="mt-3 pt-2.5 border-t border-[#4A4238]/10 dark:border-[#3A3430] flex items-center justify-between text-[10px] font-mono text-[#4A4238]/60 dark:text-[#91867E]">
      {badge && provenance ? (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${badge.badgeClass}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${badge.dotColor} flex-shrink-0`} />
          <span className="font-medium">{badge.label}</span>
          <span className="opacity-40">·</span>
          <span className="truncate max-w-[130px]">{provenance.source}</span>
        </span>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-1.5">
        <span className="text-[9px] opacity-70 flex-shrink-0">
          {lastRefreshed || provenance?.timestamp || freshness || 'Live'}
        </span>
        {onRefresh && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRefresh();
            }}
            className="p-1 rounded hover:bg-black/5 dark:hover:bg-[#292522] text-[#4A4238]/60 dark:text-[#91867E] hover:text-[#E3836C] transition-all cursor-pointer"
            title="Refresh data"
          >
            <IconRefresh size={11} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── 1. Native Metric Card Widget ─────────────────────────────────────────────

export function MetricCardWidget({
  widget,
  onWidgetAction,
}: {
  widget: WidgetSpec;
  onWidgetAction?: (widgetId: string, action: string, payload?: unknown) => void;
}) {
  const p = widget.props || widget;
  const metric = String(p.metric || widget.metric || 'Metric');
  const title = String(p.title || widget.title || 'Metric');
  const rawValue = p.value !== undefined ? p.value : widget.value;
  const value = rawValue !== undefined && rawValue !== null ? String(rawValue) : '—';
  const change = p.change !== undefined ? String(p.change) : widget.change;
  const positive = p.positive ?? widget.positive;

  return (
    <div className="glass-card dark:bg-[#211E1C] rounded-2xl p-5 border border-[#4A4238]/10 dark:border-[#3A3430] flex flex-col justify-between h-full shadow-sm hover:border-[#E3836C]/30 transition-all group relative">
      <div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono text-[#4A4238]/60 dark:text-[#91867E] uppercase tracking-wider block mb-1">
            {metric}
          </span>
          {onWidgetAction && (
            <button
              type="button"
              onClick={() => onWidgetAction(widget.id, 'delete')}
              className="opacity-0 group-hover:opacity-60 hover:opacity-100! text-[#4A4238]/40 hover:text-red-500 transition-all p-1"
              title="Remove widget"
            >
              <IconTrash size={14} />
            </button>
          )}
        </div>
        <h3 className="font-serif text-lg font-medium text-[#4A4238] dark:text-[#F4EDE5]">
          {title}
        </h3>
      </div>
      <div className="mt-4 flex items-baseline justify-between">
        <span className="font-serif text-2xl sm:text-3xl font-bold text-[#4A4238] dark:text-[#F4EDE5]">
          {value}
        </span>
        {change && (
          <span
            className={`text-xs font-mono font-semibold flex items-center gap-1 ${
              positive !== false ? 'text-[#9EBB9A]' : 'text-[#D97870]'
            }`}
          >
            {change}
          </span>
        )}
      </div>

      <CitationFooter
        provenance={widget.provenance || (p as any)?.provenance}
        freshness={widget.freshness}
        binding={widget.binding || (p as any)?.binding}
        onRefresh={onWidgetAction ? () => onWidgetAction(widget.id, 'refresh') : undefined}
      />
    </div>
  );
}

// ── 2. Native Line Chart Widget ──────────────────────────────────────────────

export function LineChartWidget({
  widget,
  onWidgetAction,
}: {
  widget: WidgetSpec;
  onWidgetAction?: (widgetId: string, action: string, payload?: unknown) => void;
}) {
  const p = widget.props || widget;
  const metric = String(p.metric || widget.metric || 'Trend Line');
  const title = String(p.title || widget.title || 'Trend Line');
  const rawData = p.data || widget.data;
  const data: Array<{ date: string; value: number }> = Array.isArray(rawData) && rawData.length > 0
    ? rawData.map((d: any, idx: number) => ({
        date: String(d.date || d.label || `T${idx + 1}`),
        value: typeof d.value === 'number' ? d.value : Number(d.value) || 0,
      }))
    : [
        { date: '09:30', value: 478 },
        { date: '11:30', value: 481 },
        { date: '13:30', value: 483 },
        { date: '15:30', value: 485.2 },
      ];

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const minVal = Math.min(...data.map((d) => d.value), 0);
  const range = maxVal - minVal || 1;

  const points = data
    .map((d, i) => {
      const x = 30 + (i / Math.max(data.length - 1, 1)) * 240;
      const y = 90 - ((d.value - minVal) / range) * 70;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="glass-card dark:bg-[#211E1C] rounded-2xl p-5 border border-[#4A4238]/10 dark:border-[#3A3430] flex flex-col justify-between h-full shadow-sm hover:border-[#E3836C]/30 transition-all group relative">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-[11px] font-mono text-[#4A4238]/60 dark:text-[#91867E] uppercase tracking-wider block">
            {metric}
          </span>
          <h3 className="font-serif text-lg font-medium text-[#4A4238] dark:text-[#F4EDE5]">
            {title}
          </h3>
        </div>
        {onWidgetAction && (
          <button
            type="button"
            onClick={() => onWidgetAction(widget.id, 'delete')}
            className="opacity-0 group-hover:opacity-60 hover:opacity-100! text-[#4A4238]/40 hover:text-red-500 transition-all p-1"
            title="Remove widget"
          >
            <IconTrash size={14} />
          </button>
        )}
      </div>

      <div className="w-full h-32 my-2">
        <svg viewBox="0 0 300 110" className="w-full h-full overflow-visible">
          <polyline
            fill="none"
            stroke="#E3836C"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
          {data.map((d, i) => {
            const cx = 30 + (i / Math.max(data.length - 1, 1)) * 240;
            const cy = 90 - ((d.value - minVal) / range) * 70;
            return (
              <g key={i}>
                <circle cx={cx} cy={cy} r="3.5" fill="#E3836C" />
                <text
                  x={cx}
                  y={105}
                  textAnchor="middle"
                  className="fill-[#4A4238]/40 dark:fill-[#91867E] text-[9px] font-mono"
                >
                  {d.date}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <CitationFooter
        provenance={widget.provenance || (p as any)?.provenance}
        freshness={widget.freshness}
        binding={widget.binding || (p as any)?.binding}
        onRefresh={onWidgetAction ? () => onWidgetAction(widget.id, 'refresh') : undefined}
      />
    </div>
  );
}

// ── 3. Native Bar Chart Widget ───────────────────────────────────────────────

export function BarChartWidget({
  widget,
  onWidgetAction,
}: {
  widget: WidgetSpec;
  onWidgetAction?: (widgetId: string, action: string, payload?: unknown) => void;
}) {
  const p = widget.props || widget;
  const metric = String(p.metric || widget.metric || 'Distribution');
  const title = String(p.title || widget.title || 'Distribution');
  const rawData = p.data || widget.data;
  const data: Array<{ label: string; value: number }> = Array.isArray(rawData) && rawData.length > 0
    ? rawData.map((d: any, idx: number) => ({
        label: String(d.label || d.date || `Q${idx + 1}`),
        value: typeof d.value === 'number' ? d.value : Number(d.value) || 0,
      }))
    : [
        { label: 'Q1', value: 40 },
        { label: 'Q2', value: 65 },
        { label: 'Q3', value: 85 },
        { label: 'Q4', value: 110 },
      ];

  const maxVal = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="glass-card dark:bg-[#211E1C] rounded-2xl p-5 border border-[#4A4238]/10 dark:border-[#3A3430] flex flex-col justify-between h-full shadow-sm hover:border-[#E3836C]/30 transition-all group relative">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-[11px] font-mono text-[#4A4238]/60 dark:text-[#91867E] uppercase tracking-wider block">
            {metric}
          </span>
          <h3 className="font-serif text-lg font-medium text-[#4A4238] dark:text-[#F4EDE5]">
            {title}
          </h3>
        </div>
        {onWidgetAction && (
          <button
            type="button"
            onClick={() => onWidgetAction(widget.id, 'delete')}
            className="opacity-0 group-hover:opacity-60 hover:opacity-100! text-[#4A4238]/40 hover:text-red-500 transition-all p-1"
            title="Remove widget"
          >
            <IconTrash size={14} />
          </button>
        )}
      </div>
      <div className="w-full h-32 flex items-end justify-around gap-2 pt-4">
        {data.map((item, idx) => {
          const heightPct = Math.round((item.value / maxVal) * 100);
          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
              <span className="text-[10px] font-mono text-[#4A4238]/60 dark:text-[#91867E]">
                {item.value}
              </span>
              <div
                className="w-full max-w-[36px] bg-[#E3836C]/80 hover:bg-[#E3836C] rounded-t-md transition-all shadow-xs"
                style={{ height: `${Math.max(heightPct, 8)}%` }}
              />
              <span className="text-[10px] font-mono text-[#4A4238]/60 dark:text-[#91867E]">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      <CitationFooter
        provenance={widget.provenance || (p as any)?.provenance}
        freshness={widget.freshness}
        binding={widget.binding || (p as any)?.binding}
        onRefresh={onWidgetAction ? () => onWidgetAction(widget.id, 'refresh') : undefined}
      />
    </div>
  );
}

// ── 4. Native Table Widget ───────────────────────────────────────────────────

export function TableWidget({
  widget,
  onWidgetAction,
}: {
  widget: WidgetSpec;
  onWidgetAction?: (widgetId: string, action: string, payload?: unknown) => void;
}) {
  const p = widget.props || widget;
  const metric = String(p.metric || widget.metric || 'Tabular Data');
  const title = String(p.title || widget.title || 'Tabular Data');
  const rawData = p.data || widget.data;
  const rows: Array<Record<string, unknown>> = Array.isArray(rawData) && rawData.length > 0
    ? (rawData as Array<Record<string, unknown>>)
    : [
        { region: 'US-East', status: 'Optimal', latency: '22ms' },
        { region: 'EU-Central', status: 'Optimal', latency: '28ms' },
        { region: 'AP-South', status: 'Active', latency: '41ms' },
      ];
  const keys = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="glass-card dark:bg-[#211E1C] rounded-2xl p-5 border border-[#4A4238]/10 dark:border-[#3A3430] flex flex-col justify-between h-full shadow-sm group relative">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-[11px] font-mono text-[#4A4238]/60 dark:text-[#91867E] uppercase tracking-wider block">
            {metric}
          </span>
          <h3 className="font-serif text-lg font-medium text-[#4A4238] dark:text-[#F4EDE5]">
            {title}
          </h3>
        </div>
        {onWidgetAction && (
          <button
            type="button"
            onClick={() => onWidgetAction(widget.id, 'delete')}
            className="opacity-0 group-hover:opacity-60 hover:opacity-100! text-[#4A4238]/40 hover:text-red-500 transition-all p-1"
            title="Remove widget"
          >
            <IconTrash size={14} />
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-[#4A4238]/10 dark:border-[#3A3430] text-[#4A4238]/60 dark:text-[#91867E]">
              {keys.map((k) => (
                <th key={k} className="py-1.5 px-2 capitalize">
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rIdx) => (
              <tr
                key={rIdx}
                className="border-b border-[#4A4238]/05 dark:border-[#3A3430]/40 hover:bg-black/5 dark:hover:bg-[#292522]"
              >
                {keys.map((k) => (
                  <td key={k} className="py-1.5 px-2 text-[#4A4238] dark:text-[#C5B9AE]">
                    {String(row[k] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CitationFooter
        provenance={widget.provenance || (p as any)?.provenance}
        freshness={widget.freshness}
        binding={widget.binding || (p as any)?.binding}
        onRefresh={onWidgetAction ? () => onWidgetAction(widget.id, 'refresh') : undefined}
      />
    </div>
  );
}

// ── 5. Native Text Block Widget ──────────────────────────────────────────────

export function TextBlockWidget({
  widget,
  onWidgetAction,
}: {
  widget: WidgetSpec;
  onWidgetAction?: (widgetId: string, action: string, payload?: unknown) => void;
}) {
  const p: any = widget.props || widget;
  const metric = String(p.metric || widget.metric || 'Analysis Note');
  const title = String(p.title || widget.title || 'Summary & Insights');
  const heading = p.heading ? String(p.heading) : '';
  const body = String(p.body || p.content || 'No text content provided.');
  const variant = (p.variant || 'insight') as 'insight' | 'warning' | 'summary';

  const variantStyles = {
    insight: 'border-[#91AEB5]/30 bg-[#253034]/20 text-[#91AEB5] dark:border-[#91AEB5]/30 dark:bg-[#253034]/30 dark:text-[#91AEB5]',
    warning: 'border-[#D9AD70]/30 bg-[#352D20]/20 text-[#D9AD70] dark:border-[#D9AD70]/30 dark:bg-[#352D20]/30 dark:text-[#D9AD70]',
    summary: 'border-[#4A4238]/10 dark:border-[#3A3430] bg-black/[0.02] dark:bg-[#211E1C]',
  };

  const paragraphs = body.split('\n\n').filter(Boolean);

  return (
    <div className={`glass-card rounded-2xl p-5 border flex flex-col justify-between h-full shadow-sm transition-all group relative ${variantStyles[variant] || variantStyles.summary}`}>
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            {variant === 'insight' ? (
              <IconSparkles size={14} className="text-[#91AEB5]" />
            ) : variant === 'warning' ? (
              <IconAlertTriangle size={14} className="text-[#D9AD70]" />
            ) : (
              <IconInfoCircle size={14} className="text-[#E3836C]" />
            )}
            <span className="text-[11px] font-mono text-[#4A4238]/60 dark:text-[#91867E] uppercase tracking-wider block">
              {metric}
            </span>
          </div>
          {onWidgetAction && (
            <button
              type="button"
              onClick={() => onWidgetAction(widget.id, 'delete')}
              className="opacity-0 group-hover:opacity-60 hover:opacity-100! text-[#4A4238]/40 hover:text-red-500 transition-all p-1"
              title="Remove widget"
            >
              <IconTrash size={14} />
            </button>
          )}
        </div>
        <h3 className="font-serif text-lg font-medium text-[#4A4238] dark:text-[#F4EDE5]">
          {title}
        </h3>
        {heading && heading !== title && (
          <h4 className="text-xs font-mono font-semibold text-[#4A4238]/80 dark:text-[#C5B9AE] mt-1 mb-2">
            {heading}
          </h4>
        )}
      </div>
      <div className="mt-3 space-y-2 text-xs leading-relaxed text-[#4A4238]/85 dark:text-[#C5B9AE]">
        {paragraphs.map((pText, idx) => {
          if (pText.trim().startsWith('- ') || pText.trim().startsWith('• ')) {
            const bullets = pText.split('\n').map((l) => l.replace(/^[-•]\s*/, '').trim()).filter(Boolean);
            return (
              <ul key={idx} className="space-y-1 pl-4 list-disc marker:text-[#E3836C]">
                {bullets.map((b, bIdx) => (
                  <li key={bIdx} className="font-sans">{b}</li>
                ))}
              </ul>
            );
          }
          return <p key={idx} className="font-sans">{pText}</p>;
        })}
      </div>

      <CitationFooter
        provenance={widget.provenance || (p as any)?.provenance}
        freshness={widget.freshness}
      />
    </div>
  );
}

// ── 6. Native Progress Ring Widget ───────────────────────────────────────────

export function ProgressRingWidget({
  widget,
  onWidgetAction,
}: {
  widget: WidgetSpec;
  onWidgetAction?: (widgetId: string, action: string, payload?: unknown) => void;
}) {
  const p = widget.props || widget;
  const metric = String(p.metric || widget.metric || 'Progress');
  const title = String(p.title || widget.title || 'Target Progress');
  const rawPct = (p as any).percent !== undefined ? (p as any).percent : p.value;
  const percent = Math.min(Math.max(Number(rawPct) || 0, 0), 100);
  const label = String((p as any).label || `${percent}% completed`);
  const sublabel = (p as any).sublabel ? String((p as any).sublabel) : undefined;

  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="glass-card dark:bg-[#211E1C] rounded-2xl p-5 border border-[#4A4238]/10 dark:border-[#3A3430] flex flex-col justify-between h-full shadow-sm hover:border-[#E3836C]/30 transition-all group relative">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-[11px] font-mono text-[#4A4238]/60 dark:text-[#91867E] uppercase tracking-wider block">
            {metric}
          </span>
          <h3 className="font-serif text-lg font-medium text-[#4A4238] dark:text-[#F4EDE5]">
            {title}
          </h3>
        </div>
        {onWidgetAction && (
          <button
            type="button"
            onClick={() => onWidgetAction(widget.id, 'delete')}
            className="opacity-0 group-hover:opacity-60 hover:opacity-100! text-[#4A4238]/40 hover:text-red-500 transition-all p-1"
            title="Remove widget"
          >
            <IconTrash size={14} />
          </button>
        )}
      </div>

      <div className="flex items-center justify-around gap-4 py-2">
        <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="stroke-[#4A4238]/10 dark:stroke-[#302B28]"
              strokeWidth="8"
              fill="none"
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke="#E3836C"
              strokeWidth="8"
              strokeLinecap="round"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            <span className="font-serif text-xl font-bold text-[#4A4238] dark:text-[#F4EDE5]">
              {percent}%
            </span>
          </div>
        </div>

        <div className="space-y-1 text-left flex-1 min-w-0">
          <p className="text-xs font-mono font-semibold text-[#4A4238] dark:text-[#F4EDE5] truncate">
            {label}
          </p>
          {sublabel && (
            <p className="text-[11px] font-mono text-[#4A4238]/60 dark:text-[#91867E] truncate">
              {sublabel}
            </p>
          )}
        </div>
      </div>

      <CitationFooter
        provenance={widget.provenance || (p as any)?.provenance}
        freshness={widget.freshness}
      />
    </div>
  );
}

// ── 7. Native Comparison Pair Widget ─────────────────────────────────────────

export function ComparisonPairWidget({
  widget,
  onWidgetAction,
}: {
  widget: WidgetSpec;
  onWidgetAction?: (widgetId: string, action: string, payload?: unknown) => void;
}) {
  const p = widget.props || widget;
  const metric = String(p.metric || widget.metric || 'Comparative Analysis');
  const title = String(p.title || widget.title || 'Asset Comparison');
  const a = ((p as any).a || { label: 'Benchmark A', value: '$100', sub: 'Baseline' }) as { label: string; value: string; sub?: string };
  const b = ((p as any).b || { label: 'Benchmark B', value: '$120', sub: '+20% Delta' }) as { label: string; value: string; sub?: string };
  const delta = (p as any).delta ? String((p as any).delta) : undefined;

  return (
    <div className="glass-card dark:bg-[#211E1C] rounded-2xl p-5 border border-[#4A4238]/10 dark:border-[#3A3430] flex flex-col justify-between h-full shadow-sm hover:border-[#E3836C]/30 transition-all group relative">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-[11px] font-mono text-[#4A4238]/60 dark:text-[#91867E] uppercase tracking-wider block">
            {metric}
          </span>
          <h3 className="font-serif text-lg font-medium text-[#4A4238] dark:text-[#F4EDE5]">
            {title}
          </h3>
        </div>
        {onWidgetAction && (
          <button
            type="button"
            onClick={() => onWidgetAction(widget.id, 'delete')}
            className="opacity-0 group-hover:opacity-60 hover:opacity-100! text-[#4A4238]/40 hover:text-red-500 transition-all p-1"
            title="Remove widget"
          >
            <IconTrash size={14} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-black/[0.02] dark:bg-[#292522] border border-[#4A4238]/05 dark:border-[#3A3430] relative">
        <div className="space-y-1">
          <span className="text-[10px] font-mono uppercase text-[#4A4238]/60 dark:text-[#91867E]">
            {a.label}
          </span>
          <div className="font-serif text-xl font-bold text-[#4A4238] dark:text-[#F4EDE5]">
            {a.value}
          </div>
          {a.sub && (
            <span className="text-[10px] font-mono text-[#4A4238]/60 dark:text-[#91867E] block">
              {a.sub}
            </span>
          )}
        </div>

        <div className="space-y-1 border-l border-[#4A4238]/10 dark:border-[#3A3430] pl-3">
          <span className="text-[10px] font-mono uppercase text-[#4A4238]/60 dark:text-[#91867E]">
            {b.label}
          </span>
          <div className="font-serif text-xl font-bold text-[#E3836C]">
            {b.value}
          </div>
          {b.sub && (
            <span className="text-[10px] font-mono text-[#4A4238]/60 dark:text-[#91867E] block">
              {b.sub}
            </span>
          )}
        </div>
      </div>

      {delta && (
        <div className="mt-3 flex items-center justify-between text-xs font-mono">
          <span className="text-[#4A4238]/60 dark:text-[#91867E]">Variance:</span>
          <span className="px-2 py-0.5 rounded-full bg-[#E3836C]/15 text-[#E3836C] font-semibold">
            {delta}
          </span>
        </div>
      )}

      <CitationFooter
        provenance={widget.provenance || (p as any)?.provenance}
        freshness={widget.freshness}
      />
    </div>
  );
}

// ── 8. Native Timeline Widget ────────────────────────────────────────────────

export function TimelineWidget({
  widget,
  onWidgetAction,
}: {
  widget: WidgetSpec;
  onWidgetAction?: (widgetId: string, action: string, payload?: unknown) => void;
}) {
  const p = widget.props || widget;
  const metric = String(p.metric || widget.metric || 'Chronology');
  const title = String(p.title || widget.title || 'Event Timeline');
  const rawEvents = (p as any).events || (widget as any).events || [];
  const events: Array<{ date: string; label: string; description?: string }> =
    Array.isArray(rawEvents) && rawEvents.length > 0
      ? rawEvents
      : [
          { date: '09:30 AM', label: 'Market Open', description: 'Opening bell with high tech volume' },
          { date: '11:00 AM', label: 'Fed Policy Remarks', description: 'Yield volatility stabilizes' },
          { date: '02:00 PM', label: 'Earnings Announcement', description: 'Key components report revenue beat' },
        ];

  return (
    <div className="glass-card dark:bg-[#211E1C] rounded-2xl p-5 border border-[#4A4238]/10 dark:border-[#3A3430] flex flex-col justify-between h-full shadow-sm hover:border-[#E3836C]/30 transition-all group relative">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-[11px] font-mono text-[#4A4238]/60 dark:text-[#91867E] uppercase tracking-wider block">
            {metric}
          </span>
          <h3 className="font-serif text-lg font-medium text-[#4A4238] dark:text-[#F4EDE5]">
            {title}
          </h3>
        </div>
        {onWidgetAction && (
          <button
            type="button"
            onClick={() => onWidgetAction(widget.id, 'delete')}
            className="opacity-0 group-hover:opacity-60 hover:opacity-100! text-[#4A4238]/40 hover:text-red-500 transition-all p-1"
            title="Remove widget"
          >
            <IconTrash size={14} />
          </button>
        )}
      </div>

      <div className="relative pl-4 space-y-4 border-l-2 border-[#4A4238]/10 dark:border-[#3A3430] ml-2">
        {events.map((ev, idx) => (
          <div key={idx} className="relative group/item">
            <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#E3836C] border-2 border-white dark:border-[#211E1C]" />
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono text-[#4A4238]/60 dark:text-[#91867E]">
                {ev.date}
              </span>
              <h4 className="text-xs font-mono font-semibold text-[#4A4238] dark:text-[#F4EDE5]">
                {ev.label}
              </h4>
              {ev.description && (
                <p className="text-[11px] font-sans text-[#4A4238]/70 dark:text-[#C5B9AE]">
                  {ev.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <CitationFooter
        provenance={(widget.provenance || (p as any)?.provenance) as ProvenanceInfo | undefined}
        freshness={widget.freshness}
      />
    </div>
  );
}

// ── 9. Native Heatmap Widget ─────────────────────────────────────────────────

export function HeatmapWidget({
  widget,
  onWidgetAction,
}: {
  widget: WidgetSpec;
  onWidgetAction?: (widgetId: string, action: string, payload?: unknown) => void;
}) {
  const p = (widget.props || widget) as any;
  const title = String(p.title || widget.title || 'Intensity Heatmap');
  const metric = String(p.metric || widget.metric || 'DENSITY_MAP');
  const rows: string[] = Array.isArray(p.rows) && p.rows.length > 0 ? p.rows : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const cols: string[] = Array.isArray(p.cols) && p.cols.length > 0 ? p.cols : ['09:00', '11:00', '13:00', '15:00', '17:00'];
  const rawValues: number[][] = Array.isArray(p.values) && p.values.length > 0
    ? p.values
    : [
        [35, 62, 88, 95, 42],
        [48, 75, 92, 38, 55],
        [22, 54, 78, 85, 64],
        [60, 45, 70, 91, 83],
        [30, 68, 84, 52, 29],
      ];

  const flat = rawValues.flat();
  const maxVal = Math.max(...flat, 1);
  const minVal = Math.min(...flat, 0);
  const range = maxVal - minVal || 1;
  const colorScale = p.colorScale || 'warm';

  const [hoveredCell, setHoveredCell] = useState<{ r: string; c: string; v: number } | null>(null);

  const getCellBg = (val: number) => {
    const t = Math.max(0.12, (val - minVal) / range);
    if (colorScale === 'emerald') {
      return `rgba(158, 187, 176, ${t})`;
    }
    if (colorScale === 'cool') {
      return `rgba(145, 174, 181, ${t})`;
    }
    return `rgba(227, 131, 108, ${t})`;
  };

  return (
    <div className="glass-card dark:bg-[#211E1C] rounded-2xl p-5 border border-[#4A4238]/10 dark:border-[#3A3430] flex flex-col justify-between h-full shadow-sm hover:border-[#E3836C]/30 transition-all group relative">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-[11px] font-mono text-[#4A4238]/60 dark:text-[#91867E] uppercase tracking-wider block">
              {metric}
            </span>
            <h3 className="font-serif text-lg font-medium text-[#4A4238] dark:text-[#F4EDE5]">
              {title}
            </h3>
          </div>
          {onWidgetAction && (
            <button
              type="button"
              onClick={() => onWidgetAction(widget.id, 'delete')}
              className="opacity-0 group-hover:opacity-60 hover:opacity-100! text-[#4A4238]/40 hover:text-red-500 transition-all p-1"
              title="Remove widget"
            >
              <IconTrash size={14} />
            </button>
          )}
        </div>

        {/* Heatmap Matrix */}
        <div className="overflow-x-auto py-2">
          <div className="min-w-[240px]">
            <div className="flex items-center text-[10px] font-mono text-[#4A4238]/60 dark:text-[#91867E] mb-1 ml-12">
              {cols.map((col, idx) => (
                <div key={idx} className="flex-1 text-center truncate px-0.5">
                  {col}
                </div>
              ))}
            </div>

            <div className="space-y-1">
              {rows.map((row, rIdx) => {
                const rowVals = rawValues[rIdx] || [];
                return (
                  <div key={rIdx} className="flex items-center gap-1.5">
                    <span className="w-10 text-[10px] font-mono text-[#4A4238]/70 dark:text-[#91867E] text-right truncate">
                      {row}
                    </span>
                    <div className="flex-1 flex items-center gap-1">
                      {cols.map((col, cIdx) => {
                        const val = rowVals[cIdx] ?? 0;
                        return (
                          <button
                            key={cIdx}
                            type="button"
                            onMouseEnter={() => setHoveredCell({ r: row, c: col, v: val })}
                            onMouseLeave={() => setHoveredCell(null)}
                            onClick={() => {
                              onWidgetAction?.(widget.id, 'filter', {
                                dimension: 'heatmap_cell',
                                row,
                                col,
                                value: val,
                              });
                            }}
                            style={{ backgroundColor: getCellBg(val) }}
                            className="flex-1 h-6 rounded-md transition-all hover:scale-105 hover:ring-2 hover:ring-white dark:hover:ring-[#504740] cursor-pointer relative"
                            title={`${row} ${col}: ${val}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Hover detail */}
        <div className="min-h-[18px] text-[10px] font-mono text-[#4A4238]/70 dark:text-[#C5B9AE] mt-1">
          {hoveredCell ? (
            <span className="flex items-center gap-2">
              <span className="font-semibold text-[#E3836C]">
                {hoveredCell.r} · {hoveredCell.c}
              </span>
              <span>Value: <strong>{hoveredCell.v}</strong></span>
            </span>
          ) : (
            <span className="opacity-40">Hover cells for detail · Click to filter</span>
          )}
        </div>
      </div>

      <CitationFooter
        provenance={(widget.provenance || (p as any)?.provenance) as ProvenanceInfo | undefined}
        freshness={widget.freshness}
      />
    </div>
  );
}

// ── 10. Native Sparkline List Widget ──────────────────────────────────────────

export function SparklineListWidget({
  widget,
  onWidgetAction,
}: {
  widget: WidgetSpec;
  onWidgetAction?: (widgetId: string, action: string, payload?: unknown) => void;
}) {
  const p = (widget.props || widget) as any;
  const title = String(p.title || widget.title || 'Market Watchlist');
  const metric = String(p.metric || widget.metric || 'WATCHLIST');
  const items: Array<{
    label: string;
    value: string;
    change?: string;
    trend?: 'up' | 'down' | 'flat';
    sparkline: number[];
  }> = Array.isArray(p.items) && p.items.length > 0
    ? p.items
    : [
        { label: 'NVDA · NVIDIA Corp', value: '$128.40', change: '+3.2%', trend: 'up', sparkline: [121, 123, 122, 125, 124, 128.4] },
        { label: 'AAPL · Apple Inc', value: '$224.23', change: '+0.8%', trend: 'up', sparkline: [221, 222, 220, 223, 222, 224.2] },
        { label: 'MSFT · Microsoft Corp', value: '$448.90', change: '-0.4%', trend: 'down', sparkline: [452, 451, 450, 449, 450, 448.9] },
        { label: 'QQQ · Invesco QQQ', value: '$485.20', change: '+1.8%', trend: 'up', sparkline: [478, 480, 481, 483, 482, 485.2] },
      ];

  const renderSparkline = (data: number[], trend?: string) => {
    if (!data || data.length < 2) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const width = 64;
    const height = 20;

    const points = data
      .map((val, idx) => {
        const x = (idx / (data.length - 1)) * (width - 4) + 2;
        const y = height - ((val - min) / range) * (height - 6) - 3;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    const strokeColor =
      trend === 'down' ? '#D97870' : trend === 'up' ? '#9EBB9A' : '#E3836C';

    return (
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
        {points.length > 0 && (
          <circle
            cx={points.split(' ').slice(-1)[0].split(',')[0]}
            cy={points.split(' ').slice(-1)[0].split(',')[1]}
            r="2"
            fill={strokeColor}
          />
        )}
      </svg>
    );
  };

  return (
    <div className="glass-card dark:bg-[#211E1C] rounded-2xl p-5 border border-[#4A4238]/10 dark:border-[#3A3430] flex flex-col justify-between h-full shadow-sm hover:border-[#E3836C]/30 transition-all group relative">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-[11px] font-mono text-[#4A4238]/60 dark:text-[#91867E] uppercase tracking-wider block">
              {metric}
            </span>
            <h3 className="font-serif text-lg font-medium text-[#4A4238] dark:text-[#F4EDE5]">
              {title}
            </h3>
          </div>
          {onWidgetAction && (
            <button
              type="button"
              onClick={() => onWidgetAction(widget.id, 'delete')}
              className="opacity-0 group-hover:opacity-60 hover:opacity-100! text-[#4A4238]/40 hover:text-red-500 transition-all p-1"
              title="Remove widget"
            >
              <IconTrash size={14} />
            </button>
          )}
        </div>

        <div className="divide-y divide-[#4A4238]/5 dark:divide-[#3A3430]/40">
          {items.map((item, idx) => {
            const isPositive = item.trend === 'up' || (item.change && item.change.startsWith('+'));
            return (
              <div
                key={idx}
                onClick={() => {
                  const symbol = item.label.split(/[\s·]/)[0];
                  onWidgetAction?.(widget.id, 'filter', { dimension: 'ticker', value: symbol });
                }}
                className="py-2.5 flex items-center justify-between hover:bg-black/[0.02] dark:hover:bg-[#292522] px-1 rounded-lg cursor-pointer transition-colors"
                title={`Filter by ${item.label}`}
              >
                <div className="min-w-0 pr-2">
                  <h4 className="text-xs font-mono font-medium text-[#4A4238] dark:text-[#F4EDE5] truncate">
                    {item.label}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] font-mono text-[#4A4238]/60 dark:text-[#91867E]">
                      {item.value}
                    </span>
                    {item.change && (
                      <span
                        className={`text-[9px] font-mono font-semibold ${
                          isPositive ? 'text-[#9EBB9A]' : 'text-[#D97870]'
                        }`}
                      >
                        {item.change}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex-shrink-0">
                  {renderSparkline(item.sparkline, item.trend)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <CitationFooter
        provenance={(widget.provenance || (p as any)?.provenance) as ProvenanceInfo | undefined}
        freshness={widget.freshness}
      />
    </div>
  );
}

// ── 11. Native Funnel Widget ──────────────────────────────────────────────────

export function FunnelWidget({
  widget,
  onWidgetAction,
}: {
  widget: WidgetSpec;
  onWidgetAction?: (widgetId: string, action: string, payload?: unknown) => void;
}) {
  const p = (widget.props || widget) as any;
  const title = String(p.title || widget.title || 'Conversion Funnel');
  const metric = String(p.metric || widget.metric || 'STAGE_DROP_OFF');
  const stages: Array<{
    label: string;
    value: number;
    sublabel?: string;
    rate?: string;
  }> = Array.isArray(p.stages) && p.stages.length > 0
    ? p.stages
    : [
        { label: 'Impressions', value: 45000, sublabel: 'Top of funnel' },
        { label: 'Product Visits', value: 18200, sublabel: 'High intent' },
        { label: 'Added to Cart', value: 6400, sublabel: 'Cart checkout' },
        { label: 'Purchases', value: 2480, sublabel: 'Paid converted' },
      ];

  const topValue = stages[0]?.value || 1;

  return (
    <div className="glass-card dark:bg-[#211E1C] rounded-2xl p-5 border border-[#4A4238]/10 dark:border-[#3A3430] flex flex-col justify-between h-full shadow-sm hover:border-[#E3836C]/30 transition-all group relative">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-[11px] font-mono text-[#4A4238]/60 dark:text-[#91867E] uppercase tracking-wider block">
              {metric}
            </span>
            <h3 className="font-serif text-lg font-medium text-[#4A4238] dark:text-[#F4EDE5]">
              {title}
            </h3>
          </div>
          {onWidgetAction && (
            <button
              type="button"
              onClick={() => onWidgetAction(widget.id, 'delete')}
              className="opacity-0 group-hover:opacity-60 hover:opacity-100! text-[#4A4238]/40 hover:text-red-500 transition-all p-1"
              title="Remove widget"
            >
              <IconTrash size={14} />
            </button>
          )}
        </div>

        <div className="space-y-3">
          {stages.map((stg, idx) => {
            const overallPct = Math.max(8, Math.round((stg.value / topValue) * 100));
            const prevVal = idx > 0 ? stages[idx - 1].value : stg.value;
            const stepConvPct = idx > 0 ? Math.round((stg.value / prevVal) * 100) : 100;
            const dropPct = 100 - stepConvPct;

            return (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-medium text-[#4A4238] dark:text-[#F4EDE5]">
                    {stg.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#4A4238] dark:text-[#F4EDE5]">
                      {stg.value.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-[#4A4238]/60 dark:text-[#91867E]">
                      ({overallPct}%)
                    </span>
                  </div>
                </div>

                <div className="w-full bg-black/5 dark:bg-[#292522] h-6 rounded-lg overflow-hidden flex items-center relative">
                  <div
                    style={{ width: `${overallPct}%` }}
                    className="h-full rounded-lg bg-gradient-to-r from-[#E3836C] to-[#EBA58F] transition-all flex items-center justify-between px-2.5 text-[10px] font-mono text-[#FFF7F1] font-medium shadow-inner"
                  >
                    <span className="truncate">{stg.sublabel || `${overallPct}% total`}</span>
                  </div>
                  {idx > 0 && dropPct > 0 && (
                    <span className="ml-2 text-[9px] font-mono text-[#D97870] flex-shrink-0">
                      -{dropPct}% drop
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <CitationFooter
        provenance={(widget.provenance || (p as any)?.provenance) as ProvenanceInfo | undefined}
        freshness={widget.freshness}
      />
    </div>
  );
}

// ── 12. Native Distribution Widget ────────────────────────────────────────────

export function DistributionWidget({
  widget,
  onWidgetAction,
}: {
  widget: WidgetSpec;
  onWidgetAction?: (widgetId: string, action: string, payload?: unknown) => void;
}) {
  const p = (widget.props || widget) as any;
  const title = String(p.title || widget.title || 'Frequency Distribution');
  const metric = String(p.metric || widget.metric || 'HISTOGRAM');
  const unit = p.unit || '';
  const buckets: Array<{
    range: string;
    count: number;
    percentage?: number;
  }> = Array.isArray(p.buckets) && p.buckets.length > 0
    ? p.buckets
    : [
        { range: '0-25ms', count: 1240 },
        { range: '25-50ms', count: 3500 },
        { range: '50-100ms', count: 2150 },
        { range: '100-200ms', count: 720 },
        { range: '>200ms', count: 180 },
      ];

  const maxCount = Math.max(...buckets.map((b) => b.count), 1);
  const totalCount = buckets.reduce((acc, b) => acc + b.count, 0) || 1;

  return (
    <div className="glass-card dark:bg-[#211E1C] rounded-2xl p-5 border border-[#4A4238]/10 dark:border-[#3A3430] flex flex-col justify-between h-full shadow-sm hover:border-[#E3836C]/30 transition-all group relative">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-[11px] font-mono text-[#4A4238]/60 dark:text-[#91867E] uppercase tracking-wider block">
              {metric}
            </span>
            <h3 className="font-serif text-lg font-medium text-[#4A4238] dark:text-[#F4EDE5]">
              {title}
            </h3>
          </div>
          {onWidgetAction && (
            <button
              type="button"
              onClick={() => onWidgetAction(widget.id, 'delete')}
              className="opacity-0 group-hover:opacity-60 hover:opacity-100! text-[#4A4238]/40 hover:text-red-500 transition-all p-1"
              title="Remove widget"
            >
              <IconTrash size={14} />
            </button>
          )}
        </div>

        <div className="h-36 flex items-end gap-2 pt-4 pb-1 border-b border-[#4A4238]/10 dark:border-[#3A3430]">
          {buckets.map((b, idx) => {
            const pct = Math.max(6, Math.round((b.count / maxCount) * 100));
            const share = Math.round((b.count / totalCount) * 100);
            return (
              <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group/bar relative">
                <div className="opacity-0 group-hover/bar:opacity-100 transition-opacity absolute -top-5 text-[9px] font-mono bg-black/80 dark:bg-[#302B28] border border-transparent dark:border-[#504740] text-white dark:text-[#F4EDE5] px-1.5 py-0.5 rounded shadow whitespace-nowrap z-10">
                  {b.count.toLocaleString()} {unit} ({share}%)
                </div>
                <div
                  style={{ height: `${pct}%` }}
                  className="w-full bg-[#E3836C]/80 hover:bg-[#E3836C] rounded-t-md transition-all cursor-pointer shadow-xs"
                />
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 mt-1.5 text-[9px] font-mono text-[#4A4238]/60 dark:text-[#91867E]">
          {buckets.map((b, idx) => (
            <div key={idx} className="flex-1 text-center truncate" title={b.range}>
              {b.range}
            </div>
          ))}
        </div>
      </div>

      <CitationFooter
        provenance={(widget.provenance || (p as any)?.provenance) as ProvenanceInfo | undefined}
        freshness={widget.freshness}
      />
    </div>
  );
}

// ── 13. Native Node Graph Widget ──────────────────────────────────────────────

export function NodeGraphWidget({
  widget,
  onWidgetAction,
}: {
  widget: WidgetSpec;
  onWidgetAction?: (widgetId: string, action: string, payload?: unknown) => void;
}) {
  const p = (widget.props || widget) as any;
  const title = String(p.title || widget.title || 'Dependency Graph');
  const metric = String(p.metric || widget.metric || 'TOPOLOGY');

  // Hard safety limit: <= 20 nodes, <= 40 edges
  const rawNodes: Array<{ id: string; label: string; group?: string }> =
    Array.isArray(p.nodes) && p.nodes.length > 0
      ? p.nodes.slice(0, 20)
      : [
          { id: 'gw', label: 'API Gateway', group: 'ingress' },
          { id: 'auth', label: 'Auth Service', group: 'core' },
          { id: 'core', label: 'Core Engine', group: 'core' },
          { id: 'db', label: 'PostgreSQL DB', group: 'storage' },
          { id: 'cache', label: 'Redis Cache', group: 'storage' },
          { id: 'worker', label: 'Queue Worker', group: 'async' },
        ];

  const rawEdges: Array<{ source: string; target: string; label?: string }> =
    Array.isArray(p.edges) && p.edges.length > 0
      ? p.edges.slice(0, 40)
      : [
          { source: 'gw', target: 'auth' },
          { source: 'gw', target: 'core' },
          { source: 'core', target: 'db' },
          { source: 'core', target: 'cache' },
          { source: 'core', target: 'worker' },
          { source: 'worker', target: 'db' },
        ];

  const N = rawNodes.length;
  const cx = 190;
  const cy = 95;
  const r = Math.min(130, 40 + N * 14);

  const nodePositions = new Map<string, { x: number; y: number }>();
  rawNodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / Math.max(N, 1) - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + (r * 0.65) * Math.sin(angle);
    nodePositions.set(node.id, { x, y });
  });

  const getGroupColor = (group?: string) => {
    switch (group) {
      case 'ingress':
        return '#91AEB5';
      case 'core':
        return '#E3836C';
      case 'storage':
        return '#9EBBB0';
      case 'async':
      default:
        return '#A99BB5';
    }
  };

  return (
    <div className="glass-card dark:bg-[#211E1C] rounded-2xl p-5 border border-[#4A4238]/10 dark:border-[#3A3430] flex flex-col justify-between h-full shadow-sm hover:border-[#E3836C]/30 transition-all group relative">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-[11px] font-mono text-[#4A4238]/60 dark:text-[#91867E] uppercase tracking-wider block">
              {metric} ({rawNodes.length} nodes)
            </span>
            <h3 className="font-serif text-lg font-medium text-[#4A4238] dark:text-[#F4EDE5]">
              {title}
            </h3>
          </div>
          {onWidgetAction && (
            <button
              type="button"
              onClick={() => onWidgetAction(widget.id, 'delete')}
              className="opacity-0 group-hover:opacity-60 hover:opacity-100! text-[#4A4238]/40 hover:text-red-500 transition-all p-1"
              title="Remove widget"
            >
              <IconTrash size={14} />
            </button>
          )}
        </div>

        <div className="relative w-full h-48 rounded-xl bg-black/[0.02] dark:bg-[#171514] border border-[#4A4238]/5 dark:border-[#3A3430] overflow-hidden">
          <svg viewBox="0 0 380 190" className="w-full h-full">
            <defs>
              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="18"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#888" className="dark:fill-[#91867E]" opacity="0.6" />
              </marker>
            </defs>

            {rawEdges.map((edge, idx) => {
              const src = nodePositions.get(edge.source);
              const tgt = nodePositions.get(edge.target);
              if (!src || !tgt) return null;
              return (
                <line
                  key={idx}
                  x1={src.x}
                  y1={src.y}
                  x2={tgt.x}
                  y2={tgt.y}
                  stroke="#888"
                  className="dark:stroke-[#504740]"
                  strokeWidth="1.25"
                  strokeOpacity="0.4"
                  markerEnd="url(#arrow)"
                />
              );
            })}

            {rawNodes.map((node) => {
              const pos = nodePositions.get(node.id);
              if (!pos) return null;
              const color = getGroupColor(node.group);
              return (
                <g
                  key={node.id}
                  className="cursor-pointer group/node"
                  onClick={() => {
                    onWidgetAction?.(widget.id, 'filter', { dimension: 'node', value: node.id });
                  }}
                >
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="12"
                    fill={color}
                    fillOpacity="0.85"
                    stroke="#fff"
                    strokeWidth="2"
                    className="group-hover/node:scale-110 transition-transform dark:stroke-[#211E1C]"
                  />
                  <text
                    x={pos.x}
                    y={pos.y + 22}
                    textAnchor="middle"
                    fontSize="9"
                    fontFamily="monospace"
                    fill="currentColor"
                    className="font-medium fill-[#4A4238] dark:fill-[#F4EDE5] select-none pointer-events-none"
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <CitationFooter
        provenance={(widget.provenance || (p as any)?.provenance) as ProvenanceInfo | undefined}
        freshness={widget.freshness}
      />
    </div>
  );
}

// ── 14. Native Annotated Chart Widget ─────────────────────────────────────────

export function AnnotatedChartWidget({
  widget,
  onWidgetAction,
}: {
  widget: WidgetSpec;
  onWidgetAction?: (widgetId: string, action: string, payload?: unknown) => void;
}) {
  const p = (widget.props || widget) as any;
  const title = String(p.title || widget.title || 'Annotated Market Trend');
  const metric = String(p.metric || widget.metric || 'SPATIAL_EVENTS');
  const unit = p.unit || '$';

  const series: Array<{ x: string; y: number }> =
    Array.isArray(p.series) && p.series.length > 0
      ? p.series
      : Array.isArray(p.data) && p.data.length > 0
      ? p.data.map((d: any, i: number) => ({ x: d.x || d.date || `T${i}`, y: Number(d.y ?? d.value) || 0 }))
      : [
          { x: '09:30', y: 478.1 },
          { x: '10:30', y: 480.5 },
          { x: '11:30', y: 483.2 },
          { x: '13:00', y: 482.0 },
          { x: '14:30', y: 485.4 },
          { x: '16:00', y: 486.2 },
        ];

  const annotations: Array<ChartAnnotation> = Array.isArray(p.annotations) && p.annotations.length > 0
    ? p.annotations
    : [
        { x: '11:30', label: 'CPI Beat (+0.2%)', type: 'event' },
        { x: '14:30', label: 'Volume Surge', type: 'anomaly' },
      ];

  const yVals = series.map((s) => s.y);
  const minVal = Math.min(...yVals);
  const maxVal = Math.max(...yVals);
  const range = maxVal - minVal || 1;

  const width = 340;
  const height = 110;

  const points = series.map((s, idx) => {
    const x = 30 + (idx / Math.max(series.length - 1, 1)) * (width - 50);
    const y = height - 15 - ((s.y - minVal) / range) * (height - 35);
    return { ...s, px: x, py: y };
  });

  const polylineStr = points.map((pt) => `${pt.px},${pt.py}`).join(' ');

  const [selectedPoint, setSelectedPoint] = useState<{ x: string; y: number; px: number; py: number } | null>(null);
  const [userNote, setUserNote] = useState('');
  const [noteType, setNoteType] = useState<'note' | 'event' | 'milestone'>('note');
  const [localAnnotations, setLocalAnnotations] = useState(annotations);

  const handleAddUserAnnotation = () => {
    if (!selectedPoint || !userNote.trim()) return;
    const newAnn = {
      x: selectedPoint.x,
      label: userNote.trim(),
      type: noteType,
      author: 'user' as const,
      authorName: 'You',
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    const updated = [...localAnnotations, newAnn];
    setLocalAnnotations(updated);
    setSelectedPoint(null);
    setUserNote('');
    onWidgetAction?.(widget.id, 'update_annotations', updated);
  };

  const getAnnotationBadge = (type?: string, isUser = false) => {
    if (isUser) {
      return {
        bg: 'bg-[#91AEB5]/15 text-[#91AEB5] dark:bg-[#253034] dark:text-[#91AEB5] border-[#91AEB5]/30',
        dot: 'bg-[#91AEB5]',
      };
    }
    switch (type) {
      case 'anomaly':
        return {
          bg: 'bg-red-500/10 dark:bg-[#382522] text-red-700 dark:text-[#D97870] border-red-500/20 dark:border-[#D97870]/30',
          dot: 'bg-[#D97870]',
        };
      case 'milestone':
        return {
          bg: 'bg-emerald-500/10 dark:bg-[#283329] text-emerald-700 dark:text-[#9EBB9A] border-emerald-500/20 dark:border-[#9EBB9A]/30',
          dot: 'bg-[#9EBB9A]',
        };
      case 'event':
      default:
        return {
          bg: 'bg-[#91AEB5]/10 dark:bg-[#253034] text-[#91AEB5] border-[#91AEB5]/20 dark:border-[#91AEB5]/30',
          dot: 'bg-[#91AEB5]',
        };
    }
  };

  return (
    <div className="glass-card dark:bg-[#211E1C] rounded-2xl p-5 border border-[#4A4238]/10 dark:border-[#3A3430] flex flex-col justify-between h-full shadow-sm hover:border-[#E3836C]/30 transition-all group relative">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-[11px] font-mono text-[#4A4238]/60 dark:text-[#91867E] uppercase tracking-wider block">
              {metric}
            </span>
            <h3 className="font-serif text-lg font-medium text-[#4A4238] dark:text-[#F4EDE5]">
              {title}
            </h3>
          </div>
          {onWidgetAction && (
            <button
              type="button"
              onClick={() => onWidgetAction(widget.id, 'delete')}
              className="opacity-0 group-hover:opacity-60 hover:opacity-100! text-[#4A4238]/40 hover:text-red-500 transition-all p-1"
              title="Remove widget"
            >
              <IconTrash size={14} />
            </button>
          )}
        </div>

        <div className="relative w-full h-36">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            <line x1="30" y1={height - 15} x2={width - 20} y2={height - 15} stroke="#888" className="dark:stroke-[#504740]" strokeOpacity="0.25" />
            <line x1="30" y1="20" x2={width - 20} y2="20" stroke="#888" className="dark:stroke-[#504740]" strokeOpacity="0.15" strokeDasharray="3,3" />

            <polyline
              fill="none"
              stroke="#E3836C"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={polylineStr}
            />

            {points.map((pt, i) => (
              <circle
                key={i}
                cx={pt.px}
                cy={pt.py}
                r="3.5"
                fill="#E3836C"
                stroke="#fff"
                strokeWidth="1.5"
                className="cursor-pointer hover:opacity-80 transition-all dark:stroke-[#211E1C]"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPoint(pt);
                }}
              >
                <title>Click to add note at {pt.x}</title>
              </circle>
            ))}

            {localAnnotations.map((ann, aIdx) => {
              const matchedPt = points.find((pt) => pt.x === ann.x) || points[Math.min(aIdx + 2, points.length - 1)];
              if (!matchedPt) return null;
              const isUser = (ann as any).author === 'user';
              return (
                <g key={aIdx}>
                  <line
                    x1={matchedPt.px}
                    y1="14"
                    x2={matchedPt.px}
                    y2={matchedPt.py}
                    stroke={isUser ? "#91AEB5" : "#E3836C"}
                    strokeWidth="1.25"
                    strokeDasharray="2,2"
                    strokeOpacity="0.75"
                  />
                  <circle
                    cx={matchedPt.px}
                    cy={matchedPt.py}
                    r={isUser ? "5" : "4"}
                    fill={isUser ? "#91AEB5" : "#D97870"}
                    stroke="#fff"
                    strokeWidth="1"
                    className="dark:stroke-[#211E1C]"
                  />
                </g>
              );
            })}
          </svg>

          <div className="absolute inset-0 pointer-events-none">
            {localAnnotations.map((ann, aIdx) => {
              const matchedPt = points.find((pt) => pt.x === ann.x) || points[Math.min(aIdx + 2, points.length - 1)];
              if (!matchedPt) return null;
              const isUser = (ann as any).author === 'user';
              const badgeStyle = getAnnotationBadge(ann.type, isUser);
              const leftPct = (matchedPt.px / width) * 100;
              return (
                <div
                  key={aIdx}
                  style={{ left: `${leftPct}%` }}
                  className="absolute top-0 -translate-x-1/2 pointer-events-auto"
                >
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[9px] font-mono shadow-xs ${badgeStyle.bg}`}
                    title={`${isUser ? 'User Note' : (ann.type || 'Event')}: ${ann.label}`}
                  >
                    {isUser ? (
                      <IconUser size={10} className="text-[#91AEB5]" />
                    ) : (
                      <span className={`w-1.5 h-1.5 rounded-full ${badgeStyle.dot}`} />
                    )}
                    <span className="truncate max-w-[90px]">{ann.label}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dimension 4: User Click-to-Annotate Popover */}
        {selectedPoint && (
          <div className="mt-2.5 p-2.5 rounded-xl border border-[#91AEB5]/30 bg-[#253034]/20 dark:bg-[#302B28] dark:border-[#504740] space-y-2 text-xs">
            <div className="flex items-center justify-between font-mono text-[10px] text-[#91AEB5] font-semibold">
              <span className="flex items-center gap-1">
                <IconPin size={11} /> Add note at {selectedPoint.x} ({unit}{selectedPoint.y})
              </span>
              <button
                type="button"
                onClick={() => setSelectedPoint(null)}
                className="text-[#91867E] hover:text-[#F4EDE5] cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={userNote}
                onChange={(e) => setUserNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddUserAnnotation();
                }}
                placeholder="e.g. Campaign launched, market update..."
                className="flex-1 px-2.5 py-1 rounded-lg border border-[#4A4238]/20 dark:border-[#3A3430] text-xs bg-white dark:bg-[#292522] text-[#2D2621] dark:text-[#F4EDE5] placeholder-[#91867E] outline-none focus:ring-1 focus:ring-[#E3836C]/40"
                autoFocus
              />
              <select
                value={noteType}
                onChange={(e) => setNoteType(e.target.value as any)}
                className="px-2 py-1 rounded-lg border border-[#4A4238]/20 dark:border-[#3A3430] text-[10px] font-mono bg-white dark:bg-[#292522] text-[#4A4238] dark:text-[#F4EDE5]"
              >
                <option value="note">Note</option>
                <option value="event">Event</option>
                <option value="milestone">Milestone</option>
              </select>
              <button
                type="button"
                onClick={handleAddUserAnnotation}
                className="px-3 py-1 rounded-lg bg-[#E3836C] hover:bg-[#ED967F] text-[#FFF7F1] font-mono text-[11px] font-semibold transition-all cursor-pointer shadow-xs"
              >
                Add
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-[9px] font-mono text-[#4A4238]/60 dark:text-[#91867E] mt-1 px-1">
          <span>{series[0]?.x} · {unit}{series[0]?.y}</span>
          <span>{series[series.length - 1]?.x} · {unit}{series[series.length - 1]?.y}</span>
        </div>
      </div>

      <CitationFooter
        provenance={(widget.provenance || (p as any)?.provenance) as ProvenanceInfo | undefined}
        freshness={widget.freshness}
        binding={widget.binding || (p as any)?.binding}
        onRefresh={onWidgetAction ? () => onWidgetAction(widget.id, 'refresh') : undefined}
      />
    </div>
  );
}

// ── 15. Native Alert Banner Widget ────────────────────────────────────────────

export function AlertBannerWidget({
  widget,
  onWidgetAction,
}: {
  widget: WidgetSpec;
  onWidgetAction?: (widgetId: string, action: string, payload?: unknown) => void;
}) {
  const p = (widget.props || widget) as any;
  const title = String(p.title || widget.title || 'System Alert');
  const message = String(p.message || p.body || 'Operational notification or anomaly detected in telemetry stream.');
  const severity = (p.severity || 'warning') as 'info' | 'warning' | 'error' | 'success';
  const dismissible = p.dismissible !== false;

  const getSeverityStyle = () => {
    switch (severity) {
      case 'error':
        return {
          container: 'bg-red-500/10 dark:bg-[#382522] border-red-500/30 dark:border-[#D97870]/30 text-red-900 dark:text-[#D97870]',
          icon: <IconAlertTriangle size={18} className="text-red-600 dark:text-[#D97870] flex-shrink-0" />,
          badge: 'bg-red-500/20 dark:bg-[#D97870]/20 text-red-700 dark:text-[#D97870]',
        };
      case 'info':
        return {
          container: 'bg-sky-500/10 dark:bg-[#253034] border-sky-500/30 dark:border-[#91AEB5]/30 text-sky-900 dark:text-[#91AEB5]',
          icon: <IconInfoCircle size={18} className="text-sky-600 dark:text-[#91AEB5] flex-shrink-0" />,
          badge: 'bg-sky-500/20 dark:bg-[#91AEB5]/20 text-sky-700 dark:text-[#91AEB5]',
        };
      case 'success':
        return {
          container: 'bg-emerald-500/10 dark:bg-[#283329] border-emerald-500/30 dark:border-[#9EBB9A]/30 text-emerald-900 dark:text-[#9EBB9A]',
          icon: <IconCheck size={18} className="text-emerald-600 dark:text-[#9EBB9A] flex-shrink-0" />,
          badge: 'bg-emerald-500/20 dark:bg-[#9EBB9A]/20 text-emerald-700 dark:text-[#9EBB9A]',
        };
      case 'warning':
      default:
        return {
          container: 'bg-amber-500/10 dark:bg-[#352D20] border-amber-500/30 dark:border-[#D9AD70]/30 text-amber-900 dark:text-[#D9AD70]',
          icon: <IconAlertTriangle size={18} className="text-amber-600 dark:text-[#D9AD70] flex-shrink-0" />,
          badge: 'bg-amber-500/20 dark:bg-[#D9AD70]/20 text-amber-700 dark:text-[#D9AD70]',
        };
    }
  };

  const style = getSeverityStyle();

  return (
    <div className={`rounded-2xl p-4 border flex flex-col justify-between shadow-sm relative transition-all ${style.container}`}>
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5">{style.icon}</div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="font-serif text-sm font-semibold tracking-tight">
                  {title}
                </h4>
                <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded uppercase font-bold tracking-wider ${style.badge}`}>
                  {severity}
                </span>
              </div>
              <p className="text-xs font-sans leading-relaxed opacity-90">
                {message}
              </p>
            </div>
          </div>

          {dismissible && onWidgetAction && (
            <button
              type="button"
              onClick={() => onWidgetAction(widget.id, 'delete')}
              className="opacity-60 hover:opacity-100 p-1 cursor-pointer transition-opacity"
              title="Dismiss alert"
            >
              <IconX size={14} />
            </button>
          )}
        </div>
      </div>

      <CitationFooter
        provenance={(widget.provenance || (p as any)?.provenance) as ProvenanceInfo | undefined}
        freshness={widget.freshness}
      />
    </div>
  );
}

// ── 16. Native Composite Group Meta-Primitive ─────────────────────────────────

export function CompositeGroupWidget({
  widget,
  onWidgetAction,
}: {
  widget: WidgetSpec;
  onWidgetAction?: (widgetId: string, action: string, payload?: unknown) => void;
}) {
  const p = (widget.props || widget) as any;
  const title = String(p.title || widget.title || 'Composite Metric Cluster');
  const layout = p.layout === 'row' ? 'row' : 'grid';
  const childWidgets: WidgetSpec[] = Array.isArray(p.widgets) ? p.widgets : [];

  return (
    <div className="glass-card dark:bg-[#211E1C] rounded-2xl p-5 border-2 border-[#E3836C]/25 dark:border-[#E3836C]/25 flex flex-col justify-between h-full shadow-md hover:border-[#E3836C]/40 transition-all group relative bg-black/[0.01] dark:bg-white/[0.01]">
      <div>
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#4A4238]/10 dark:border-[#3A3430]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#E3836C]" />
            <h3 className="font-serif text-lg font-medium text-[#4A4238] dark:text-[#F4EDE5]">
              {title}
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#E3836C]/10 text-[#E3836C] font-semibold">
              Composite · {childWidgets.length} primitives
            </span>
          </div>

          {onWidgetAction && (
            <button
              type="button"
              onClick={() => onWidgetAction(widget.id, 'delete')}
              className="opacity-0 group-hover:opacity-60 hover:opacity-100! text-[#4A4238]/40 hover:text-red-500 transition-all p-1"
              title="Remove composite group"
            >
              <IconTrash size={14} />
            </button>
          )}
        </div>

        <div
          className={
            layout === 'row'
              ? 'flex flex-col gap-3'
              : 'grid grid-cols-1 md:grid-cols-2 gap-3'
          }
        >
          {childWidgets.map((child, idx) => {
            const childType = (child.component || child.type || 'metric_card') as string;

            // Strict Recursion Guard: depth <= 1 (children can NEVER be composite_group)
            if (childType === 'composite_group') {
              return (
                <div
                  key={child.id || idx}
                  className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-mono"
                >
                  Recursion limit reached: composite_group cannot contain another composite_group (depth cap 1).
                </div>
              );
            }

            const Comp = NATIVE_WIDGET_REGISTRY[childType];
            if (!Comp) {
              return (
                <div
                  key={child.id || idx}
                  className="p-3 rounded-xl border border-dashed border-[#3A3430] text-xs font-mono text-[#91867E]"
                >
                  Unknown child primitive: {childType}
                </div>
              );
            }

            return (
              <div key={child.id || idx} className="h-full">
                <Comp widget={child} onWidgetAction={onWidgetAction} />
              </div>
            );
          })}
        </div>
      </div>

      <CitationFooter
        provenance={(widget.provenance || (p as any)?.provenance) as ProvenanceInfo | undefined}
        freshness={widget.freshness}
      />
    </div>
  );
}

// ── Native Component Registry ──────────────────────────────────────────────
export const NATIVE_WIDGET_REGISTRY: Record<
  string,
  React.ComponentType<{
    widget: WidgetSpec;
    onWidgetAction?: (widgetId: string, action: string, payload?: unknown) => void;
  }>
> = {
  metric_card: MetricCardWidget,
  line_chart: LineChartWidget,
  bar_chart: BarChartWidget,
  table: TableWidget,
  text_block: TextBlockWidget,
  progress_ring: ProgressRingWidget,
  comparison_pair: ComparisonPairWidget,
  timeline: TimelineWidget,
  heatmap: HeatmapWidget,
  sparkline_list: SparklineListWidget,
  funnel: FunnelWidget,
  distribution: DistributionWidget,
  node_graph: NodeGraphWidget,
  annotated_chart: AnnotatedChartWidget,
  alert_banner: AlertBannerWidget,
  composite_group: CompositeGroupWidget,
};

// ── 5. Sandboxed HTML Harness Generator ─────────────────────────────────────

export function generateSandboxedHtml(
  widget: WidgetSpec,
  initialData: Array<Record<string, unknown>>,
  theme: string
): string {
  const p = widget.props || widget;
  const title = String(p.title || widget.title || 'Sandboxed Widget');
  const metric = String(p.metric || widget.metric || 'Custom View');
  const isDark = theme === 'dark';

  const bgColor = isDark ? '#211E1C' : '#FAF6F0';
  const textColor = isDark ? '#F4EDE5' : '#4A4238';
  const mutedColor = isDark ? '#91867E' : 'rgba(74, 66, 56, 0.6)';
  const borderColor = isDark ? '#3A3430' : 'rgba(74, 66, 56, 0.1)';
  const accentColor = '#E3836C';

  // Strict CSP: hard-block outbound network calls, nested frames, and form submissions
  const cspMeta = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none';">`;

  const bridgeScript = `
    <script>
      (function() {
        window.onerror = function(message, source, lineno, colno, error) {
          window.parent.postMessage({
            type: 'WIDGET_ERROR',
            widgetId: ${JSON.stringify(widget.id)},
            error: String(message || error)
          }, '*');
          return false;
        };
        window.addEventListener('unhandledrejection', function(event) {
          window.parent.postMessage({
            type: 'WIDGET_ERROR',
            widgetId: ${JSON.stringify(widget.id)},
            error: String(event.reason?.message || event.reason || 'Unhandled Promise Rejection')
          }, '*');
        });

        window.AnalyzeIt = {
          data: ${JSON.stringify(initialData)},
          emitAction: function(action, payload) {
            window.parent.postMessage({
              type: 'WIDGET_ACTION',
              widgetId: ${JSON.stringify(widget.id)},
              action: action,
              payload: payload
            }, '*');
          }
        };

        window.addEventListener('message', function(event) {
          if (event.data && event.data.type === 'UPDATE_DATA') {
            window.AnalyzeIt.data = event.data.payload;
            var liveView = document.getElementById('bridge-data-status');
            if (liveView) {
              liveView.textContent = 'Data synced (' + (event.data.payload ? event.data.payload.length : 0) + ' items)';
            }
            if (typeof window.onDataUpdate === 'function') {
              window.onDataUpdate(event.data.payload);
            }
          }
        });

        window.parent.postMessage({
          type: 'WIDGET_READY',
          widgetId: ${JSON.stringify(widget.id)}
        }, '*');
      })();
    </script>
  `;

  if (widget.code && widget.code.trim()) {
    if (widget.code.includes('<html') || widget.code.includes('<!DOCTYPE')) {
      if (widget.code.includes('<head>')) {
        return widget.code.replace('<head>', `<head>\n  ${cspMeta}\n  ${bridgeScript}`);
      }
      if (widget.code.includes('</head>')) {
        return widget.code.replace('</head>', `  ${cspMeta}\n  ${bridgeScript}\n</head>`);
      }
      return `<!DOCTYPE html><html><head>${cspMeta}${bridgeScript}</head><body>${widget.code}</body></html>`;
    }
    return `<!DOCTYPE html><html><head>${cspMeta}${bridgeScript}<style>body{margin:0;padding:12px;font-family:system-ui,-apple-system,sans-serif;color:${textColor};background:${bgColor};}</style></head><body>${widget.code}</body></html>`;
  }

  return `<!DOCTYPE html>
<html>
<head>
  ${cspMeta}
  <style>
    body {
      margin: 0;
      padding: 12px;
      font-family: system-ui, -apple-system, sans-serif;
      color: ${textColor};
      background: ${bgColor};
      box-sizing: border-box;
      height: 100%;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .badge {
      display: inline-block;
      font-size: 10px;
      font-family: monospace;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(227, 131, 108, 0.15);
      color: ${accentColor};
    }
    .card {
      background: ${isDark ? '#292522' : 'rgba(0,0,0,0.02)'};
      border: 1px solid ${borderColor};
      border-radius: 12px;
      padding: 10px;
    }
  </style>
  ${bridgeScript}
</head>
<body>
  <div style="display: flex; align-items: center; justify-content: space-between;">
    <span class="badge">Isolated Frame · Null Origin</span>
    <span style="font-size: 10px; color: ${mutedColor}; font-family: monospace;">sandbox="allow-scripts"</span>
  </div>
  <div class="card">
    <div style="font-weight: 600; font-size: 13px; margin-bottom: 2px;">${title}</div>
    <div style="font-size: 10px; color: ${mutedColor}; text-transform: uppercase; letter-spacing: 0.05em;">${metric}</div>
  </div>
</body>
</html>`;
}

// ── 6. Sandboxed Frame Component ─────────────────────────────────────────────

export function SandboxedFrameWidget({
  widget,
  onWidgetAction,
}: {
  widget: WidgetSpec;
  onWidgetAction?: (widgetId: string, action: string, payload?: unknown) => void;
}) {
  const { theme } = useTheme();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeReady, setIframeReady] = useState(false);
  const [iframeError, setIframeError] = useState<string | null>(null);
  const [resolvedData, setResolvedData] = useState<Array<Record<string, unknown>>>([]);
  const [reloadKey, setReloadKey] = useState(0);

  const p = widget.props || widget;
  const title = String(p.title || widget.title || 'Sandboxed Widget');

  useEffect(() => {
    let isMounted = true;
    resolveWidgetData(widget).then((data) => {
      if (isMounted) setResolvedData(data);
    });
    return () => {
      isMounted = false;
    };
  }, [widget]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Strict Window Reference Check: Ensure message came from this exact iframe
      if (event.source !== iframeRef.current?.contentWindow) return;

      const data = event.data;
      if (!data || typeof data !== 'object') return;
      if (data.widgetId !== widget.id) return;

      if (data.type === 'WIDGET_READY') {
        setIframeReady(true);
        setIframeError(null);
      } else if (data.type === 'WIDGET_ERROR') {
        setIframeError(String(data.error || 'Unknown runtime error'));
      } else if (data.type === 'WIDGET_ACTION') {
        const ALLOWED_ACTIONS = ['ping', 'delete', 'refresh'];
        if (ALLOWED_ACTIONS.includes(data.action)) {
          onWidgetAction?.(widget.id, data.action, data.payload);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [widget.id, onWidgetAction]);

  const isOversized = (widget.code?.length ?? 0) > 50000;
  const srcDoc = isOversized ? '' : generateSandboxedHtml(widget, resolvedData, theme);

  return (
    <div className="glass-card dark:bg-[#211E1C] rounded-2xl p-4 border border-[#4A4238]/10 dark:border-[#3A3430] flex flex-col justify-between h-full shadow-sm hover:border-[#E3836C]/30 transition-all min-h-[200px]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-serif font-medium truncate text-[#4A4238] dark:text-[#F4EDE5]">
          {title}
        </span>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400">
          Sandboxed
        </span>
      </div>

      {isOversized ? (
        <div className="flex-1 flex flex-col items-center justify-center p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 text-center space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-mono text-amber-500 font-semibold">
            <IconAlertTriangle size={14} /> Code Exceeds Safety Cap
          </div>
          <p className="text-[10px] font-mono opacity-80">
            Payload ({widget.code?.length.toLocaleString()} chars) exceeds limit.
          </p>
        </div>
      ) : iframeError ? (
        <div className="flex-1 flex flex-col items-center justify-center p-3 rounded-xl border border-red-500/30 bg-red-500/5 text-center space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-mono text-red-500 font-semibold">
            <IconAlertTriangle size={14} /> Frame Error
          </div>
          <p className="text-[10px] font-mono text-red-400 max-w-full break-words">
            {iframeError}
          </p>
          <button
            type="button"
            onClick={() => {
              setIframeError(null);
              setReloadKey((k) => k + 1);
            }}
            className="px-2.5 py-1 text-[10px] font-mono rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30"
          >
            Reload Frame
          </button>
        </div>
      ) : (
        <div className="flex-1 relative w-full min-h-[140px] rounded-xl overflow-hidden bg-black/5 dark:bg-[#171514] border border-[#4A4238]/5 dark:border-[#3A3430]">
          <iframe
            key={reloadKey}
            ref={iframeRef}
            srcDoc={srcDoc}
            sandbox="allow-scripts"
            className="w-full h-full border-0 absolute inset-0 bg-transparent"
            title={title}
          />
        </div>
      )}
    </div>
  );
}

// ── 7. Main Widget Dispatcher ────────────────────────────────────────────────

export function SandboxedWidgetRenderer({
  widget,
  onWidgetAction,
  onRefine,
  onMoveUp,
  onMoveDown,
  onToggleWidth,
  isFirst = false,
  isLast = false,
  isDraftPreview = false,
  activeFilter = null,
}: {
  widget: WidgetSpec;
  onWidgetAction?: (widgetId: string, action: string, payload?: unknown) => void;
  onRefine?: (widget: WidgetSpec) => void;
  onMoveUp?: (widgetId: string) => void;
  onMoveDown?: (widgetId: string) => void;
  onToggleWidth?: (widgetId: string) => void;
  isFirst?: boolean;
  isLast?: boolean;
  isDraftPreview?: boolean;
  activeFilter?: { dimension: string; value: string; sourceWidgetId: string } | null;
}) {
  const mode = widget.render_mode || (widget.type === 'sandboxed' || widget.component === 'sandboxed' ? 'sandboxed' : 'native');

  const renderedContent = (() => {
    // Dimension 7 / Security Hardening: Server-side redacted widget placeholder
    if (widget.redacted || (widget.props as any)?.redacted) {
      return (
        <div className="glass-card rounded-2xl p-6 border border-dashed border-[#4A4238]/30 dark:border-[#3A3430] bg-[#FAF6F0]/60 dark:bg-[#211E1C]/60 flex flex-col items-center justify-center text-center min-h-[160px]">
          <div className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-[#D9AD70] mb-2.5">
            <IconLock className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-mono font-semibold text-[#4A4238] dark:text-[#F4EDE5]">
            {widget.title || 'Restricted Content'}
          </h4>
          <p className="text-[11px] font-mono text-[#7A7062] dark:text-[#91867E] mt-1 max-w-xs">
            This widget was redacted server-side. Requires {widget.visibility?.join(' or ') || 'elevated'} role permission.
          </p>
        </div>
      );
    }

    if (mode === 'native') {
      const compKey = (widget.component || widget.type || 'metric_card') as string;
      const Component = NATIVE_WIDGET_REGISTRY[compKey];
      if (Component) {
        return <Component widget={widget} onWidgetAction={onWidgetAction} />;
      }
      return (
        <div className="glass-card rounded-2xl p-4 border border-dashed border-red-400 text-xs text-red-500 font-mono">
          Unknown native widget component: {String(compKey)}
        </div>
      );
    }

    if (mode === 'sandboxed') {
      return <SandboxedFrameWidget widget={widget} onWidgetAction={onWidgetAction} />;
    }

    return (
      <div className="glass-card rounded-2xl p-4 border border-dashed border-amber-400 text-xs text-amber-500 font-mono">
        Unsupported render mode: {String(mode)}
      </div>
    );
  })();

  // In draft preview mode, render directly with draft preview badge
  if (isDraftPreview) {
    return (
      <div className="relative">
        <div className="absolute top-3 right-3 z-10">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-500/10 dark:bg-stone-400/10 text-stone-600 dark:text-[#C5B9AE] border border-stone-500/20">
            Draft Preview
          </span>
        </div>
        {renderedContent}
      </div>
    );
  }

  // Scoped Reactive Filter Scoping
  const isFilteredIn = Boolean(
    activeFilter &&
    widget.consumesDimensions &&
    widget.consumesDimensions.includes(activeFilter.dimension)
  );
  const isFilteredOut = Boolean(
    activeFilter &&
    widget.consumesDimensions &&
    widget.consumesDimensions.length > 0 &&
    !widget.consumesDimensions.includes(activeFilter.dimension)
  );

  // Interactive Live Canvas Card with Freshness Indicator and Hover Toolbar
  const hasToolbarControls = Boolean(onRefine || onToggleWidth || onMoveUp || onMoveDown);

  return (
    <div
      className={`relative group/canvas-widget h-full transition-all duration-300 ${
        isFilteredIn
          ? 'ring-2 ring-[#E3836C] shadow-lg rounded-2xl'
          : isFilteredOut
          ? 'opacity-40 hover:opacity-80'
          : ''
      }`}
    >
      {/* Active Filter Scope Badge */}
      {isFilteredIn && activeFilter && (
        <div className="absolute top-3 left-3 z-10">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#E3836C]/15 text-[#E3836C] border border-[#E3836C]/30 flex items-center gap-1 font-semibold backdrop-blur-xs">
            <IconFilter size={11} />
            {activeFilter.dimension}: {activeFilter.value}
          </span>
        </div>
      )}

      {/* Freshness Badge (visible by default) */}
      <div className="absolute top-3 right-3 z-10 group-hover/canvas-widget:hidden transition-all">
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-[#9EBB9A] border border-emerald-500/20 dark:border-emerald-500/30 flex items-center gap-1.5 shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {widget.freshness || 'Live · as of 09:40 EDT'}
        </span>
      </div>

      {/* Hover Action Toolbar */}
      {hasToolbarControls && (
        <div className="absolute top-2.5 right-2.5 z-20 hidden group-hover/canvas-widget:flex items-center gap-1 bg-[#FAF6F0]/95 dark:bg-[#302B28]/95 backdrop-blur-md px-2 py-1 rounded-xl border border-[#4A4238]/15 dark:border-[#504740] shadow-md transition-all">
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-[#9EBB9A] mr-1 flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-emerald-500" />
            Live
          </span>

          {onRefine && (
            <button
              type="button"
              onClick={() => onRefine(widget)}
              title="Refine with AI (Click-to-chat)"
              className="p-1 rounded-lg text-[#4A4238]/70 dark:text-[#C5B9AE] hover:text-[#E3836C] hover:bg-[#E3836C]/10 transition-all cursor-pointer"
            >
              <IconSparkles size={13} />
            </button>
          )}

          {onToggleWidth && (
            <button
              type="button"
              onClick={() => onToggleWidth(widget.id)}
              title={widget.span === 2 ? 'Set to 1 Column' : 'Expand to 2 Columns'}
              className="p-1 rounded-lg text-[#4A4238]/70 dark:text-[#C5B9AE] hover:text-[#E3836C] hover:bg-[#E3836C]/10 transition-all cursor-pointer"
            >
              <IconColumns size={13} />
            </button>
          )}

          {onMoveUp && !isFirst && (
            <button
              type="button"
              onClick={() => onMoveUp(widget.id)}
              title="Move Widget Up"
              className="p-1 rounded-lg text-[#4A4238]/70 dark:text-[#C5B9AE] hover:text-[#E3836C] hover:bg-[#E3836C]/10 transition-all cursor-pointer"
            >
              <IconArrowUp size={13} />
            </button>
          )}

          {onMoveDown && !isLast && (
            <button
              type="button"
              onClick={() => onMoveDown(widget.id)}
              title="Move Widget Down"
              className="p-1 rounded-lg text-[#4A4238]/70 dark:text-[#C5B9AE] hover:text-[#E3836C] hover:bg-[#E3836C]/10 transition-all cursor-pointer"
            >
              <IconArrowDown size={13} />
            </button>
          )}

          {onWidgetAction && (
            <button
              type="button"
              onClick={() => onWidgetAction(widget.id, 'duplicate')}
              title="Duplicate Widget"
              className="p-1 rounded-lg text-[#4A4238]/70 dark:text-[#C5B9AE] hover:text-[#E3836C] hover:bg-[#E3836C]/10 transition-all cursor-pointer"
            >
              <IconCopy size={13} />
            </button>
          )}

          {onWidgetAction && (
            <button
              type="button"
              onClick={() => onWidgetAction(widget.id, 'delete')}
              title="Remove Widget"
              className="p-1 rounded-lg text-[#4A4238]/40 hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer"
            >
              <IconTrash size={13} />
            </button>
          )}
        </div>
      )}

      {renderedContent}
    </div>
  );
}
