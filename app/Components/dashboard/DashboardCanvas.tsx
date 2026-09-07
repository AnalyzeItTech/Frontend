'use client';

import React, { useState, useEffect } from 'react';
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
  IconPencil,
  IconArrowBackUp,
  IconHistory,
  IconDownload,
  IconCopy,
  IconFilter,
  IconTemplate,
  IconUsers,
} from '@tabler/icons-react';
import { SandboxedWidgetRenderer } from './WidgetRenderer';
import {
  type WidgetSpec,
  type ManagedProposal,
  type PresenceUser,
  type ProjectTemplate,
  saveProjectTemplate,
  getProjectTemplates,
} from '../../lib/chatApi';

const PROPOSAL_TTL_MS = 15 * 60 * 1000; // 15 minutes

export interface LayoutSnapshot {
  id: string;
  version: number;
  timestamp: string;
  actionSummary: string;
  widgets: WidgetSpec[];
}

interface DashboardCanvasProps {
  projectName: string;
  projectId?: string;
  layoutVersion: number;
  updatedBy: string;
  widgets: WidgetSpec[];
  proposals: ManagedProposal[];
  layoutHistory?: LayoutSnapshot[];
  onRollback?: (snapshot: LayoutSnapshot) => Promise<void>;
  onAcceptProposal: (actionId: string) => Promise<void>;
  onRejectProposal: (actionId: string) => Promise<void>;
  onDismissProposal: (actionId: string) => void;
  onUpdateProposalSpec?: (actionId: string, updatedSpec: WidgetSpec) => void;
  onWidgetAction?: (widgetId: string, action: string, payload?: unknown) => void;
  onPromptChip?: (promptText: string) => void;
  onRenameWorkspace?: (newTitle: string) => void;
  onRefine?: (widget: WidgetSpec) => void;
  onMoveWidget?: (fromIndex: number, toIndex: number) => void;
  onToggleWidgetWidth?: (widgetId: string) => void;
  onUndo?: () => void;
  lastActionToast?: { message: string; widgetTitle?: string } | null;
  onDismissToast?: () => void;
  isAgentRunning?: boolean;
  presenceUsers?: PresenceUser[];
  onSaveTemplate?: (name: string, description?: string, tags?: string[]) => Promise<void>;
  onLoadTemplate?: (template: ProjectTemplate) => void;
}

