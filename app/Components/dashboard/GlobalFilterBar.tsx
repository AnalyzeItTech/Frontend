'use client';

import React from 'react';
import { IconCalendar, IconX } from '@tabler/icons-react';
import { DATE_PRESETS, type DateFilterState } from '../../lib/dashboardTools.mjs';

/**
 * Dashboard-wide date range. Widgets that have a time axis are trimmed to the range; the rest are left
 * alone, and the hint says how many of each so nothing is silently hidden.
 */
export function GlobalFilterBar({
  value,
  onChange,
  affected,
  total,
}: {
  value: DateFilterState;
  onChange: (next: DateFilterState) => void;
  /** Widgets that have a time axis and therefore react to the range. */
  affected: number;
  total: number;
}) {
  const active = value.preset !== 'all';
  const invalid = value.preset === 'custom' && value.from && value.to && value.from > value.to;
  return (
    <div role="group" aria-label="Dashboard date range" className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-xl border border-[#4A4238]/10 dark:border-[#3A3430] bg-[#4A4238]/[0.03] dark:bg-white/[0.02]">
      <IconCalendar size={14} className="text-[#EA8069]" aria-hidden="true" />
      <label className="sr-only" htmlFor="dash-date-preset">Date range</label>
      <select
        id="dash-date-preset"
        value={value.preset}
        onChange={(e) => onChange({ ...value, preset: e.target.value })}
        className="px-2 py-1 text-xs rounded-lg bg-transparent border border-[#4A4238]/15 dark:border-[#504740] text-[#4A4238] dark:text-[#F4EDE5] cursor-pointer"
      >
        {DATE_PRESETS.map((p) => (
          <option key={p.id} value={p.id}>{p.label}</option>
        ))}
      </select>
      {value.preset === 'custom' && (
        <>
          <label className="sr-only" htmlFor="dash-date-from">From</label>
          <input id="dash-date-from" type="date" value={value.from} onChange={(e) => onChange({ ...value, from: e.target.value })} className="px-2 py-1 text-xs rounded-lg bg-transparent border border-[#4A4238]/15 dark:border-[#504740] text-[#4A4238] dark:text-[#F4EDE5]" />
          <span className="text-xs text-[#91867E]" aria-hidden="true">to</span>
          <label className="sr-only" htmlFor="dash-date-to">To</label>
          <input id="dash-date-to" type="date" value={value.to} onChange={(e) => onChange({ ...value, to: e.target.value })} className="px-2 py-1 text-xs rounded-lg bg-transparent border border-[#4A4238]/15 dark:border-[#504740] text-[#4A4238] dark:text-[#F4EDE5]" />
        </>
      )}
      {active && (
        <button type="button" onClick={() => onChange({ preset: 'all', from: '', to: '' })} className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-[#EA8069] hover:bg-[#EA8069]/10 cursor-pointer">
          <IconX size={12} aria-hidden="true" /> Clear
        </button>
      )}
      <span className="ml-auto text-[11px] font-mono text-[#91867E]" role="status">
        {invalid
          ? 'Start date is after the end date'
          : active
            ? `Applies to ${affected} of ${total} widget${total === 1 ? '' : 's'} with a time axis`
            : 'Showing all data'}
      </span>
    </div>
  );
}
