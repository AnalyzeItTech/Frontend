'use client';

import { useEffect, useState } from 'react';
import { createNamedLayout, listNamedLayouts } from '../../lib/billingApi';

type Props = {
  projectId: string | null;
  currentLayout: { widgets?: unknown[] };
  onLoadLayout: (layout: { widgets?: unknown[] }) => void;
};

export function LayoutSwitcher({ projectId, currentLayout, onLoadLayout }: Props) {
  const [layouts, setLayouts] = useState<Array<{ id: string; name: string; layout_json: { widgets?: unknown[] } }>>([]);
  const [name, setName] = useState('Research view');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    listNamedLayouts(projectId)
      .then(setLayouts)
      .catch((err: Error) => setError(err.message));
  }, [projectId]);

  if (!projectId) return null;

  return (
    <div className="flex items-center gap-2">
      <label className="sr-only" htmlFor="layout-switcher">
        Saved layouts
      </label>
      <select
        id="layout-switcher"
        className="h-8 max-w-[10rem] rounded-lg border border-white/[0.08] bg-[#1C2025] px-2 text-xs text-[#EDEFF2]"
        onChange={(event) => {
          const found = layouts.find((row) => row.id === event.target.value);
          if (found?.layout_json) onLoadLayout(found.layout_json);
        }}
        defaultValue=""
      >
        <option value="">Active canvas</option>
        {layouts.map((row) => (
          <option key={row.id} value={row.id}>
            {row.name}
          </option>
        ))}
      </select>
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        aria-label="New layout name"
        className="h-8 w-28 rounded-lg border border-white/[0.08] bg-[#1C2025] px-2 text-xs text-[#EDEFF2]"
      />
      <button
        type="button"
        className="h-8 rounded-lg bg-[#3D6FE0] px-2 text-xs text-white"
        onClick={async () => {
          try {
            const created = await createNamedLayout(projectId, name, currentLayout);
            setLayouts((prev) => [created, ...prev]);
            setError(null);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Save failed');
          }
        }}
      >
        Save layout
      </button>
      {error ? (
        <span role="alert" className="text-[10px] text-[#EF6C6C]">
          {error}
        </span>
      ) : null}
    </div>
  );
}
