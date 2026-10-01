'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconTrendingUp,
  IconTrendingDown,
  IconAlertTriangle,
  IconX,
  IconClock,
  IconSparkles,
} from '@tabler/icons-react';
import { getAuthHeaders } from '../../lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface DigestChange {
  widget_id: string;
  title: string;
  binding_type: string;
  delta_pct: number;
  current_value: string | number | null;
  threshold_crossed: boolean;
  direction: 'up' | 'down' | 'neutral';
  snapshot_at?: string | null;
}

interface DigestData {
  last_visit_at: string | null;
  changes: DigestChange[];
  threshold_crossed: DigestChange[];
}

function relativeDate(iso: string | null): string {
  if (!iso) return 'last visit';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = diffMs / (1000 * 60 * 60);
  if (diffH < 1) return 'the last hour';
  if (diffH < 24) return `${Math.round(diffH)}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'yesterday';
  if (diffD < 7) return `${diffD} days ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatDelta(pct: number): string {
  const abs = Math.abs(pct);
  if (abs < 0.1) return '';
  return `${pct > 0 ? '+' : ''}${abs.toFixed(1)}%`;
}

export function DigestBanner({ dashboardId, className = '' }: { dashboardId: string; className?: string }) {
  const [data, setData] = useState<DigestData | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  const dismissKey = `digest_dismissed_${dashboardId}`;

  useEffect(() => {
    // Check if already dismissed for this session
    const lastDismiss = localStorage.getItem(dismissKey);
    if (lastDismiss) {
      const dismissedAt = new Date(lastDismiss);
      const hoursSince = (Date.now() - dismissedAt.getTime()) / (1000 * 60 * 60);
      // Re-show after 4 hours
      if (hoursSince < 4) {
        setDismissed(true);
        setLoading(false);
        return;
      }
    }

    const lastVisit = localStorage.getItem(`last_visit_${dashboardId}`);
    const url = `${API_BASE}/v1/dashboards/${dashboardId}/since-last-visit${lastVisit ? `?last_visit_at=${encodeURIComponent(lastVisit)}` : ''}`;

    fetch(url, { headers: getAuthHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: DigestData | null) => {
        if (d && (d.changes.length > 0 || d.threshold_crossed.length > 0)) {
          setData(d);
        }
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        // Update last visit time
        localStorage.setItem(`last_visit_${dashboardId}`, new Date().toISOString());
      });
  }, [dashboardId, dismissKey]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    localStorage.setItem(dismissKey, new Date().toISOString());
  }, [dismissKey]);

  if (loading || dismissed || !data) return null;

  const allChanges = data.changes;
  const visible = allChanges.slice(0, 4);
  const overflow = allChanges.length - 4;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -8, height: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        role="status"
        aria-live="polite"
        className={`w-full overflow-hidden ${className}`}
      >
        <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--surface)] border-b border-[var(--border)] flex-wrap">
          {/* Since label */}
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-muted)] shrink-0">
            <IconClock size={12} />
            <span>Since {relativeDate(data.last_visit_at)}</span>
          </div>

          <div className="w-px h-3.5 bg-[var(--border)] shrink-0" />

          {/* Change pills */}
          <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
            {visible.map((change) => {
              const isAlert = change.threshold_crossed;
              const isUp = change.direction === 'up';
              const isDown = change.direction === 'down';
              const delta = formatDelta(change.delta_pct);

              const color = isAlert
                ? '#D4A017'
                : isUp
                ? '#3FB68C'
                : isDown
                ? '#EF6C6C'
                : '#79A8DF';

              return (
                <span
                  key={change.widget_id}
                  className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full border"
                  style={{
                    color,
                    borderColor: `${color}30`,
                    backgroundColor: `${color}10`,
                  }}
                >
                  {isAlert ? (
                    <IconAlertTriangle size={10} />
                  ) : isUp ? (
                    <IconTrendingUp size={10} />
                  ) : isDown ? (
                    <IconTrendingDown size={10} />
                  ) : null}
                  <span className="truncate max-w-[120px]">{change.title}</span>
                  {delta && <span className="opacity-80">{delta}</span>}
                </span>
              );
            })}

            {overflow > 0 && (
              <span className="text-[11px] font-mono text-[var(--text-muted)]">
                +{overflow} more
              </span>
            )}
          </div>

          {/* AI narration hint if available */}
          {data.threshold_crossed.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#D4A017]/80 shrink-0">
              <IconSparkles size={10} />
              <span>Threshold alert</span>
            </span>
          )}

          {/* Dismiss */}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss digest"
            className="ml-auto p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors shrink-0 cursor-pointer"
          >
            <IconX size={13} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
