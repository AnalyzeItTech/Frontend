'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconLayoutDashboard,
  IconSparkles,
  IconCheck,
  IconX,
  IconClock,
  IconAlertTriangle,
  IconRefresh,
  IconChartLine,
  IconPlus,
} from '@tabler/icons-react';
import { SandboxedWidgetRenderer } from './WidgetRenderer';
import { type WidgetSpec, type ManagedProposal } from '../../lib/chatApi';

const PROPOSAL_TTL_MS = 15 * 60 * 1000; // 15 minutes

interface DashboardCanvasProps {
  projectName: string;
  projectId?: string;
  layoutVersion: number;
  updatedBy: string;
  widgets: WidgetSpec[];
  proposals: ManagedProposal[];
  onAcceptProposal: (actionId: string) => Promise<void>;
  onRejectProposal: (actionId: string) => Promise<void>;
  onDismissProposal: (actionId: string) => void;
  onWidgetAction?: (widgetId: string, action: string, payload?: unknown) => void;
  onPromptChip?: (promptText: string) => void;
  isAgentRunning?: boolean;
}

export function DashboardCanvas({
  projectName,
  projectId,
  layoutVersion,
  updatedBy,
  widgets,
  proposals,
  onAcceptProposal,
  onRejectProposal,
  onDismissProposal,
  onWidgetAction,
  onPromptChip,
  isAgentRunning = false,
}: DashboardCanvasProps) {
  const activeProposals = proposals.filter(
    (p) => p.status === 'pending' || p.status === 'applying' || p.status === 'error'
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto space-y-6 p-4 sm:p-6 lg:p-8">
      {/* ─── Canvas Header Bar ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#4A4238]/10 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#D4826A]/15 text-[#D4826A] flex items-center justify-center flex-shrink-0">
            <IconLayoutDashboard size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-serif text-lg sm:text-xl font-medium tracking-tight text-[#4A4238] dark:text-[#EDE6DC]">
                {projectName}
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#D4826A]/10 text-[#D4826A] font-semibold">
                v{layoutVersion}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[#4A4238]/60 dark:text-white/60">
                {widgets.length} {widgets.length === 1 ? 'widget' : 'widgets'}
              </span>
            </div>
            <p className="text-[11px] font-mono text-[#4A4238]/60 dark:text-[#EDE6DC]/60 mt-0.5">
              {projectId ? (
                <>
                  Project ID: <span className="underline">{projectId.slice(0, 8)}…</span> ·{' '}
                </>
              ) : null}
              Last updated by <span className="font-semibold">{updatedBy || 'agent'}</span>
            </p>
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        {onPromptChip && (
          <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => onPromptChip('Add a line chart for Nasdaq QQQ trend')}
              disabled={isAgentRunning}
              className="px-2.5 py-1 rounded-lg text-[11px] font-mono bg-[#4A4238]/05 dark:bg-white/05 hover:bg-[#D4826A]/15 hover:text-[#D4826A] transition-all cursor-pointer disabled:opacity-40"
            >
              + QQQ Chart
            </button>
            <button
              type="button"
              onClick={() => onPromptChip('Add a metric card for Active Telemetry Nodes')}
              disabled={isAgentRunning}
              className="px-2.5 py-1 rounded-lg text-[11px] font-mono bg-[#4A4238]/05 dark:bg-white/05 hover:bg-[#D4826A]/15 hover:text-[#D4826A] transition-all cursor-pointer disabled:opacity-40"
            >
              + Telemetry KPI
            </button>
            <button
              type="button"
              onClick={() => onPromptChip('Add a table widget for Regional Health')}
              disabled={isAgentRunning}
              className="px-2.5 py-1 rounded-lg text-[11px] font-mono bg-[#4A4238]/05 dark:bg-white/05 hover:bg-[#D4826A]/15 hover:text-[#D4826A] transition-all cursor-pointer disabled:opacity-40"
            >
              + Regional Table
            </button>
          </div>
        )}
      </div>

      {/* ─── PENDING PROPOSALS BANNER STACK (SAFETY GATE) ───────────────── */}
      <AnimatePresence>
        {activeProposals.map((proposal) => {
          const isApplying = proposal.status === 'applying';
          const isError = proposal.status === 'error';
          const title =
            (proposal.widgetSpec.props?.title as string) ||
            proposal.widgetSpec.title ||
            'Untitled Widget';
          const componentType =
            proposal.widgetSpec.component || proposal.widgetSpec.type || 'widget';
          const isStale = Date.now() - proposal.createdAt > PROPOSAL_TTL_MS;

          return (
            <motion.div
              key={proposal.actionId}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`rounded-2xl p-5 border-2 shadow-lg space-y-4 transition-all ${
                isError
                  ? 'bg-red-500/10 border-red-500/40'
                  : 'bg-gradient-to-r from-[#D4826A]/15 via-[#E8C4A0]/20 to-[#D4826A]/10 border-[#D4826A]/50'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-mono text-[#D4826A] font-bold uppercase tracking-wider">
                    <IconSparkles size={15} />
                    Agent Proposed Dashboard Modification
                    {isStale && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full font-normal">
                        <IconClock size={12} /> Stale (&gt;15m)
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-serif text-[#4A4238] dark:text-[#EDE6DC]">
                    Action: <span className="font-semibold capitalize">{proposal.action.replace('_', ' ')}</span> · Type:{' '}
                    <span className="font-semibold text-[#D4826A]">{componentType}</span> (
                    <em>&quot;{title}&quot;</em>)
                  </p>
                  <p className="text-[11px] font-mono text-[#4A4238]/60 dark:text-white/60">
                    Action ID: {proposal.actionId} · Safety Gate: Human Confirmation Required
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                  {isError ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onDismissProposal(proposal.actionId)}
                        className="px-3 py-1.5 rounded-xl border border-[#4A4238]/20 dark:border-white/20 text-xs font-mono hover:bg-black/5 transition-all cursor-pointer"
                      >
                        Dismiss
                      </button>
                      <button
                        type="button"
                        onClick={() => onAcceptProposal(proposal.actionId)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#D4826A] hover:bg-[#C0734E] text-white text-xs font-mono flex items-center gap-1 transition-all shadow-sm cursor-pointer"
                      >
                        <IconRefresh size={14} />
                        <span>Retry</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onRejectProposal(proposal.actionId)}
                        disabled={isApplying}
                        className="px-3.5 py-2 rounded-xl border border-[#4A4238]/20 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/10 text-xs font-mono text-[#4A4238] dark:text-white flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                      >
                        <IconX size={14} />
                        <span>Reject</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onAcceptProposal(proposal.actionId)}
                        disabled={isApplying}
                        className="px-4 py-2 rounded-xl bg-[#D4826A] hover:bg-[#C0734E] text-white text-xs font-mono flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50 font-semibold"
                      >
                        {isApplying ? (
                          <>
                            <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Applying…</span>
                          </>
                        ) : (
                          <>
                            <IconCheck size={14} />
                            <span>Accept &amp; Apply</span>
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Error Detail banner */}
              {isError && proposal.error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-mono text-red-500">
                  <IconAlertTriangle size={14} className="flex-shrink-0" />
                  <span>{proposal.error}</span>
                </div>
              )}

              {/* Live Preview Box of the Proposed Widget */}
              <div className="mt-3 pt-3 border-t border-[#4A4238]/10 dark:border-white/10">
                <div className="text-[10px] font-mono text-[#D4826A] uppercase tracking-wider mb-2 flex items-center gap-1">
                  <span>Widget Preview</span>
                </div>
                <div className="max-w-md opacity-90 pointer-events-none">
                  <SandboxedWidgetRenderer widget={proposal.widgetSpec} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* ─── LIVE WIDGETS GRID CANVAS ────────────────────────────────────── */}
      {widgets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {widgets.map((widget) => {
            const isWide = widget.type === 'line_chart' || widget.type === 'table';
            return (
              <div
                key={widget.id}
                className={isWide ? 'md:col-span-2' : 'col-span-1'}
              >
                <SandboxedWidgetRenderer
                  widget={widget}
                  onWidgetAction={onWidgetAction}
                />
              </div>
            );
          })}
        </div>
      ) : activeProposals.length === 0 ? (
        /* ─── Empty State Placeholder ─────────────────────────────────────── */
        <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-3xl border-2 border-dashed border-[#4A4238]/15 dark:border-white/15 space-y-4 my-auto">
          <div className="w-16 h-16 rounded-3xl bg-[#D4826A]/10 text-[#D4826A] flex items-center justify-center">
            <IconChartLine size={32} />
          </div>
          <div className="max-w-md space-y-1.5">
            <h3 className="font-serif text-xl font-medium text-[#4A4238] dark:text-[#EDE6DC]">
              Interactive Dashboard Canvas
            </h3>
            <p className="text-xs text-[#4A4238]/60 dark:text-[#EDE6DC]/60 leading-relaxed">
              Your generated widgets, trend lines, and KPI metrics will render here as you explore data. Ask the AI agent in the chat or tap a starter below to build your canvas.
            </p>
          </div>

          {onPromptChip && (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => onPromptChip('Build a dashboard for Nasdaq-100 (QQQ)')}
                disabled={isAgentRunning}
                className="px-3 py-1.5 rounded-xl border border-[#4A4238]/15 dark:border-white/15 hover:border-[#D4826A] hover:bg-[#D4826A]/5 text-xs font-mono text-[#4A4238] dark:text-[#EDE6DC] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <IconPlus size={13} className="text-[#D4826A]" />
                <span>Build Nasdaq QQQ Dashboard</span>
              </button>
              <button
                type="button"
                onClick={() => onPromptChip('Add a line chart for Revenue Trend')}
                disabled={isAgentRunning}
                className="px-3 py-1.5 rounded-xl border border-[#4A4238]/15 dark:border-white/15 hover:border-[#D4826A] hover:bg-[#D4826A]/5 text-xs font-mono text-[#4A4238] dark:text-[#EDE6DC] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <IconPlus size={13} className="text-[#D4826A]" />
                <span>Add Revenue Trend</span>
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
