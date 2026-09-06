'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconPlus,
  IconWorld,
  IconLayoutGrid,
  IconList,
  IconTrendingUp,
  IconAlertTriangle,
  IconActivity,
  IconArrowUpRight,
  IconSearch,
  IconShieldLock,
  IconSparkles,
  IconCheck,
  IconX,
  IconDeviceAnalytics,
  IconLayoutDashboard,
  IconChartLine,
  IconSend,
} from '@tabler/icons-react';
import { ThemeToggle } from '../Components/ui/ThemeToggle';
import { useTheme } from '../Components/ui/ThemeProvider';
import {
  getProjectLayout,
  applyUIAction,
  getProjects,
  streamChat,
  type WidgetSpec,
  type UIProposalPayload,
} from '../lib/chatApi';
import { getStoredUser, logout, type UserProfile } from '../lib/auth';

const EarthGlobe = dynamic(
  () => import('../Components/3d/EarthGlobe').then((mod) => mod.EarthGlobe),
  { ssr: false }
);

// --- Sandboxed Audited Widget Components (Fixed Component Whitelist) ---

function MetricCardWidget({ widget }: { widget: WidgetSpec }) {
  const p = widget.props || widget;
  const metric = (p.metric as string) || widget.metric || 'Metric';
  const title = (p.title as string) || widget.title || 'Metric';
  const value = (p.value as string) || widget.value || '0';
  const change = (p.change as string) || widget.change;
  const positive = p.positive ?? widget.positive;

  return (
    <div className="glass-card rounded-2xl p-5 border border-[#4A4238]/10 dark:border-white/10 flex flex-col justify-between h-full shadow-sm hover:border-[#D4826A]/30 transition-all">
      <div>
        <span className="text-[11px] font-mono text-[#4A4238]/60 dark:text-white/60 uppercase tracking-wider block mb-1">
          {metric}
        </span>
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

function LineChartWidget({ widget }: { widget: WidgetSpec }) {
  const p = widget.props || widget;
  const metric = (p.metric as string) || widget.metric || 'Trend Line';
  const title = (p.title as string) || widget.title || 'Trend Line';
  const data = (p.data as Array<{ date?: string; value?: number }>) || (widget.data as Array<{ date?: string; value?: number }>) || [
    { date: 'Jan', value: 30 },
    { date: 'Feb', value: 45 },
    { date: 'Mar', value: 60 },
    { date: 'Apr', value: 85 },
  ];
  const maxVal = Math.max(...data.map((d) => Number(d.value) || 1), 1);
  const points = data
    .map((d, i) => {
      const x = 30 + (i / Math.max(data.length - 1, 1)) * 240;
      const y = 90 - ((Number(d.value) || 0) / maxVal) * 70;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="glass-card rounded-2xl p-5 border border-[#4A4238]/10 dark:border-white/10 flex flex-col justify-between h-full shadow-sm hover:border-[#D4826A]/30 transition-all">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-[11px] font-mono text-[#4A4238]/60 dark:text-white/60 uppercase tracking-wider block">
            {metric}
          </span>
          <h3 className="font-serif text-lg font-medium text-[#4A4238] dark:text-[#EDE6DC]">
            {title}
          </h3>
        </div>
        <span className="text-xs font-mono text-[#D4826A] bg-[#D4826A]/10 px-2 py-0.5 rounded-full">
          Safe SVG
        </span>
      </div>
      <div className="w-full h-32 relative flex items-center justify-center">
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
            const y = 90 - ((Number(d.value) || 0) / maxVal) * 70;
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

function BarChartWidget({ widget }: { widget: WidgetSpec }) {
  const p = widget.props || widget;
  const metric = (p.metric as string) || widget.metric || 'Comparative Bar';
  const title = (p.title as string) || widget.title || 'Comparative Bar';
  const data = (p.data as Array<{ date?: string; label?: string; value?: number }>) || (widget.data as Array<{ date?: string; label?: string; value?: number }>) || [
    { label: 'Q1', value: 40 },
    { label: 'Q2', value: 65 },
    { label: 'Q3', value: 85 },
    { label: 'Q4', value: 110 },
  ];
  const maxVal = Math.max(...data.map((d) => Number(d.value) || 1), 1);

  return (
    <div className="glass-card rounded-2xl p-5 border border-[#4A4238]/10 dark:border-white/10 flex flex-col justify-between h-full shadow-sm hover:border-[#D4826A]/30 transition-all">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-[11px] font-mono text-[#4A4238]/60 dark:text-white/60 uppercase tracking-wider block">
            {metric}
          </span>
          <h3 className="font-serif text-lg font-medium text-[#4A4238] dark:text-[#EDE6DC]">
            {title}
          </h3>
        </div>
      </div>
      <div className="w-full h-32 flex items-end justify-around gap-2 pt-4">
        {data.map((item, idx) => {
          const heightPct = Math.round(((Number(item.value) || 0) / maxVal) * 100);
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
                {item.label || item.date || `C${idx + 1}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TableWidget({ widget }: { widget: WidgetSpec }) {
  const p = widget.props || widget;
  const metric = (p.metric as string) || widget.metric || 'Tabular Data';
  const title = (p.title as string) || widget.title || 'Tabular Data';
  const rows = (p.data as Array<Record<string, unknown>>) || (widget.data as Array<Record<string, unknown>>) || [
    { region: 'US-East', status: 'Optimal', latency: '22ms' },
    { region: 'EU-Central', status: 'Optimal', latency: '28ms' },
    { region: 'AP-South', status: 'Optimal', latency: '41ms' },
  ];
  const keys = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="glass-card rounded-2xl p-5 border border-[#4A4238]/10 dark:border-white/10 flex flex-col justify-between h-full shadow-sm">
      <div className="mb-3">
        <span className="text-[11px] font-mono text-[#4A4238]/60 dark:text-white/60 uppercase tracking-wider block">
          {metric}
        </span>
        <h3 className="font-serif text-lg font-medium text-[#4A4238] dark:text-[#EDE6DC]">
          {title}
        </h3>
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
const NATIVE_WIDGET_REGISTRY: Record<
  string,
  React.ComponentType<{ widget: WidgetSpec }>
> = {
  metric_card: MetricCardWidget,
  line_chart: LineChartWidget,
  bar_chart: BarChartWidget,
  table: TableWidget,
};

// ── Sandboxed Frame Component (Option A Ready) ──────────────────────────────
function SandboxedFrameWidget({ widget }: { widget: WidgetSpec }) {
  const p = widget.props || widget;
  const title = String(p.title || widget.title || 'Sandboxed Widget');

  return (
    <div className="glass-card rounded-2xl p-4 border border-[#4A4238]/10 dark:border-white/10 flex flex-col justify-between h-full shadow-sm relative overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono text-[#D4826A] uppercase tracking-wider bg-[#D4826A]/10 px-2 py-0.5 rounded-full">
          Sandboxed Frame
        </span>
        <span className="text-xs font-mono opacity-50">{widget.component || 'Custom'}</span>
      </div>
      {widget.code ? (
        <iframe
          srcDoc={widget.code}
          sandbox="allow-scripts"
          className="w-full flex-1 border-0 rounded-lg bg-transparent"
          title={title}
        />
      ) : (
        <div className="flex items-center justify-center flex-1 text-xs font-mono text-[#4A4238]/60 dark:text-white/60">
          Sandboxed container ready (waiting for code payload)
        </div>
      )}
    </div>
  );
}

// ── Main Mode Dispatcher ───────────────────────────────────────────────────
function SandboxedWidgetRenderer({ widget }: { widget: WidgetSpec }) {
  const mode = widget.render_mode || 'native';

  if (mode === 'native') {
    const compKey = widget.component || widget.type || 'metric_card';
    const Component = NATIVE_WIDGET_REGISTRY[compKey];
    if (Component) {
      return <Component widget={widget} />;
    }
    return (
      <div className="glass-card rounded-2xl p-4 border border-dashed border-red-400 text-xs text-red-500 font-mono">
        Unknown native widget component: {String(compKey)}
      </div>
    );
  }

  if (mode === 'sandboxed') {
    return <SandboxedFrameWidget widget={widget} />;
  }

  return (
    <div className="glass-card rounded-2xl p-4 border border-dashed border-amber-400 text-xs text-amber-500 font-mono">
      Unsupported render mode: {String(mode)}
    </div>
  );
}

interface PinnedSheet {
  id: string;
  title: string;
  category: string;
  syncedAgo: string;
  summary: string;
  metricLabel: string;
  metricChange: string;
  status: 'positive' | 'warning' | 'neutral';
  route: string;
}

interface PreviousProject {
  id: string;
  title: string;
  updatedAgo: string;
  summary: string;
  tag: string;
  tagColor: string;
  queriesCount: number;
}

export default function DashboardPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [isGlobeExpanded, setIsGlobeExpanded] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  // Active Scoped Project & Generative Canvas State
  const [activeProjectId, setActiveProjectId] = useState<string>('default');
  const [activeProjectName, setActiveProjectName] = useState<string>('Pricing Tier Sensitivity Audit');
  const [layoutVersion, setLayoutVersion] = useState<number>(1);
  const [updatedBy, setUpdatedBy] = useState<string>('system');
  const [currentLayout, setCurrentLayout] = useState<{ widgets: WidgetSpec[] }>({
    widgets: [
      {
        id: 'w-mrr',
        type: 'metric_card',
        title: 'Monthly Recurring Revenue',
        metric: 'mrr',
        value: '$128,450',
        change: '+12.4%',
        positive: true,
        position: { x: 0, y: 0, w: 4, h: 2 },
      },
      {
        id: 'w-active-users',
        type: 'metric_card',
        title: 'Active Telemetry Nodes',
        metric: 'nodes',
        value: '1,420',
        change: '+5.8%',
        positive: true,
        position: { x: 4, y: 0, w: 4, h: 2 },
      },
      {
        id: 'w-rev-trend',
        type: 'line_chart',
        title: 'Revenue Trend',
        metric: 'revenue',
        data: [
          { date: 'Jan', value: 95000 },
          { date: 'Feb', value: 105000 },
          { date: 'Mar', value: 115000 },
          { date: 'Apr', value: 128450 },
        ],
        position: { x: 0, y: 2, w: 8, h: 4 },
      },
    ],
  });

  // Agent proposal state
  const [pendingProposal, setPendingProposal] = useState<UIProposalPayload | null>(null);
  const [agentPrompt, setAgentPrompt] = useState<string>('');
  const [isAgentRunning, setIsAgentRunning] = useState<boolean>(false);
  const [agentStatus, setAgentStatus] = useState<string>('');
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const currentUser = getStoredUser();
    setUser(currentUser);

    async function loadWorkspace() {
      try {
        const projs = await getProjects(currentUser?.id);
        if (projs && projs.length > 0) {
          const p = projs[0];
          setActiveProjectId(p.id);
          setActiveProjectName(p.name);
          const layoutData = await getProjectLayout(p.id);
          if (layoutData && layoutData.layout_json?.widgets) {
            setCurrentLayout(layoutData.layout_json);
            setLayoutVersion(layoutData.version);
            setUpdatedBy(layoutData.updated_by || 'user');
          }
        }
      } catch (err) {
        console.warn('Could not load remote project layout, using starter sandbox:', err);
      }
    }
    loadWorkspace();
  }, []);

  const handleLogout = () => {
    logout();
    setUser(null);
    window.location.href = '/login';
  };

  const handlePromptAgent = async (promptOverride?: string) => {
    const text = (promptOverride || agentPrompt).trim();
    if (!text || isAgentRunning) return;
    setIsAgentRunning(true);
    setAgentStatus('Agent analyzing request & evaluating layout…');
    try {
      await streamChat({
        message: text,
        projectId: activeProjectId,
        onEvent: (event) => {
          if (event.event === 'ui_proposal') {
            const proposal = event.payload as unknown as UIProposalPayload;
            setPendingProposal(proposal);
            setAgentStatus('');
          } else if (event.event === 'error') {
            setAgentStatus('Agent returned an error');
          }
        },
      });
    } catch (err) {
      console.error(err);
      setAgentStatus('Connection to agent failed');
    } finally {
      setIsAgentRunning(false);
      setAgentPrompt('');
    }
  };

  const handleAcceptProposal = async () => {
    if (!pendingProposal || !pendingProposal.action_id) return;
    setIsApplying(true);
    try {
      const res = await applyUIAction(activeProjectId, pendingProposal.action_id, true);
      if (res.applied && res.layout) {
        setCurrentLayout(res.layout);
        if (res.layout_version) setLayoutVersion(res.layout_version);
        setUpdatedBy('agent');
      } else {
        const updated = await getProjectLayout(activeProjectId);
        setCurrentLayout(updated.layout_json);
        setLayoutVersion(updated.version);
        setUpdatedBy(updated.updated_by);
      }
      setPendingProposal(null);
    } catch (err) {
      console.error('Failed to apply proposal:', err);
    } finally {
      setIsApplying(false);
    }
  };

  const handleRejectProposal = async () => {
    if (!pendingProposal || !pendingProposal.action_id) return;
    try {
      await applyUIAction(activeProjectId, pendingProposal.action_id, false);
      setPendingProposal(null);
    } catch (err) {
      console.error('Failed to reject proposal:', err);
      setPendingProposal(null);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isGlobeExpanded) {
        setIsGlobeExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGlobeExpanded]);

  // Sample Pinned Data Sheets
  const pinnedSheets: PinnedSheet[] = [
    {
      id: 'sheet-1',
      title: 'Q3 ARR & Cohort Retention',
      category: 'Financials · Live Stream',
      syncedAgo: 'Synced 3m ago',
      summary: 'PostgreSQL · Stripe sync. Net retention at 118.4% across enterprise tier.',
      metricLabel: 'Net Retention',
      metricChange: '+14.2% MoM',
      status: 'positive',
      route: '/new-project',
    },
    {
      id: 'sheet-2',
      title: 'Conversion Funnel Drop-off',
      category: 'Alert · Needs Attention',
      syncedAgo: 'Synced 11m ago',
      summary: 'Payment verification step anomaly localized to Safari mobile v17.4.',
      metricLabel: 'Checkout Step 3',
      metricChange: '-6.4% Drop',
      status: 'warning',
      route: '/new-project',
    },
    {
      id: 'sheet-3',
      title: 'Global Edge API Latency',
      category: 'Infrastructure · 10 Hubs',
      syncedAgo: 'Synced 1m ago',
      summary: 'Global p99 latency steady under 38ms across all active telemetry clusters.',
      metricLabel: 'Cluster Health',
      metricChange: '99.98% Up',
      status: 'positive',
      route: '/new-project',
    },
  ];

  // Sample Previous Projects
  const previousProjects: PreviousProject[] = [
    {
      id: 'proj-1',
      title: 'Pricing Tier Sensitivity Audit',
      updatedAgo: '2h ago',
      summary: 'Simulated 15% price increase impact on SMB churn vs enterprise expansion.',
      tag: 'Simulation',
      tagColor: 'bg-[#E8C4A0]/40 text-[#4A4238] dark:bg-[#E8C4A0]/20 dark:text-[#E8C4A0]',
      queriesCount: 14,
    },
    {
      id: 'proj-2',
      title: 'CAC vs LTV Channel Breakdown',
      updatedAgo: 'Yesterday',
      summary: 'Organic search CAC is 3.2x lower than paid social with higher 12-mo retention.',
      tag: 'Marketing',
      tagColor: 'bg-[#8FA98F]/30 text-[#4A4238] dark:bg-[#8FA98F]/20 dark:text-[#8FA98F]',
      queriesCount: 8,
    },
    {
      id: 'proj-3',
      title: 'Mobile App 2.4 Diagnostic',
      updatedAgo: 'Aug 24',
      summary: 'Crashlytics telemetry steady at 99.91% crash-free sessions.',
      tag: 'Diagnostics',
      tagColor: 'bg-[#B8A9C9]/30 text-[#4A4238] dark:bg-[#B8A9C9]/20 dark:text-[#B8A9C9]',
      queriesCount: 22,
    },
    {
      id: 'proj-4',
      title: 'Weekly Executive Narrative Synthesis',
      updatedAgo: 'Aug 20',
      summary: 'Automated synthesis delivered to executive board and operations channel.',
      tag: 'Executive',
      tagColor: 'bg-[#4A4238]/10 text-[#4A4238] dark:bg-white/10 dark:text-white',
      queriesCount: 19,
    },
  ];

  const filteredProjects = previousProjects.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.summary.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative min-h-screen bg-[#F3EDE4] dark:bg-[#161311] text-[#4A4238] dark:text-[#EDE6DC] transition-colors duration-500 overflow-x-hidden">
      
      {/* ─── LAYER 1: 3D EARTH GLOBE BACKGROUND & EXPANDED MODAL ──────────── */}
      <EarthGlobe
        isExpanded={isGlobeExpanded}
        onToggleExpand={setIsGlobeExpanded}
      />

      {/* ─── LAYER 2: FLOATING DASHBOARD DECK ─────────────────────────────── */}
      <div
        className={`relative z-10 min-h-screen flex flex-col transition-all duration-500 ${
          isGlobeExpanded ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100 scale-100'
        }`}
      >
        {/* Top Header Navbar */}
        <header className="sticky top-0 z-30 px-6 sm:px-10 py-4 flex items-center justify-between border-b border-[#4A4238]/08 dark:border-white/08 bg-[#F3EDE4]/75 dark:bg-[#161311]/75 backdrop-blur-md">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <Image
                src="/logo.png"
                alt="AnalyzeIt"
                width={130}
                height={30}
                className="h-7 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                priority
              />
              <span className="hidden sm:inline-block text-[11px] font-mono uppercase tracking-widest text-[#4A4238]/40 dark:text-white/40 ml-1">
                Workspace
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {/* New Project CTA Button */}
            <Link
              href="/new-project"
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#4A4238] hover:bg-[#383129] dark:bg-[#EDE6DC] dark:hover:bg-white dark:text-[#161311] text-[#F3EDE4] text-xs font-mono uppercase tracking-wider transition-all shadow-sm transform hover:scale-[1.02] cursor-pointer"
            >
              <IconPlus size={14} className="text-[#D4826A]" />
              <span>New Project</span>
            </Link>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* User Profile / Auth State */}
            {user ? (
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-full bg-[#E8C4A0] dark:bg-[#3D352E] border border-[#4A4238]/20 dark:border-white/15 flex items-center justify-center font-mono text-xs font-bold text-[#4A4238] dark:text-[#EDE6DC]"
                  title={`${user.name} (${user.email})`}
                >
                  {user.name ? user.name.slice(0, 2).toUpperCase() : 'US'}
                </div>
                <button
                  onClick={handleLogout}
                  className="text-[11px] font-mono uppercase tracking-wider text-[#4A4238]/50 dark:text-[#EDE6DC]/50 hover:text-red-500 transition-colors cursor-pointer"
                  title="Sign out of your account"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="text-xs font-mono uppercase tracking-wider text-[#D4826A] hover:text-[#C0734E] hover:underline font-semibold"
              >
                Sign In
              </Link>
            )}
          </div>
        </header>

        {/* Main Workspace Content */}
        <main className="flex-1 p-6 sm:p-10 max-w-7xl w-full mx-auto space-y-8">
          
          {/* Welcome Greeting */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="text-xs font-mono text-[#D4826A] uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <IconSparkles size={13} /> Continuous Intelligence Engine
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl tracking-tight text-[#4A4238] dark:text-[#EDE6DC]">
                Good afternoon,{' '}
                <span className="italic text-[#D4826A]">
                  {user?.name ? user.name.split(' ')[0] : 'Devansh'}
                </span>
              </h1>
              <p className="text-sm text-[#4A4238]/60 dark:text-[#EDE6DC]/60 mt-1">
                3 live telemetry streams connected · 1 anomaly alert requiring review
              </p>
            </div>

            {/* Quick Action Badges */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsGlobeExpanded(true)}
                className="px-4 py-2 rounded-xl bg-[#D4826A] hover:bg-[#C0734E] text-white text-xs font-mono uppercase tracking-wider flex items-center gap-2 shadow-md transition-all transform hover:scale-[1.02] cursor-pointer"
              >
                <IconWorld size={16} />
                <span>Fullscreen 3D Earth</span>
              </button>

              <Link
                href="/new-project"
                className="px-3.5 py-2 rounded-xl glass-card text-xs font-mono text-[#4A4238] dark:text-[#EDE6DC] flex items-center gap-2 hover:border-[#D4826A]/40 transition-all cursor-pointer"
              >
                <IconShieldLock size={15} className="text-purple-400" />
                <span>Incognito Session</span>
              </Link>
            </div>
          </div>

          {/* ─── FEATURED 3D PLANET EARTH TELEMETRY STAGE ─────────────────── */}
          <div className="glass-card rounded-3xl p-6 border border-[#4A4238]/12 dark:border-white/12 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-[#D4826A] animate-pulse" />
                <div>
                  <h2 className="font-serif text-xl tracking-tight text-[#4A4238] dark:text-[#EDE6DC]">
                    Global Telemetry Mesh &amp; 3D Planetary Map
                  </h2>
                  <p className="text-xs font-mono text-[#4A4238]/60 dark:text-[#EDE6DC]/60">
                    Active Three.js WebGL Earth with real-time continuous data ingestion across 10 global hubs
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsGlobeExpanded(true)}
                className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl border border-[#4A4238]/15 dark:border-white/15 hover:border-[#D4826A] text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <IconWorld size={14} className="text-[#D4826A]" />
                <span>Expand Fullscreen</span>
              </button>
            </div>

            {/* Embedded 3D Canvas Stage */}
            <div className="relative w-full h-80 sm:h-96 rounded-2xl overflow-hidden bg-[#E8DFD3]/40 dark:bg-[#110F0D]/60 border border-[#4A4238]/10 dark:border-white/10">
              <EarthGlobe
                isExpanded={false}
                onToggleExpand={setIsGlobeExpanded}
                className="!absolute inset-0 !z-0"
              />
            </div>
          </div>

          {/* ─── GENERATIVE PROJECT WORKSPACE CANVAS (AGENTIC UI) ─────────── */}
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-[#4A4238]/12 dark:border-white/12 shadow-xl space-y-6">
            
            {/* Header & Scoped Project Metadata */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#4A4238]/10 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#D4826A]/15 text-[#D4826A] flex items-center justify-center">
                  <IconLayoutDashboard size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-serif text-xl sm:text-2xl tracking-tight text-[#4A4238] dark:text-[#EDE6DC]">
                      {activeProjectName}
                    </h2>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#D4826A]/10 text-[#D4826A] font-semibold">
                      v{layoutVersion}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-[#4A4238]/60 dark:text-[#EDE6DC]/60 mt-0.5">
                    Project ID: <span className="underline">{activeProjectId}</span> · Canvas updated by <span className="font-semibold">{updatedBy}</span>
                  </p>
                </div>
              </div>

              {/* Quick AI Trigger Chips */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePromptAgent('Add a line chart for MRR Trend')}
                  disabled={isAgentRunning}
                  className="px-3 py-1.5 rounded-xl text-xs font-mono bg-[#4A4238]/05 dark:bg-white/05 hover:bg-[#D4826A]/15 hover:text-[#D4826A] transition-all cursor-pointer disabled:opacity-50"
                >
                  + Add MRR Trend
                </button>
                <button
                  type="button"
                  onClick={() => handlePromptAgent('Add a metric card for Active Telemetry Nodes')}
                  disabled={isAgentRunning}
                  className="px-3 py-1.5 rounded-xl text-xs font-mono bg-[#4A4238]/05 dark:bg-white/05 hover:bg-[#D4826A]/15 hover:text-[#D4826A] transition-all cursor-pointer disabled:opacity-50"
                >
                  + Add Telemetry Card
                </button>
                <button
                  type="button"
                  onClick={() => handlePromptAgent('Add a table widget for Regional Health')}
                  disabled={isAgentRunning}
                  className="px-3 py-1.5 rounded-xl text-xs font-mono bg-[#4A4238]/05 dark:bg-white/05 hover:bg-[#D4826A]/15 hover:text-[#D4826A] transition-all cursor-pointer disabled:opacity-50"
                >
                  + Add Regional Table
                </button>
              </div>
            </div>

            {/* Agent Copilot Prompt Input Bar */}
            <div className="relative flex items-center">
              <input
                type="text"
                value={agentPrompt}
                onChange={(e) => setAgentPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePromptAgent()}
                placeholder="Ask agent to modify this dashboard (e.g. 'Add a line chart for Revenue Trend' or 'Add metric card for Conversion Rate')…"
                disabled={isAgentRunning}
                className="w-full pl-4 pr-24 py-3 rounded-2xl text-xs sm:text-sm bg-white/60 dark:bg-white/05 border border-[#4A4238]/15 dark:border-white/15 placeholder-current/40 focus:outline-none focus:ring-2 focus:ring-[#D4826A]/40 transition-all"
              />
              <button
                type="button"
                onClick={() => handlePromptAgent()}
                disabled={isAgentRunning || !agentPrompt.trim()}
                className="absolute right-2 px-3.5 py-2 rounded-xl bg-[#D4826A] hover:bg-[#C0734E] text-white text-xs font-mono flex items-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer shadow-sm"
              >
                {isAgentRunning ? (
                  <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <IconSend size={14} />
                )}
                <span>Propose</span>
              </button>
            </div>

            {agentStatus && (
              <div className="text-xs font-mono text-[#D4826A] flex items-center gap-2 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-[#D4826A]" />
                {agentStatus}
              </div>
            )}

            {/* ─── PENDING PROPOSAL CONFIRMATION CARD (SAFETY GATE) ─── */}
            <AnimatePresence>
              {pendingProposal && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="rounded-2xl p-5 bg-gradient-to-r from-[#D4826A]/15 via-[#E8C4A0]/20 to-[#D4826A]/10 border-2 border-[#D4826A]/40 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-mono text-[#D4826A] font-bold uppercase tracking-wider">
                      <IconSparkles size={15} />
                      Agent Proposed Dashboard Modification
                    </div>
                    <p className="text-sm font-serif text-[#4A4238] dark:text-[#EDE6DC]">
                      Proposal: <span className="font-semibold capitalize">{pendingProposal.action.replace('_', ' ')}</span> of type{' '}
                      <span className="font-semibold text-[#D4826A]">
                        {pendingProposal.widget_spec.component || pendingProposal.widget_spec.type}
                      </span>{' '}
                      (
                      <em>
                        &quot;
                        {(pendingProposal.widget_spec.props?.title as string) ||
                          pendingProposal.widget_spec.title ||
                          'Untitled'}
                        &quot;
                      </em>
                      )
                    </p>
                    <p className="text-[11px] font-mono text-[#4A4238]/60 dark:text-white/60">
                      Action ID: {pendingProposal.action_id} · Safety Gate: User Confirmation Required
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={handleRejectProposal}
                      disabled={isApplying}
                      className="px-3.5 py-2 rounded-xl border border-[#4A4238]/20 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/10 text-xs font-mono text-[#4A4238] dark:text-white flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <IconX size={14} />
                      <span>Reject</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAcceptProposal}
                      disabled={isApplying}
                      className="px-4 py-2 rounded-xl bg-[#D4826A] hover:bg-[#C0734E] text-white text-xs font-mono flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {isApplying ? (
                        <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <IconCheck size={14} />
                      )}
                      <span>Accept &amp; Apply</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ─── SANDBOXED WIDGETS GRID CANVAS ─── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {currentLayout.widgets.map((widget) => (
                <div
                  key={widget.id}
                  className={
                    widget.type === 'line_chart' || widget.type === 'table'
                      ? 'md:col-span-2'
                      : 'col-span-1'
                  }
                >
                  <SandboxedWidgetRenderer widget={widget} />
                </div>
              ))}
            </div>

          </div>

          {/* Grid Layout: Pinned Data Sheets + Previous Projects */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* ─── COLUMN 1 & 2: PINNED DATA SHEETS ──────────────────────── */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D4826A]" />
                  <h2 className="font-serif text-xl tracking-tight text-[#4A4238] dark:text-[#EDE6DC]">
                    Pinned Data Sheets
                  </h2>
                  <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#4A4238]/06 dark:bg-white/10 text-[#4A4238]/60 dark:text-[#EDE6DC]/60">
                    3 Active
                  </span>
                </div>

                {/* Grid / List Switcher */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/5 dark:bg-white/5 border border-[#4A4238]/10 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setLayoutMode('grid')}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      layoutMode === 'grid'
                        ? 'bg-white dark:bg-[#24201D] text-[#4A4238] dark:text-white shadow-xs'
                        : 'text-[#4A4238]/40 dark:text-white/40 hover:text-[#4A4238] dark:hover:text-white'
                    }`}
                    title="Grid layout"
                  >
                    <IconLayoutGrid size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setLayoutMode('list')}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      layoutMode === 'list'
                        ? 'bg-white dark:bg-[#24201D] text-[#4A4238] dark:text-white shadow-xs'
                        : 'text-[#4A4238]/40 dark:text-white/40 hover:text-[#4A4238] dark:hover:text-white'
                    }`}
                    title="List layout"
                  >
                    <IconList size={14} />
                  </button>
                </div>
              </div>

              {/* Pinned Cards */}
              <div
                className={`grid gap-4 ${
                  layoutMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
                }`}
              >
                {pinnedSheets.map((sheet) => (
                  <Link
                    key={sheet.id}
                    href={sheet.route}
                    className="glass-card rounded-2xl p-5 flex flex-col justify-between h-52 group cursor-pointer border border-[#4A4238]/08 dark:border-white/10"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`text-xs font-mono uppercase tracking-wider ${
                            sheet.status === 'warning' ? 'text-[#E14759]' : 'text-[#D4826A]'
                          }`}
                        >
                          {sheet.category}
                        </span>
                        <span className="text-[10px] font-mono text-[#4A4238]/40 dark:text-white/40">
                          {sheet.syncedAgo}
                        </span>
                      </div>

                      <h3 className="font-serif text-lg text-[#4A4238] dark:text-[#EDE6DC] group-hover:text-[#D4826A] transition-colors">
                        {sheet.title}
                      </h3>
                      <p className="text-xs text-[#4A4238]/65 dark:text-[#EDE6DC]/65 mt-1.5 line-clamp-2 leading-relaxed">
                        {sheet.summary}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-[#4A4238]/08 dark:border-white/08 flex items-center justify-between text-xs font-mono">
                      <span
                        className={`font-semibold flex items-center gap-1 ${
                          sheet.status === 'warning' ? 'text-[#E14759]' : 'text-[#8FA98F]'
                        }`}
                      >
                        {sheet.status === 'warning' ? <IconAlertTriangle size={13} /> : <IconTrendingUp size={13} />}
                        {sheet.metricChange}
                      </span>
                      <span className="text-[#4A4238]/50 dark:text-white/50 group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                        Explore <IconArrowUpRight size={13} />
                      </span>
                    </div>
                  </Link>
                ))}

                {/* Pin New Sheet Card Slot */}
                <Link
                  href="/new-project"
                  className="border-2 border-dashed border-[#4A4238]/15 dark:border-white/15 rounded-2xl p-5 flex flex-col items-center justify-center text-center h-52 hover:border-[#D4826A]/50 hover:bg-white/30 dark:hover:bg-white/05 transition-all cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-full bg-[#4A4238]/06 dark:bg-white/10 flex items-center justify-center text-[#4A4238]/50 dark:text-white/50 group-hover:text-[#D4826A] group-hover:scale-110 transition-all mb-2">
                    <IconPlus size={18} />
                  </div>
                  <span className="font-serif text-sm text-[#4A4238] dark:text-[#EDE6DC]">
                    Pin another data sheet
                  </span>
                  <span className="text-[11px] font-mono text-[#4A4238]/40 dark:text-white/40 mt-1">
                    Connect SQL, CSV, or ask AI
                  </span>
                </Link>
              </div>
            </div>

            {/* ─── COLUMN 3: PREVIOUS PROJECTS PANEL ─────────────────────── */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4A4238]/40 dark:bg-white/40" />
                  <h2 className="font-serif text-xl tracking-tight text-[#4A4238] dark:text-[#EDE6DC]">
                    Previous Projects
                  </h2>
                </div>
                <span className="text-xs font-mono text-[#4A4238]/40 dark:text-white/40">
                  {previousProjects.length} saved
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <IconSearch
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4A4238]/40 dark:text-white/40 pointer-events-none"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter projects…"
                  className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-white/50 dark:bg-white/05 border border-[#4A4238]/10 dark:border-white/10 placeholder-current/30 focus:outline-none focus:ring-1 focus:ring-[#D4826A]/40 transition-all"
                />
              </div>

              {/* Project Rows */}
              <div className="glass-card rounded-2xl p-3 space-y-2 max-h-[460px] overflow-y-auto border border-[#4A4238]/08 dark:border-white/10">
                {filteredProjects.map((proj) => (
                  <Link
                    key={proj.id}
                    href="/new-project"
                    className="block p-3 rounded-xl hover:bg-white/80 dark:hover:bg-white/10 transition-colors border border-transparent hover:border-[#4A4238]/10 dark:hover:border-white/10 space-y-1 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-serif text-sm font-medium text-[#4A4238] dark:text-[#EDE6DC] group-hover:text-[#D4826A] transition-colors">
                        {proj.title}
                      </span>
                      <span className="text-[10px] font-mono text-[#4A4238]/40 dark:text-white/40">
                        {proj.updatedAgo}
                      </span>
                    </div>
                    <p className="text-xs text-[#4A4238]/60 dark:text-[#EDE6DC]/60 line-clamp-1">
                      {proj.summary}
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${proj.tagColor}`}>
                        {proj.tag}
                      </span>
                      <span className="text-[10px] font-mono text-[#4A4238]/40 dark:text-white/40">
                        {proj.queriesCount} queries
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

          </div>

        </main>
      </div>

    </div>
  );
}