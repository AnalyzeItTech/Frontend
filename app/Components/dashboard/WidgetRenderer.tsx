'use client';

import React, { useRef, useState, useEffect } from 'react';
import { IconAlertTriangle, IconTrash } from '@tabler/icons-react';
import { useTheme } from '../ui/ThemeProvider';
import { resolveWidgetData, type WidgetSpec } from '../../lib/chatApi';

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
    <div className="glass-card rounded-2xl p-5 border border-[#4A4238]/10 dark:border-white/10 flex flex-col justify-between h-full shadow-sm hover:border-[#D4826A]/30 transition-all group relative">
      <div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono text-[#4A4238]/60 dark:text-white/60 uppercase tracking-wider block mb-1">
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
        <h3 className="font-serif text-lg font-medium text-[#4A4238] dark:text-[#EDE6DC]">
          {title}
        </h3>
      </div>
      <div className="mt-4 flex items-baseline justify-between">
        <span className="font-serif text-2xl sm:text-3xl font-bold text-[#4A4238] dark:text-white">
          {value}
        </span>
        {change && (
          <span
            className={`text-xs font-mono font-semibold flex items-center gap-1 ${
              positive !== false ? 'text-[#8FA98F]' : 'text-[#E14759]'
            }`}
          >
            {change}
          </span>
        )}
      </div>
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
    <div className="glass-card rounded-2xl p-5 border border-[#4A4238]/10 dark:border-white/10 flex flex-col justify-between h-full shadow-sm hover:border-[#D4826A]/30 transition-all group relative">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-[11px] font-mono text-[#4A4238]/60 dark:text-white/60 uppercase tracking-wider block">
            {metric}
          </span>
          <h3 className="font-serif text-lg font-medium text-[#4A4238] dark:text-[#EDE6DC]">
            {title}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-[#D4826A] bg-[#D4826A]/10 px-2 py-0.5 rounded-full">
            Live Chart
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
      </div>
      <div className="w-full h-36 relative flex items-center justify-center">
        <svg viewBox="0 0 300 110" className="w-full h-full overflow-visible">
          <polyline
            fill="none"
            stroke="#D4826A"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
          {data.map((d, i) => {
            const x = 30 + (i / Math.max(data.length - 1, 1)) * 240;
            const y = 90 - ((d.value - minVal) / range) * 70;
            return (
              <g key={i}>
                <circle cx={x} cy={y} r="4" fill="#D4826A" />
                <text
                  x={x}
                  y="105"
                  textAnchor="middle"
                  fontSize="9"
                  fill="currentColor"
                  opacity="0.6"
                  fontFamily="monospace"
                >
                  {d.date}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
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
  const metric = String(p.metric || widget.metric || 'Comparative Bar');
  const title = String(p.title || widget.title || 'Comparative Bar');
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
    <div className="glass-card rounded-2xl p-5 border border-[#4A4238]/10 dark:border-white/10 flex flex-col justify-between h-full shadow-sm hover:border-[#D4826A]/30 transition-all group relative">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-[11px] font-mono text-[#4A4238]/60 dark:text-white/60 uppercase tracking-wider block">
            {metric}
          </span>
          <h3 className="font-serif text-lg font-medium text-[#4A4238] dark:text-[#EDE6DC]">
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
              <span className="text-[10px] font-mono text-[#4A4238]/60 dark:text-white/60">
                {item.value}
              </span>
              <div
                className="w-full max-w-[36px] bg-[#D4826A]/80 hover:bg-[#D4826A] rounded-t-md transition-all"
                style={{ height: `${Math.max(heightPct, 8)}%` }}
              />
              <span className="text-[10px] font-mono text-[#4A4238]/60 dark:text-white/60">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
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
    <div className="glass-card rounded-2xl p-5 border border-[#4A4238]/10 dark:border-white/10 flex flex-col justify-between h-full shadow-sm group relative">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-[11px] font-mono text-[#4A4238]/60 dark:text-white/60 uppercase tracking-wider block">
            {metric}
          </span>
          <h3 className="font-serif text-lg font-medium text-[#4A4238] dark:text-[#EDE6DC]">
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
            <tr className="border-b border-[#4A4238]/10 dark:border-white/10 text-[#4A4238]/60 dark:text-white/60">
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
                className="border-b border-[#4A4238]/05 dark:border-white/05 hover:bg-black/5 dark:hover:bg-white/5"
              >
                {keys.map((k) => (
                  <td key={k} className="py-1.5 px-2 text-[#4A4238] dark:text-[#EDE6DC]">
                    {String(row[k] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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

  const bgColor = isDark ? '#1C1917' : '#FAF6F0';
  const textColor = isDark ? '#EDE6DC' : '#4A4238';
  const mutedColor = isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(74, 66, 56, 0.6)';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(74, 66, 56, 0.1)';
  const accentColor = '#D4826A';

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
      background: rgba(212, 130, 106, 0.15);
      color: ${accentColor};
    }
    .card {
      background: ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'};
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
    <div className="glass-card rounded-2xl p-4 border border-[#4A4238]/10 dark:border-white/10 flex flex-col justify-between h-full shadow-sm hover:border-[#D4826A]/30 transition-all min-h-[200px]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-serif font-medium truncate text-[#4A4238] dark:text-[#EDE6DC]">
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
        <div className="flex-1 relative w-full min-h-[140px] rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 border border-[#4A4238]/5 dark:border-white/5">
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
}: {
  widget: WidgetSpec;
  onWidgetAction?: (widgetId: string, action: string, payload?: unknown) => void;
}) {
  const mode = widget.render_mode || 'native';

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
}