export function DashboardCanvas({
  projectName,
  projectId,
  layoutVersion,
  updatedBy,
  widgets,
  proposals,
  layoutHistory = [],
  onRollback,
  onAcceptProposal,
  onRejectProposal,
  onDismissProposal,
  onUpdateProposalSpec,
  onWidgetAction,
  onPromptChip,
  onRenameWorkspace,
  onRefine,
  onMoveWidget,
  onToggleWidgetWidth,
  onUndo,
  lastActionToast,
  onDismissToast,
  isAgentRunning = false,
  presenceUsers,
  onSaveTemplate,
  onLoadTemplate,
}: DashboardCanvasProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(projectName);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState(`${projectName} Template`);
  const [templateDesc, setTemplateDesc] = useState('');
  const [templateTags, setTemplateTags] = useState('finance, analytics');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [templateSaveSuccess, setTemplateSaveSuccess] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState<ProjectTemplate[]>([]);
  const [activeTemplateTab, setActiveTemplateTab] = useState<'save' | 'browse'>('save');
  const [activeFilter, setActiveFilter] = useState<{
    dimension: string;
    value: string;
    sourceWidgetId: string;
  } | null>(null);

  // Sync editedTitle when projectName changes externally
  useEffect(() => {
    setEditedTitle(projectName);
  }, [projectName]);

  const activeProposals = proposals.filter(
    (p) => p.status === 'pending' || p.status === 'applying' || p.status === 'error'
  );

  // ── Keyboard Navigation (Enter = Accept latest, Esc = Reject latest) ───────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeProposals.length === 0) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      const latest = activeProposals[0];
      if (e.key === 'Enter') {
        e.preventDefault();
        onAcceptProposal(latest.actionId);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onRejectProposal(latest.actionId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeProposals, onAcceptProposal, onRejectProposal]);

  // ─── Export Generators (High-DPI PNG + Markdown) ───────────────────────────

  const generateMarkdownExport = () => {
    const lines: string[] = [
      `# ${projectName} — Dashboard Summary`,
      `Generated on: ${new Date().toLocaleString()}`,
      `Version: v${layoutVersion} · Total Widgets: ${widgets.length}`,
      '',
      '---',
      '',
    ];

    widgets.forEach((w, idx) => {
      const comp = w.component || w.type || 'widget';
      const title = w.title || (w.props as any)?.title || `Widget ${idx + 1}`;
      lines.push(`## ${idx + 1}. ${title} (\`${comp}\`)`);
      if (w.freshness) lines.push(`*Freshness: ${w.freshness}*`);
      if (w.provenance) lines.push(`*Provenance: [${w.provenance.kind}] ${w.provenance.source}*`);
      lines.push('');

      if (comp === 'metric_card') {
        lines.push(`- **Value**: ${w.value || (w.props as any)?.value || '—'}`);
        if (w.change || (w.props as any)?.change) lines.push(`- **Change**: ${w.change || (w.props as any)?.change}`);
      } else if (comp === 'table' && Array.isArray(w.data || (w.props as any)?.data)) {
        const rows = (w.data || (w.props as any)?.data) as Array<Record<string, unknown>>;
        if (rows.length > 0) {
          const cols = Object.keys(rows[0]);
          lines.push(`| ${cols.join(' | ')} |`);
          lines.push(`| ${cols.map(() => '---').join(' | ')} |`);
          rows.forEach((r) => {
            lines.push(`| ${cols.map((c) => String(r[c] ?? '')).join(' | ')} |`);
          });
        }
      } else if (comp === 'sparkline_list' && Array.isArray((w.props as any)?.items)) {
        lines.push('| Item | Value | Change |');
        lines.push('| --- | --- | --- |');
        ((w.props as any).items as any[]).forEach((it) => {
          lines.push(`| ${it.label} | ${it.value} | ${it.change || '—'} |`);
        });
      } else if (comp === 'funnel' && Array.isArray((w.props as any)?.stages)) {
        lines.push('| Stage | Count |');
        lines.push('| --- | --- |');
        ((w.props as any).stages as any[]).forEach((stg) => {
          lines.push(`| ${stg.label} | ${stg.value.toLocaleString()} |`);
        });
      } else if (comp === 'text_block') {
        lines.push(String((w.props as any)?.body || (w.props as any)?.content || ''));
      } else {
        lines.push(`*Visual Primitive: ${comp} (${widgets.length} elements plotted)*`);
      }
      lines.push('', '---', '');
    });

    return lines.join('\n');
  };

  const exportCanvasAsPng = () => {
    const canvas = document.createElement('canvas');
    const width = 1200;
    const cardHeight = 160;
    const padding = 40;
    const cols = 2;
    const rows = Math.max(Math.ceil(widgets.length / cols), 1);
    const height = 140 + rows * (cardHeight + 20) + padding;

    canvas.width = width * 2;
    canvas.height = height * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(2, 2);

    ctx.fillStyle = '#171514';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#F4EDE5';
    ctx.font = 'bold 24px serif';
    ctx.fillText(projectName, padding, 50);

    ctx.fillStyle = '#91867E';
    ctx.font = '12px monospace';
    ctx.fillText(
      `AnalyzeIt Dashboard Export · v${layoutVersion} · ${new Date().toLocaleDateString()} · ${widgets.length} Widgets`,
      padding,
      75
    );

    ctx.strokeStyle = '#3A3430';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, 95);
    ctx.lineTo(width - padding, 95);
    ctx.stroke();

    const colWidth = (width - padding * 2 - 20) / cols;
    widgets.forEach((w, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = padding + col * (colWidth + 20);
      const y = 115 + row * (cardHeight + 20);

      const isSandboxed =
        w.render_mode === 'sandboxed' || w.type === 'sandboxed' || w.component === 'sandboxed';

      ctx.fillStyle = isSandboxed ? 'rgba(227, 131, 108, 0.08)' : '#211E1C';
      ctx.strokeStyle = isSandboxed ? 'rgba(227, 131, 108, 0.4)' : '#3A3430';
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.roundRect(x, y, colWidth, cardHeight, 12);
      ctx.fill();
      ctx.stroke();

      const title = w.title || (w.props as any)?.title || w.metric || 'Widget';
      const comp = (w.component || w.type || 'native') as string;

      ctx.fillStyle = '#E3836C';
      ctx.font = '10px monospace';
      ctx.fillText(comp.toUpperCase(), x + 16, y + 24);

      ctx.fillStyle = '#F4EDE5';
      ctx.font = 'bold 14px serif';
      ctx.fillText(title, x + 16, y + 44);

      if (isSandboxed) {
        ctx.fillStyle = '#E3836C';
        ctx.font = 'italic 11px monospace';
        ctx.fillText('[ ⛨ Security Boundary Isolated ]', x + 16, y + 80);
        ctx.fillStyle = '#91867E';
        ctx.font = '10px monospace';
        ctx.fillText('Sandboxed iframe DOM strictly isolated from host.', x + 16, y + 100);
        ctx.fillText(`Widget ID: ${w.id}`, x + 16, y + 118);
      } else if (comp === 'metric_card') {
        const val = String(w.value || (w.props as any)?.value || '—');
        const chg = String(w.change || (w.props as any)?.change || '');
        ctx.fillStyle = '#F4EDE5';
        ctx.font = 'bold 26px serif';
        ctx.fillText(val, x + 16, y + 90);
        if (chg) {
          ctx.fillStyle = '#9EBB9A';
          ctx.font = '12px monospace';
          ctx.fillText(chg, x + 16, y + 115);
        }
      } else {
        ctx.fillStyle = '#91867E';
        ctx.font = '11px monospace';
        ctx.fillText(`[Visual Primitive: ${comp}]`, x + 16, y + 85);
        if (w.freshness) {
          ctx.fillText(w.freshness, x + 16, y + 115);
        }
      }

      if (w.provenance) {
        ctx.fillStyle = '#91867E';
        ctx.font = '9px monospace';
        ctx.fillText(`Prov: ${w.provenance.kind} (${w.provenance.source})`, x + 16, y + cardHeight - 12);
      }
    });

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${projectName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_canvas.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div
      data-lenis-prevent
      className="flex-1 flex flex-col h-full overflow-y-auto space-y-6 p-4 sm:p-6 lg:p-8"
    >
      {/* ─── Persistent Status Strip ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-black/[0.03] dark:bg-[#211E1C] border border-[#4A4238]/10 dark:border-[#3A3430] text-[11px] font-mono">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              activeProposals.length > 0
                ? 'bg-amber-500 animate-pulse'
                : 'bg-emerald-500'
            }`}
          />
          <span className="font-semibold text-[#4A4238] dark:text-[#F4EDE5]">
            {activeProposals.length}{' '}
            {activeProposals.length === 1 ? 'pending proposal' : 'pending proposals'}
          </span>
          <span className="text-[#4A4238]/40 dark:text-[#91867E]">·</span>
          <span className="text-[#4A4238]/70 dark:text-[#C5B9AE]">
            {widgets.length} {widgets.length === 1 ? 'widget' : 'widgets'} applied
          </span>
          <span className="text-[#4A4238]/40 dark:text-[#91867E]">·</span>
          <span className="text-[#4A4238]/70 dark:text-[#C5B9AE]">
            v{layoutVersion}
          </span>
        </div>

        {activeProposals.length > 0 && (
          <div className="flex items-center gap-2 text-[10px] text-[#4A4238]/60 dark:text-[#91867E]">
            <span>
              Press{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-[#302B28] font-bold text-[#4A4238] dark:text-[#F4EDE5]">
                ↵ Enter
              </kbd>{' '}
              to accept ·{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-[#302B28] font-bold text-[#4A4238] dark:text-[#F4EDE5]">
                Esc
              </kbd>{' '}
              to reject
            </span>
          </div>
        )}
      </div>

      {/* ─── Active Filter Bus Strip ────────────────────────────────────── */}
      {activeFilter && (
        <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#E3836C]/10 border border-[#E3836C]/30 text-xs font-mono text-[#E3836C]">
          <div className="flex items-center gap-2 flex-wrap">
            <IconFilter size={14} />
            <span className="font-semibold">Reactive Filter Active:</span>
            <span className="px-2 py-0.5 rounded-md bg-[#E3836C]/20 font-bold">
              {activeFilter.dimension} = &quot;{activeFilter.value}&quot;
            </span>
            <span className="text-[10px] text-[#4A4238]/60 dark:text-[#91867E]">
              (Only widgets tagged with &apos;{activeFilter.dimension}&apos; react)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveFilter(null)}
            className="px-2 py-0.5 rounded-md hover:bg-[#E3836C]/20 transition-colors flex items-center gap-1 cursor-pointer font-semibold"
          >
            <IconX size={12} />
            <span>Clear Filter</span>
          </button>
        </div>
      )}

      {/* ─── Canvas Header Bar ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#4A4238]/10 dark:border-[#3A3430]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#E3836C]/15 text-[#E3836C] flex items-center justify-center flex-shrink-0">
            <IconLayoutDashboard size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {isEditingTitle ? (
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onBlur={() => {
                    setIsEditingTitle(false);
                    if (editedTitle.trim() && editedTitle !== projectName) {
                      onRenameWorkspace?.(editedTitle.trim());
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setIsEditingTitle(false);
                      if (editedTitle.trim() && editedTitle !== projectName) {
                        onRenameWorkspace?.(editedTitle.trim());
                      }
                    } else if (e.key === 'Escape') {
                      setEditedTitle(projectName);
                      setIsEditingTitle(false);
                    }
                  }}
                  autoFocus
                  className="font-serif text-lg sm:text-xl font-medium tracking-tight bg-transparent border-b border-[#E3836C] text-[#4A4238] dark:text-[#F4EDE5] focus:outline-none"
                />
              ) : (
                <div
                  onClick={() => setIsEditingTitle(true)}
                  className="group flex items-center gap-1.5 cursor-pointer"
                  title="Click to rename workspace"
                >
                  <h2 className="font-serif text-lg sm:text-xl font-medium tracking-tight text-[#4A4238] dark:text-[#F4EDE5] hover:text-[#ED967F] transition-colors">
                    {projectName}
                  </h2>
                  <IconPencil
                    size={14}
                    className="opacity-0 group-hover:opacity-60 text-[#4A4238]/50 dark:text-[#91867E] transition-opacity"
                  />
                </div>
              )}
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#E3836C]/10 text-[#E3836C] font-semibold">
                v{layoutVersion}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/5 dark:bg-[#302B28] text-[#4A4238]/60 dark:text-[#C5B9AE]">
                {widgets.length} {widgets.length === 1 ? 'widget' : 'widgets'}
              </span>
            </div>
            <p className="text-[11px] font-mono text-[#4A4238]/60 dark:text-[#91867E] mt-0.5 flex items-center gap-2 flex-wrap">
              {projectId ? (
                <>
                  Project ID: <span className="underline">{projectId.slice(0, 8)}…</span> ·{' '}
                </>
              ) : null}
              Last updated by <span className="font-semibold">{updatedBy || 'agent'}</span>
              {presenceUsers && presenceUsers.length > 0 && (
                <span className="inline-flex items-center gap-1.5 ml-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-mono border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{presenceUsers.length} online</span>
                  <span className="flex items-center -space-x-1 ml-0.5">
                    {presenceUsers.slice(0, 3).map((u) => {
                      const init = (u.user_name || 'U').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
                      return (
                        <span
                          key={u.user_id}
                          className="w-4 h-4 rounded-full bg-[#E3836C] text-white text-[8px] font-bold flex items-center justify-center ring-1 ring-white dark:ring-[#211E1C]"
                          title={`${u.user_name}${u.focused_widget_id ? ` (viewing ${u.focused_widget_id})` : ''}`}
                        >
                          {init}
                        </span>
                      );
                    })}
                  </span>
                </span>
              )}
            </p>
          </div>
        </div>

        {/* History, Export & Quick Suggestion Chips */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsHistoryOpen(true)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-mono border border-[#4A4238]/15 dark:border-[#3A3430] hover:border-[#E3836C] hover:bg-[#E3836C]/10 text-[#4A4238] dark:text-[#F4EDE5] transition-all flex items-center gap-1.5 cursor-pointer"
              title="View layout history snapshots and rollback"
            >
              <IconHistory size={13} />
              <span>History</span>
              {layoutHistory.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#E3836C]/15 text-[#E3836C] text-[9px] font-semibold">
                  {layoutHistory.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsExportOpen(true)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-mono border border-[#4A4238]/15 dark:border-[#3A3430] hover:border-[#E3836C] hover:bg-[#E3836C]/10 text-[#4A4238] dark:text-[#F4EDE5] transition-all flex items-center gap-1.5 cursor-pointer"
              title="Export canvas as High-DPI PNG or Markdown"
            >
              <IconDownload size={13} />
              <span>Export</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                setIsTemplateModalOpen(true);
                setTemplateName(`${projectName} Template`);
                setTemplateSaveSuccess(false);
                try {
                  const tpls = await getProjectTemplates();
                  setAvailableTemplates(tpls);
                } catch {}
              }}
              className="px-2.5 py-1 rounded-lg text-[11px] font-mono border border-[#4A4238]/15 dark:border-[#3A3430] hover:border-[#E3836C] hover:bg-[#E3836C]/10 text-[#4A4238] dark:text-[#F4EDE5] transition-all flex items-center gap-1.5 cursor-pointer"
              title="Save canvas as parameterized template or load existing"
            >
              <IconTemplate size={13} />
              <span>Templates</span>
            </button>
          </div>

          {onPromptChip && (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => onPromptChip('Add a line chart for Nasdaq QQQ trend')}
                disabled={isAgentRunning}
                className="px-2.5 py-1 rounded-lg text-[11px] font-mono bg-[#4A4238]/05 dark:bg-[#211E1C] dark:border dark:border-[#3A3430] hover:bg-[#E3836C]/15 hover:text-[#E3836C] text-[#4A4238] dark:text-[#C5B9AE] transition-all cursor-pointer disabled:opacity-40"
              >
                + QQQ Chart
              </button>
              <button
                type="button"
                onClick={() => onPromptChip('Add a metric card for Active Telemetry Nodes')}
                disabled={isAgentRunning}
                className="px-2.5 py-1 rounded-lg text-[11px] font-mono bg-[#4A4238]/05 dark:bg-[#211E1C] dark:border dark:border-[#3A3430] hover:bg-[#E3836C]/15 hover:text-[#E3836C] text-[#4A4238] dark:text-[#C5B9AE] transition-all cursor-pointer disabled:opacity-40"
              >
                + Telemetry KPI
              </button>
              <button
                type="button"
                onClick={() => onPromptChip('Add a table widget for Regional Health')}
                disabled={isAgentRunning}
                className="px-2.5 py-1 rounded-lg text-[11px] font-mono bg-[#4A4238]/05 dark:bg-[#211E1C] dark:border dark:border-[#3A3430] hover:bg-[#E3836C]/15 hover:text-[#E3836C] text-[#4A4238] dark:text-[#C5B9AE] transition-all cursor-pointer disabled:opacity-40"
              >
                + Regional Table
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── PENDING PROPOSALS BANNER STACK (SAFETY GATE) ───────────────── */}
      <AnimatePresence>
        {activeProposals.map((proposal) => {
          const isApplying = proposal.status === 'applying';
          const isError = proposal.status === 'error';
          const isMultiWidget = Array.isArray(proposal.widgets) && proposal.widgets.length > 0;
          const title =
            (proposal.widgetSpec?.props?.title as string) ||
            proposal.widgetSpec?.title ||
            (isMultiWidget ? proposal.widgets![0]?.title || 'Composite Dashboard' : 'Untitled Widget');
          const componentType =
            proposal.widgetSpec?.component ||
            proposal.widgetSpec?.type ||
            (isMultiWidget ? `Composite (${proposal.widgets!.length})` : 'widget');
          const isStale = Date.now() - proposal.createdAt > PROPOSAL_TTL_MS;

          return (
            <motion.div
              key={proposal.actionId}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`rounded-2xl p-5 border shadow-lg space-y-4 transition-all ${
                isError
                  ? 'bg-red-500/10 border-red-500/40'
                  : 'bg-[#FAF6F0] dark:bg-[#211E1C] border-[#4A4238]/20 dark:border-[#3A3430]'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-mono text-[#4A4238]/80 dark:text-[#C5B9AE] font-semibold uppercase tracking-wider">
                    <IconSparkles size={15} className="text-[#E3836C]" />
                    Agent Proposed Dashboard Modification
                    {isStale && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full font-normal">
                        <IconClock size={12} /> Stale (&gt;15m)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap text-sm font-serif text-[#4A4238] dark:text-[#F4EDE5]">
                    <span>Action:</span>
                    <span className="font-semibold capitalize px-2 py-0.5 rounded-md bg-black/5 dark:bg-[#302B28] text-xs font-mono">
                      {proposal.action.replace('_', ' ')}
                    </span>
                    <span>Type:</span>
                    <span className="font-semibold px-2 py-0.5 rounded-md bg-black/5 dark:bg-[#302B28] text-xs font-mono">
                      {isMultiWidget ? `${proposal.widgets!.length} widgets composed` : componentType}
                    </span>
                    {!isMultiWidget && proposal.widgetSpec && (
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => {
                          if (onUpdateProposalSpec && proposal.widgetSpec) {
                            const updated: WidgetSpec = {
                              ...proposal.widgetSpec,
                              title: e.target.value,
                              props: {
                                ...(proposal.widgetSpec.props || {}),
                                title: e.target.value,
                              },
                            } as WidgetSpec;
                            onUpdateProposalSpec(proposal.actionId, updated);
                          }
                        }}
                        className="px-2 py-0.5 rounded-md border border-[#4A4238]/20 dark:border-[#504740] bg-transparent text-xs font-serif font-medium text-[#4A4238] dark:text-[#F4EDE5] focus:border-[#E3836C] focus:outline-none"
                        title="Edit title before accepting"
                      />
                    )}
                  </div>

                  <p className="text-[11px] font-mono text-[#4A4238]/60 dark:text-[#91867E]">
                    Action ID: {proposal.actionId} · Safety Gate: Human Confirmation Required
                  </p>
                </div>

                {/* Primary CTA & Reject Actions */}
                <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                  {isError ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onDismissProposal(proposal.actionId)}
                        className="px-3 py-1.5 rounded-xl border border-[#4A4238]/20 dark:border-[#3A3430] text-xs font-mono text-[#4A4238] dark:text-[#F4EDE5] hover:bg-black/5 transition-all cursor-pointer"
                      >
                        Dismiss
                      </button>
                      <button
                        type="button"
                        onClick={() => onAcceptProposal(proposal.actionId)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#E3836C] hover:bg-[#ED967F] text-white text-xs font-mono flex items-center gap-1 transition-all shadow-sm cursor-pointer"
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
                        className="px-3.5 py-2 rounded-xl border border-[#4A4238]/20 dark:border-[#3A3430] hover:bg-black/5 dark:hover:bg-[#302B28] text-xs font-mono text-[#4A4238] dark:text-[#F4EDE5] flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                      >
                        <IconX size={14} />
                        <span>Reject</span>
                        <kbd className="hidden sm:inline-block text-[9px] px-1 py-0.2 rounded bg-black/10 dark:bg-[#302B28] opacity-70">
                          Esc
                        </kbd>
                      </button>
                      <button
                        type="button"
                        onClick={() => onAcceptProposal(proposal.actionId)}
                        disabled={isApplying}
                        className="px-4 py-2 rounded-xl bg-[#E3836C] hover:bg-[#ED967F] text-white text-xs font-mono flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50 font-semibold"
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
                            <kbd className="hidden sm:inline-block text-[9px] px-1 py-0.2 rounded bg-white/20 text-white font-mono">
                              ↵
                            </kbd>
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Edit-Before-Accept: Timeframe Selector for charts */}
              {!isMultiWidget && proposal.widgetSpec && (componentType === 'line_chart' || componentType === 'bar_chart') && (
                <div className="flex items-center gap-2 pt-2 border-t border-[#4A4238]/10 dark:border-[#3A3430] text-xs font-mono">
                  <span className="text-[#4A4238]/60 dark:text-[#91867E]">Timeframe:</span>
                  {(['1D', '1W', '1M', '1Y'] as const).map((tf) => {
                    const currentTf = proposal.widgetSpec?.timeframe || proposal.widgetSpec?.props?.timeframe || '1D';
                    const isSelected = currentTf === tf;
                    return (
                      <button
                        key={tf}
                        type="button"
                        onClick={() => {
                          if (onUpdateProposalSpec && proposal.widgetSpec) {
                            const updated: WidgetSpec = {
                              ...proposal.widgetSpec,
                              timeframe: tf,
                              props: {
                                ...(proposal.widgetSpec.props || {}),
                                timeframe: tf,
                              },
                            } as WidgetSpec;
                            onUpdateProposalSpec(proposal.actionId, updated);
                          }
                        }}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-mono transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#E3836C] text-white font-semibold'
                            : 'bg-black/5 dark:bg-[#292522] text-[#4A4238]/70 dark:text-[#C5B9AE] hover:bg-black/10'
                        }`}
                      >
                        {tf}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Error Detail banner */}
              {isError && proposal.error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-mono text-red-500">
                  <IconAlertTriangle size={14} className="flex-shrink-0" />
                  <span>{proposal.error}</span>
                </div>
              )}

              {/* Live Preview Box of the Proposed Widget (or Multi-Widget Grid) */}
              <div className="mt-3 pt-3 border-t border-[#4A4238]/10 dark:border-[#3A3430]">
                <div className="text-[10px] font-mono text-[#4A4238]/60 dark:text-[#91867E] uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Widget Preview</span>
                  <span className="text-[9px] text-[#91867E]">Interactive sandbox preview</span>
                </div>

                {isMultiWidget ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 opacity-95">
                    {proposal.widgets!.map((w, wIdx) => (
                      <div
                        key={w.id || wIdx}
                        className={w.type === 'line_chart' || w.type === 'table' ? 'md:col-span-2' : 'col-span-1'}
                      >
                        <SandboxedWidgetRenderer widget={w} isDraftPreview={true} />
                      </div>
                    ))}
                  </div>
                ) : proposal.widgetSpec ? (
                  <div className="max-w-md opacity-95">
                    <SandboxedWidgetRenderer widget={proposal.widgetSpec} isDraftPreview={true} />
                  </div>
                ) : null}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* ─── LIVE WIDGETS GRID CANVAS ────────────────────────────────────── */}
      {widgets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {widgets.map((widget, idx) => {
            const isWide =
              widget.span === 2 ||
              widget.type === 'line_chart' ||
              widget.type === 'table' ||
              widget.type === 'annotated_chart' ||
              widget.type === 'alert_banner' ||
              widget.type === 'composite_group';
            return (
              <div
                key={widget.id}
                className={isWide ? 'col-span-1 md:col-span-2' : 'col-span-1'}
              >
                <SandboxedWidgetRenderer
                  widget={widget}
                  activeFilter={activeFilter}
                  onWidgetAction={(widgetId, action, payload) => {
                    if (action === 'filter' && payload && typeof payload === 'object') {
                      const p = payload as any;
                      setActiveFilter({
                        dimension: p.dimension || 'ticker',
                        value: String(p.value || p.row || ''),
                        sourceWidgetId: widgetId,
                      });
                    } else {
                      onWidgetAction?.(widgetId, action, payload);
                    }
                  }}
                  onRefine={onRefine}
                  onMoveUp={
                    onMoveWidget && idx > 0
                      ? () => onMoveWidget(idx, idx - 1)
                      : undefined
                  }
                  onMoveDown={
                    onMoveWidget && idx < widgets.length - 1
                      ? () => onMoveWidget(idx, idx + 1)
                      : undefined
                  }
                  onToggleWidth={onToggleWidgetWidth}
                  isFirst={idx === 0}
                  isLast={idx === widgets.length - 1}
                />
              </div>
            );
          })}
        </div>
      ) : activeProposals.length === 0 ? (
        /* ─── Empty State Placeholder ─────────────────────────────────────── */
        <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-3xl border-2 border-dashed border-[#4A4238]/15 dark:border-[#3A3430] space-y-4 my-auto">
          <div className="w-16 h-16 rounded-3xl bg-[#E3836C]/10 text-[#E3836C] flex items-center justify-center">
            <IconChartLine size={32} />
          </div>
          <div className="max-w-md space-y-1.5">
            <h3 className="font-serif text-xl font-medium text-[#4A4238] dark:text-[#F4EDE5]">
              Interactive Dashboard Canvas
            </h3>
            <p className="text-xs text-[#4A4238]/60 dark:text-[#91867E] leading-relaxed">
              Your generated widgets, trend lines, and KPI metrics will render here as you explore data. Ask the AI agent in the chat or tap a starter below to build your canvas.
            </p>
          </div>

          {onPromptChip && (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => onPromptChip('Build a dashboard for Nasdaq-100 (QQQ)')}
                disabled={isAgentRunning}
                className="px-3 py-1.5 rounded-xl border border-[#4A4238]/15 dark:border-[#3A3430] hover:border-[#E3836C] hover:bg-[#E3836C]/5 text-xs font-mono text-[#4A4238] dark:text-[#F4EDE5] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <IconPlus size={13} className="text-[#E3836C]" />
                <span>Build Nasdaq QQQ Dashboard</span>
              </button>
              <button
                type="button"
                onClick={() => onPromptChip('Add a line chart for Revenue Trend')}
                disabled={isAgentRunning}
                className="px-3 py-1.5 rounded-xl border border-[#4A4238]/15 dark:border-[#3A3430] hover:border-[#E3836C] hover:bg-[#E3836C]/5 text-xs font-mono text-[#4A4238] dark:text-[#F4EDE5] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <IconPlus size={13} className="text-[#E3836C]" />
                <span>Add Revenue Trend</span>
              </button>
            </div>
          )}
        </div>
      ) : null}

      {/* ─── 5-SECOND UNDO TOAST NOTIFICATION ─────────────────────────────── */}
      <AnimatePresence>
        {lastActionToast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 bg-[#211E1C] dark:bg-[#F4EDE5] text-[#F4EDE5] dark:text-[#211E1C] px-4 py-3 rounded-2xl shadow-2xl border border-[#3A3430] dark:border-[#504740] flex items-center gap-3 text-xs font-mono"
          >
            <span>{lastActionToast.message}</span>
            {onUndo && (
              <button
                type="button"
                onClick={() => {
                  onUndo();
                  onDismissToast?.();
                }}
                className="px-2.5 py-1 rounded-lg bg-[#E3836C] text-white hover:bg-[#ED967F] font-semibold cursor-pointer transition-all flex items-center gap-1"
              >
                <IconArrowBackUp size={12} />
                <span>Undo</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onDismissToast?.()}
              className="opacity-50 hover:opacity-100 p-0.5 cursor-pointer"
            >
              <IconX size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── HISTORY DRAWER OVERLAY ────────────────────────────────────── */}
      <AnimatePresence>
        {isHistoryOpen && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-md h-full bg-[#FAF6F0] dark:bg-[#302B28] border-l border-[#4A4238]/15 dark:border-[#504740] p-6 flex flex-col shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#4A4238]/10 dark:border-[#504740]">
                <div className="flex items-center gap-2">
                  <IconHistory size={20} className="text-[#E3836C]" />
                  <div>
                    <h3 className="font-serif text-lg font-medium text-[#4A4238] dark:text-[#F4EDE5]">
                      Layout Version History
                    </h3>
                    <p className="text-[11px] font-mono text-[#4A4238]/60 dark:text-[#91867E]">
                      Current: v{layoutVersion} · Monotonic OCC
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsHistoryOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-[#4A4238]/60 dark:text-[#91867E] hover:text-[#4A4238] dark:hover:text-[#F4EDE5] cursor-pointer"
                >
                  <IconX size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {(!layoutHistory || layoutHistory.length === 0) ? (
                  <div className="p-8 text-center text-xs font-mono text-[#4A4238]/60 dark:text-[#91867E] border border-dashed border-[#4A4238]/20 dark:border-[#504740] rounded-2xl">
                    No previous snapshots yet. Canvas mutations create checkpoints here.
                  </div>
                ) : (
                  [...layoutHistory].reverse().map((snap) => (
                    <div
                      key={snap.id}
                      className="p-4 rounded-xl border border-[#4A4238]/10 dark:border-[#504740] bg-black/[0.02] dark:bg-[#292522] space-y-2 hover:border-[#E3836C]/40 transition-all"
                    >
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-semibold px-2 py-0.5 rounded-md bg-[#E3836C]/10 text-[#E3836C]">
                          v{snap.version}
                        </span>
                        <span className="text-[10px] text-[#4A4238]/60 dark:text-[#91867E]">
                          {snap.timestamp}
                        </span>
                      </div>

                      <p className="text-xs font-serif text-[#4A4238] dark:text-[#F4EDE5]">
                        {snap.actionSummary || `${snap.widgets.length} widgets on canvas`}
                      </p>

                      <div className="flex items-center justify-between pt-2 border-t border-[#4A4238]/5 dark:border-[#504740]">
                        <span className="text-[10px] font-mono text-[#4A4238]/60 dark:text-[#91867E]">
                          {snap.widgets.length} widgets
                        </span>
                        {onRollback && (
                          <button
                            type="button"
                            onClick={async () => {
                              await onRollback(snap);
                              setIsHistoryOpen(false);
                            }}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-mono bg-[#E3836C] hover:bg-[#ED967F] text-white font-medium cursor-pointer transition-all flex items-center gap-1 shadow-xs"
                          >
                            <IconArrowBackUp size={12} />
                            <span>Rollback</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-3 rounded-xl bg-black/[0.03] dark:bg-[#292522] text-[10px] font-mono text-[#4A4238]/60 dark:text-[#91867E]">
                Rolling back applies the snapshot layout and advances version to <strong>v{layoutVersion + 1}</strong> monotonically.
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── EXPORT CANVAS MODAL ────────────────────────────────────────── */}
      <AnimatePresence>
        {isExportOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#FAF6F0] dark:bg-[#302B28] border border-[#4A4238]/20 dark:border-[#504740] rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#4A4238]/10 dark:border-[#504740]">
                <div className="flex items-center gap-2">
                  <IconDownload size={20} className="text-[#E3836C]" />
                  <h3 className="font-serif text-lg font-medium text-[#4A4238] dark:text-[#F4EDE5]">
                    Export Dashboard Canvas
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsExportOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-[#4A4238]/60 dark:text-[#91867E] hover:text-[#4A4238] dark:hover:text-[#F4EDE5] cursor-pointer"
                >
                  <IconX size={16} />
                </button>
              </div>

              <p className="text-xs font-mono text-[#4A4238]/70 dark:text-[#C5B9AE]">
                Choose an export format for &quot;{projectName}&quot; (v{layoutVersion}, {widgets.length} widgets).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* PNG Export */}
                <button
                  type="button"
                  onClick={() => {
                    exportCanvasAsPng();
                    setIsExportOpen(false);
                  }}
                  className="p-4 rounded-2xl border border-[#4A4238]/15 dark:border-[#504740] hover:border-[#E3836C] hover:bg-[#E3836C]/5 dark:bg-[#292522] transition-all text-left space-y-2 cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-xl bg-[#E3836C]/10 text-[#E3836C] flex items-center justify-center">
                    <IconDownload size={18} />
                  </div>
                  <div>
                    <h4 className="font-serif text-sm font-semibold text-[#4A4238] dark:text-[#F4EDE5] group-hover:text-[#E3836C]">
                      High-DPI Image (.PNG)
                    </h4>
                    <p className="text-[11px] font-mono text-[#4A4238]/60 dark:text-[#91867E] mt-0.5">
                      Full visual snapshot. Sandboxed iframes isolated with security boundary card.
                    </p>
                  </div>
                </button>

                {/* Markdown Export */}
                <button
                  type="button"
                  onClick={async () => {
                    const md = generateMarkdownExport();
                    await navigator.clipboard.writeText(md);
                    setCopiedMarkdown(true);
                    setTimeout(() => {
                      setCopiedMarkdown(false);
                      setIsExportOpen(false);
                    }, 1500);
                  }}
                  className="p-4 rounded-2xl border border-[#4A4238]/15 dark:border-[#504740] hover:border-[#E3836C] hover:bg-[#E3836C]/5 dark:bg-[#292522] transition-all text-left space-y-2 cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-xl bg-[#0284C7]/10 text-[#0284C7] flex items-center justify-center">
                    {copiedMarkdown ? <IconCheck size={18} /> : <IconCopy size={18} />}
                  </div>
                  <div>
                    <h4 className="font-serif text-sm font-semibold text-[#4A4238] dark:text-[#F4EDE5] group-hover:text-[#0284C7]">
                      {copiedMarkdown ? 'Copied to Clipboard!' : 'Markdown Report'}
                    </h4>
                    <p className="text-[11px] font-mono text-[#4A4238]/60 dark:text-[#91867E] mt-0.5">
                      Structured Markdown tables, KPI metrics, and data provenance.
                    </p>
                  </div>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Template Authoring & Library Modal ─────────────────────────── */}
      <AnimatePresence>
        {isTemplateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#FAF6F0] dark:bg-[#302B28] border border-[#4A4238]/20 dark:border-[#504740] rounded-3xl p-6 w-full max-w-xl shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#4A4238]/10 dark:border-[#504740]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#E3836C]/10 text-[#E3836C] flex items-center justify-center">
                    <IconTemplate size={18} />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-semibold text-[#4A4238] dark:text-[#F4EDE5]">
                      Dashboard Templates
                    </h3>
                    <p className="text-[11px] font-mono text-[#4A4238]/60 dark:text-[#91867E]">
                      Export reusable canvas blueprints or load existing recipes
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-[#4A4238]/60 dark:text-[#91867E] hover:text-[#4A4238] dark:hover:text-[#F4EDE5] cursor-pointer"
                >
                  <IconX size={18} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 border-b border-[#4A4238]/10 dark:border-[#504740] pb-2 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setActiveTemplateTab('save')}
                  className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                    activeTemplateTab === 'save'
                      ? 'bg-[#E3836C]/15 text-[#E3836C] font-semibold'
                      : 'text-[#4A4238]/60 dark:text-[#91867E] hover:text-[#4A4238] dark:hover:text-[#F4EDE5]'
                  }`}
                >
                  Save Current Canvas
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setActiveTemplateTab('browse');
                    try {
                      const tpls = await getProjectTemplates();
                      setAvailableTemplates(tpls);
                    } catch {}
                  }}
                  className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                    activeTemplateTab === 'browse'
                      ? 'bg-[#E3836C]/15 text-[#E3836C] font-semibold'
                      : 'text-[#4A4238]/60 dark:text-[#91867E] hover:text-[#4A4238] dark:hover:text-[#F4EDE5]'
                  }`}
                >
                  Browse Library ({availableTemplates.length})
                </button>
              </div>

              {/* Tab Content: Save */}
              {activeTemplateTab === 'save' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-mono font-medium text-[#4A4238] dark:text-[#F4EDE5] mb-1">
                      Template Name
                    </label>
                    <input
                      type="text"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="e.g. Fintech KPI Dashboard"
                      className="w-full px-3 py-2 rounded-xl border border-[#4A4238]/20 dark:border-[#504740] text-xs font-mono bg-white dark:bg-[#292522] text-[#2D2621] dark:text-[#F4EDE5] outline-none focus:border-[#E3836C]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono font-medium text-[#4A4238] dark:text-[#F4EDE5] mb-1">
                      Description (Optional)
                    </label>
                    <textarea
                      value={templateDesc}
                      onChange={(e) => setTemplateDesc(e.target.value)}
                      rows={2}
                      placeholder="e.g. Standard layout with telemetry KPI cards, distribution table, and annotated chart."
                      className="w-full px-3 py-2 rounded-xl border border-[#4A4238]/20 dark:border-[#504740] text-xs font-mono bg-white dark:bg-[#292522] text-[#2D2621] dark:text-[#F4EDE5] outline-none focus:border-[#E3836C]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono font-medium text-[#4A4238] dark:text-[#F4EDE5] mb-1">
                      Tags (Comma-separated)
                    </label>
                    <input
                      type="text"
                      value={templateTags}
                      onChange={(e) => setTemplateTags(e.target.value)}
                      placeholder="finance, kpi, monitoring"
                      className="w-full px-3 py-2 rounded-xl border border-[#4A4238]/20 dark:border-[#504740] text-xs font-mono bg-white dark:bg-[#292522] text-[#2D2621] dark:text-[#F4EDE5] outline-none focus:border-[#E3836C]"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] font-mono text-amber-800 dark:text-amber-200">
                    <p className="font-semibold mb-0.5">🛡️ Sanitized Export Pipeline</p>
                    <p className="opacity-80">
                      Literal series arrays and credentials are automatically stripped. Query bindings are tokenized (e.g. <code className="px-1 py-0.5 rounded bg-black/10 dark:bg-[#302B28]">{'{{TICKER}}'}</code>) so this recipe can be safely cloned across workspaces without data leaks.
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsTemplateModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-mono border border-[#4A4238]/20 dark:border-[#504740] hover:bg-black/5 dark:hover:bg-white/5 text-[#4A4238] dark:text-[#F4EDE5] cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSavingTemplate || !templateName.trim()}
                      onClick={async () => {
                        setIsSavingTemplate(true);
                        try {
                          const tagList = templateTags.split(',').map((t) => t.trim()).filter(Boolean);
                          if (onSaveTemplate) {
                            await onSaveTemplate(templateName, templateDesc, tagList);
                          } else {
                            await saveProjectTemplate(templateName, widgets, templateDesc, tagList);
                          }
                          setTemplateSaveSuccess(true);
                          const tpls = await getProjectTemplates();
                          setAvailableTemplates(tpls);
                          setTimeout(() => {
                            setTemplateSaveSuccess(false);
                            setIsTemplateModalOpen(false);
                          }, 1200);
                        } catch (err: any) {
                          alert(err?.message || 'Failed to save template');
                        } finally {
                          setIsSavingTemplate(false);
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-[#E3836C] hover:bg-[#ED967F] text-white font-mono text-xs font-semibold cursor-pointer disabled:opacity-50 transition-all flex items-center gap-1.5"
                    >
                      {templateSaveSuccess ? (
                        <>
                          <IconCheck size={14} /> Saved Sanitized Template!
                        </>
                      ) : isSavingTemplate ? (
                        'Sanitizing & Saving…'
                      ) : (
                        'Save as Template'
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Tab Content: Browse */}
              {activeTemplateTab === 'browse' && (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {availableTemplates.length === 0 ? (
                    <div className="text-center py-8 text-xs font-mono text-[#4A4238]/60 dark:text-[#91867E]">
                      No templates saved yet. Click &quot;Save Current Canvas&quot; to create one.
                    </div>
                  ) : (
                    availableTemplates.map((tpl) => (
                      <div
                        key={tpl.id}
                        className="p-3.5 rounded-2xl border border-[#4A4238]/15 dark:border-[#504740] bg-white/50 dark:bg-[#292522] space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-serif text-sm font-semibold text-[#4A4238] dark:text-[#F4EDE5]">
                            {tpl.name}
                          </h4>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#E3836C]/10 text-[#E3836C] font-semibold">
                            {tpl.widgets?.length || 0} widgets
                          </span>
                        </div>
                        {tpl.description && (
                          <p className="text-[11px] font-mono text-[#4A4238]/70 dark:text-[#C5B9AE]">
                            {tpl.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between pt-1">
                          <div className="flex flex-wrap gap-1">
                            {tpl.tags?.map((t) => (
                              <span
                                key={t}
                                className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-black/5 dark:bg-[#302B28] text-[#4A4238]/60 dark:text-[#91867E]"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                          {onLoadTemplate && (
                            <button
                              type="button"
                              onClick={() => {
                                onLoadTemplate(tpl);
                                setIsTemplateModalOpen(false);
                              }}
                              className="px-3 py-1 rounded-lg bg-[#E3836C]/15 hover:bg-[#E3836C] hover:text-white text-[#E3836C] text-[11px] font-mono font-semibold transition-all cursor-pointer"
                            >
                              Load Recipe
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
