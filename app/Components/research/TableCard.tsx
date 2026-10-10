'use client';

import { useId } from 'react';
import type { ResultTable } from '../../lib/chatExtras.mjs';
import { formatValue } from '../../lib/chatExtras.mjs';

/** A result table (pivot, query rows) under an answer: scrollable, numbers right-aligned, says when it shows only the first rows. */
export function TableCard({ table }: { table: ResultTable }) {
  const uid = useId();
  const numeric = table.columns.map((_, c) => table.rows.length > 0 && table.rows.every((r) => typeof r[c] === 'number'));
  return (
    <figure className="app-card mt-3 space-y-2 p-4" aria-labelledby={`${uid}-t`}>
      {table.title ? (
        <figcaption id={`${uid}-t`} className="text-sm font-medium text-[var(--text-primary)]">
          {table.title}
        </figcaption>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr>
              {table.columns.map((c, i) => (
                <th key={i} scope="col" className={`py-1 pr-3 font-medium ${numeric[i] ? 'text-right' : ''}`}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((r, ri) => (
              <tr key={ri} className="border-t border-[var(--border)]">
                {r.map((v, ci) => (
                  <td key={ci} className={`py-1 pr-3 ${numeric[ci] ? 'text-right tabular-nums' : ''}`}>
                    {typeof v === 'number' ? formatValue(v) : v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {table.totalRows > table.rows.length ? (
        <p className="text-xs text-[var(--text-muted)]">
          Showing the first {table.rows.length} of {table.totalRows} rows.
        </p>
      ) : null}
    </figure>
  );
}
