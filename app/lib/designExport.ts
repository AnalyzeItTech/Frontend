/**
 * Declarative dashboard design export — layout + tokens only.
 * Never includes Next.js source, API clients, auth, or internal keys.
 */

export type DesignExportPayload = {
  format: 'analyzeit-design-v1';
  exported_at: string;
  project: {
    /** Opaque export id — not a live API project_id for re-calling Backend A/B. */
    export_id: string;
    name: string;
  };
  layout: Record<string, unknown>;
  tokens: {
    fonts: Record<string, string>;
    colors: Record<string, string>;
    spacing: Record<string, string>;
    radius: Record<string, string>;
  };
  widget_schema_notes: string[];
};

const TOKEN_SNAPSHOT = {
  fonts: {
    serif: 'Fraunces, Georgia, serif',
    sans: 'Inter, system-ui, sans-serif',
    mono: 'Space Mono, monospace',
  },
  colors: {
    paper: '#F3EDE4',
    ink: '#4A4238',
    coral: '#EA8069',
    peach: '#EBA58F',
    surface: '#FFFCF8',
    border: '#E2D7CA',
    canvasDark: '#0B0D10',
    surfaceDark: '#14171B',
    textDark: '#EDEFF2',
    cobalt: '#3D6FE0',
  },
  spacing: {
    '1': '4px',
    '2': '8px',
    '3': '12px',
    '4': '16px',
    '6': '24px',
    '8': '32px',
  },
  radius: {
    card: '12px',
    control: '8px',
  },
};

const SENSITIVE_KEY =
  /^(authorization|auth|token|access_token|refresh_token|secret|secret_key|password|passwd|api[_-]?key|x[_-]?internal[_-]?key|internal[_-]?url|internal[_-]?key|bearer|cookie|dsn|connection_string|mongodb(_uri)?|private_key)$/i;

const SENSITIVE_SUBSTRING =
  /internal[_-]?key|x-internal|bearer\s|mongodb(\+srv)?:\/\/|sk-[a-z0-9]|api[_-]?key/i;

function scrubValue(value: unknown): unknown {
  if (typeof value === 'string') {
    if (SENSITIVE_SUBSTRING.test(value)) return '[redacted]';
    // Strip absolute Backend A/B URLs; keep relative presentational paths.
    if (/^https?:\/\/[^/]*(analyzeit|localhost|onrender|vercel)/i.test(value) && /\/(v1|internal|agent)\b/i.test(value)) {
      return '[redacted-api-url]';
    }
    return value;
  }
  if (Array.isArray(value)) return value.map(scrubValue);
  if (value && typeof value === 'object') return scrubObject(value as Record<string, unknown>);
  return value;
}

function scrubObject(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (SENSITIVE_KEY.test(key)) continue;
    // Drop debug / runtime metadata that is not presentational.
    if (
      key === 'project_id' ||
      key === 'user_id' ||
      key === 'run_id' ||
      key === 'action_id' ||
      key === 'debug' ||
      key === '_debug' ||
      key === 'trace' ||
      key === 'headers' ||
      key === 'fetchUrl' ||
      key === 'endpoint'
    ) {
      continue;
    }
    out[key] = scrubValue(val);
  }
  return out;
}

/** Presentational widget whitelist — structure + display props only. */
function scrubWidget(widget: unknown): Record<string, unknown> | null {
  if (!widget || typeof widget !== 'object') return null;
  const w = scrubObject(widget as Record<string, unknown>);
  // Keep common layout fields; drop anything that looks like a live binding endpoint.
  if (w.binding && typeof w.binding === 'object') {
    const binding = scrubObject(w.binding as Record<string, unknown>);
    delete binding.url;
    delete binding.href;
    delete binding.base_url;
    w.binding = binding;
  }
  return w;
}

export function sanitizeLayoutForExport(layout: Record<string, unknown>): Record<string, unknown> {
  const widgetsRaw = Array.isArray(layout.widgets) ? layout.widgets : [];
  const widgets = widgetsRaw
    .map(scrubWidget)
    .filter((w): w is Record<string, unknown> => Boolean(w));
  return {
    version: typeof layout.version === 'number' ? layout.version : 1,
    widgets,
  };
}

export function buildDesignExport(opts: {
  projectId: string;
  projectName: string;
  layout: Record<string, unknown>;
}): DesignExportPayload {
  const exportId = `exp_${opts.projectId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) || 'local'}`;
  return {
    format: 'analyzeit-design-v1',
    exported_at: new Date().toISOString(),
    project: { export_id: exportId, name: opts.projectName },
    layout: sanitizeLayoutForExport(opts.layout),
    tokens: TOKEN_SNAPSHOT,
    widget_schema_notes: [
      'Widgets are declarative JSON (type, props, data refs) — not executable app code.',
      'Re-implement locally using these tokens and layout.widgets; do not expect Backend A/B APIs.',
      'Sandboxed HTML widgets may include presentational markup only.',
      'Secrets, internal keys, API URLs, and live project/run IDs are stripped from this export.',
    ],
  };
}

export function downloadDesignExport(payload: DesignExportPayload, filename?: string) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `analyzeit-design-${payload.project.export_id}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
