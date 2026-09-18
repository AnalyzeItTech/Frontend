'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconArrowUpRight,
  IconCopy,
  IconLayoutDashboard,
  IconMessageDots,
  IconSearch,
  IconSend,
  IconSparkles,
  IconTrash,
  IconWorld,
  IconX,
  IconCheck,
  IconPlayerStop,
} from '@tabler/icons-react';
import { getStoredToken, getStoredUser } from '../lib/auth';
import { getEntitlements, getModels } from '../lib/billingApi';
import {
  MODEL_SIZE_LABELS,
  allowedModelSizes,
  normalizeModelSize,
  optionsFromAllowlist,
  resolveInitialModelSize,
  writeStoredModelSize,
  type ModelOption,
  type ModelSize,
} from '../lib/modelAccess';
import { SandboxedWidgetRenderer } from '../Components/dashboard/WidgetRenderer';
import { AdSlot, AD_LOAD_TIMEOUT_MS } from '../Components/ads/AdSlot';
import { SessionStartAd } from '../Components/ads/SessionStartAd';
import {
  applyUIAction,
  ChatRequestError,
  getProjects,
  streamChat,
  StreamEvent,
  WidgetSpec,
} from '../lib/chatApi';
import { SourceChips, type ResearchSource } from '../Components/research/SourceChips';
import { AppShell } from '../Components/app/AppShell';
import { useTheme } from '../Components/ui/ThemeProvider';

type ComposerMode = 'chat' | 'research';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  mode?: ComposerMode;
  sources?: ResearchSource[];
  widget?: WidgetSpec;
  proposal?: { action_id: string; project_id?: string };
  streaming?: boolean;
  status?: string;
  /** 0-token tool fast-path — never label as AI-written */
  zeroToken?: { toolName: string };
  toolError?: string;
  /** Soft note when 0-token path declined into full agent */
  neededFullerResearch?: boolean;
}

const ZERO_TOKEN_TOOL_LABELS: Record<string, string> = {
  weather_lookup: 'weather',
  calculator: 'calculator',
  currency_converter: 'FX',
  stock_lookup: 'stock',
};

function labelZeroTokenTool(toolName: string): string {
  return ZERO_TOKEN_TOOL_LABELS[toolName] || toolName.replace(/_/g, ' ');
}

function parseZeroTokenTool(route: unknown, hintTools: unknown): string | null {
  if (Array.isArray(hintTools) && typeof hintTools[0] === 'string' && hintTools[0]) {
    return hintTools[0];
  }
  if (typeof route === 'string' && route.startsWith('zero_token_tool:')) {
    return route.slice('zero_token_tool:'.length) || null;
  }
  return null;
}


function looksLikeZeroTokenQuery(q: string): boolean {
  const s = q.toLowerCase();
  if (/\b(weather|forecast|temperature)\b/.test(s)) return true;
  if (/\b(calculate|calculator|what is)\b/.test(s) && /[0-9]/.test(s)) return true;
  if (/\b(convert|fx|exchange rate)\b/.test(s) && /\b(usd|eur|gbp|inr|jpy)\b/i.test(s)) return true;
  if (/\b(stock|share price|ticker)\b/.test(s) || /\b[A-Z]{1,5}\b/.test(q) && /\b(price|quote)\b/.test(s)) return true;
  return false;
}

function isZeroTokenFinal(payload: Record<string, unknown>): boolean {
  const usage = payload.usage as Record<string, unknown> | undefined;
  if (usage && usage.zero_token === true) return true;
  const route = payload.route;
  return typeof route === 'string' && route.startsWith('zero_token_tool:');
}

const CHAT_PROMPTS = [
  'Summarize what changed in my last analysis',
  'Explain this metric in plain words',
  'What should I look at next?',
];

const RESEARCH_PROMPTS = [
  'Compare India and Vietnam manufacturing growth',
  'What changed in global semiconductor demand?',
  'Find climate risks for Mumbai',
];

const DASHBOARD_INTENT =
  /\b(open|show|view|see|go to|pull up)\b.*\b(dashboard|canvas|widgets?)\b|\bdashboard\b.*\b(please|now|open)\b/i;

function mergeSources(prev: ResearchSource[], next: ResearchSource[]): ResearchSource[] {
  const out = [...prev];
  for (const src of next) {
    if (!src.host && !src.url) continue;
    if (out.some((item) => (src.host && item.host === src.host) || (src.url && item.url === src.url))) {
      continue;
    }
    out.push(src);
  }
  return out;
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <AppShell active="chat" flush>
          <p className="p-6 text-sm text-[var(--text-muted)]">Loading chat…</p>
        </AppShell>
      }
    >
      <ChatInner />
    </Suspense>
  );
}

function ChatInner() {
  const params = useSearchParams();
  const { isIncognito } = useTheme();
  const user = getStoredUser();
  const firstName = user?.name?.split(' ')[0] || 'there';

  const [composerMode, setComposerMode] = useState<ComposerMode>('chat');
  const [modelSizeMax, setModelSizeMax] = useState<ModelSize>('small');
  const [selectedModelSize, setSelectedModelSize] = useState<ModelSize>('small');
  const [modelOptions, setModelOptions] = useState<ModelOption[]>(() =>
    allowedModelSizes('small').map((size) => ({ size, label: MODEL_SIZE_LABELS[size], available: true })),
  );
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [awaitingAd, setAwaitingAd] = useState(false);
  const [showPostRunAd, setShowPostRunAd] = useState(false);
  const [adsFree, setAdsFree] = useState(() => {
    const tier = getStoredUser()?.tier;
    return tier === 'premium' || tier === 'premium_plus';
  });
  const [error, setError] = useState<string | null>(null);
  const [upgradeHref, setUpgradeHref] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [dashStatus, setDashStatus] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const abortRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const nearBottomRef = useRef(true);
  const postRunAdArmed = useRef(false);

  useEffect(() => {
    const preset = params.get('q');
    if (preset) {
      setInput(preset);
      setComposerMode('research');
    }
  }, [params]);

  useEffect(() => {
    if (!getStoredToken()) {
      setAdsFree(true);
      return;
    }
    void getEntitlements()
      .then(async (snap) => {
        // Premium/Plus: ads_free true → never fetch AdSense
        setAdsFree(snap.ads_free !== false);
        const maxAllowed = normalizeModelSize(snap.model_access);
        setModelSizeMax(maxAllowed);
        setSelectedModelSize(resolveInitialModelSize(maxAllowed));
        const fromEntitlements = optionsFromAllowlist(snap.available_models, maxAllowed);
        try {
          const catalog = await getModels();
          const fromApi = optionsFromAllowlist(catalog.models, normalizeModelSize(catalog.model_access || maxAllowed));
          setModelOptions(fromApi.length ? fromApi : fromEntitlements);
        } catch {
          setModelOptions(fromEntitlements);
        }
      })
      .catch(() => {
        setAdsFree(true);
        setModelSizeMax('small');
        setSelectedModelSize(resolveInitialModelSize('small'));
        setModelOptions(allowedModelSizes('small').map((size) => ({ size, label: MODEL_SIZE_LABELS[size], available: true })));
      });
  }, []);

  useEffect(() => {
    if (!nearBottomRef.current || !scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isStreaming, showDashboard, showPostRunAd]);

  const armPostRunAd = useCallback(() => {
    if (adsFree || postRunAdArmed.current) return;
    postRunAdArmed.current = true;
    setShowPostRunAd(true);
    setAwaitingAd(true);
  }, [adsFree]);

  const onPostRunAdLoaded = useCallback(() => {
    setAwaitingAd(false);
    postRunAdArmed.current = false;
  }, []);

  // Parent-level escape hatch: never trap the composer if AdSlot fails to mount/fire.
  useEffect(() => {
    if (!awaitingAd) return;
    const t = window.setTimeout(() => {
      setAwaitingAd(false);
      postRunAdArmed.current = false;
    }, AD_LOAD_TIMEOUT_MS + 500);
    return () => window.clearTimeout(t);
  }, [awaitingAd]);

  const inputLocked = isStreaming || awaitingAd;

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const clearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: 'Fresh thread. What do you want to explore?',
      },
    ]);
    setError(null);
    setShowDashboard(false);
    setDashStatus(null);
  };

  const copyMessage = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      /* ignore */
    }
  };

  const addProposalToDashboard = async (proposal: { action_id: string; project_id?: string }) => {
    setDashStatus('Adding…');
    try {
      let projectId = proposal.project_id;
      if (!projectId) {
        const projects = await getProjects();
        projectId = projects[0]?.id;
      }
      if (!projectId) {
        setDashStatus('Create a project on Dashboard first.');
        return;
      }
      await applyUIAction(projectId, proposal.action_id, true);
      setDashStatus('Added to dashboard.');
      setShowDashboard(true);
    } catch (applyError: unknown) {
      setDashStatus(applyError instanceof Error ? applyError.message : 'Could not add to dashboard.');
    }
  };

  const sendMessage = useCallback(
    async (raw?: string, modeOverride?: ComposerMode) => {
      const value = (raw ?? input).trim();
      if (!value || isStreaming || awaitingAd) return;

      if (!getStoredToken()) {
        setError('Sign in to chat with AnalyzeIt.');
        return;
      }

      const mode = modeOverride ?? composerMode;
      const wantsDashboard = DASHBOARD_INTENT.test(value);
      if (wantsDashboard) setShowDashboard(true);

      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: value,
        mode,
      };
      const assistantId = `a-${Date.now()}`;
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        mode,
        sources: [],
        streaming: true,
        status: mode === 'research' ? 'Researching…' : 'Thinking…',
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInput('');
      setIsStreaming(true);
      setError(null);
      setUpgradeHref(false);
      setDashStatus(null);
      setShowPostRunAd(false);
      setAwaitingAd(false);
      postRunAdArmed.current = false;
      abortRef.current = false;
      nearBottomRef.current = true;

      let widget: WidgetSpec | undefined;
      let proposalMeta: { action_id: string; project_id?: string } | undefined;
      let sources: ResearchSource[] = [];
      let streamed = '';
      let hintTools: string[] = [];
      let zeroTokenTool: string | null = null;
      let sawToolFailure = false;
      let toolFailureName = '';

      const outbound =
        mode === 'research'
          ? `[Research mode] Prefer web/news/geo tools and cite sources.\n\n${value}`
          : value;

      try {
        const history = messages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({ role: m.role, content: m.content || '' }));

        const response = await streamChat({
          message: outbound,
          projectTitle: mode === 'research' ? 'Research & Discovery' : 'Chat',
          incognito: isIncognito,
          history,
          includeClientContext: true,
          modelSize: selectedModelSize,
          onEvent: (event: StreamEvent) => {
            if (abortRef.current) return;

            if (event.event === 'run_completed') {
              armPostRunAd();
              return;
            }

            if (event.event === 'route_decision') {
              const hints = event.payload?.hint_tools;
              if (Array.isArray(hints)) {
                hintTools = hints.filter((h): h is string => typeof h === 'string');
              }
              const path = typeof event.payload?.path === 'string' ? event.payload.path : '';
              const reason = typeof event.payload?.reason === 'string' ? event.payload.reason : '';
              const fromRoute = parseZeroTokenTool(reason.startsWith('zero_token_tool:') ? reason : path === 'zero_token_tool' ? `zero_token_tool:${hintTools[0] || ''}` : '', hintTools);
              if (fromRoute) zeroTokenTool = fromRoute;
              const nextMode = event.payload?.response_mode === 'report' ? 'report' : 'chat';
              const ztStatus = zeroTokenTool
                ? `Looking up via ${labelZeroTokenTool(zeroTokenTool)}…`
                : nextMode === 'report'
                  ? 'Generating report…'
                  : 'Answering…';
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, status: ztStatus } : m,
                ),
              );
              return;
            }

            if (event.event === 'tool_call' || event.event === 'tool_result' || event.event === 'context_fetch') {
              const name = typeof event.payload?.tool === 'string' ? event.payload.tool : event.event;
              const args = event.payload?.args as Record<string, unknown> | undefined;
              const hint =
                typeof args?.symbol === 'string'
                  ? args.symbol
                  : typeof args?.city === 'string'
                    ? args.city
                    : '';
              if (event.event === 'tool_call') {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, status: hint ? `Looking up ${hint}…` : `Calling ${name}…` }
                      : m,
                  ),
                );
              }
              if (event.event === 'tool_result' && event.payload?.ok === false) {
                sawToolFailure = true;
                toolFailureName = name;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, status: `No live result from ${labelZeroTokenTool(name)}` }
                      : m,
                  ),
                );
              }
              return;
            }

            if (event.event === 'tool_progress') {
              const nested = event.payload?.progress as Record<string, unknown> | undefined;
              const step = (typeof event.payload?.step === 'string' ? event.payload.step : nested?.step) || '';
              const detail =
                typeof event.payload?.detail === 'string'
                  ? event.payload.detail
                  : typeof nested?.detail === 'string'
                    ? nested.detail
                    : 'Gathering sources…';
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, status: detail } : m)),
              );
              if (step === 'source_found') {
                const host = detail.split('/').pop() || detail;
                const url =
                  typeof event.payload?.url === 'string'
                    ? event.payload.url
                    : typeof nested?.url === 'string'
                      ? nested.url
                      : `https://${host}`;
                const title = typeof event.payload?.title === 'string' ? event.payload.title : '';
                sources = mergeSources(sources, [{ host, url, title }]);
                setMessages((prev) =>
                  prev.map((m) => (m.id === assistantId ? { ...m, sources: [...sources] } : m)),
                );
              }
              return;
            }

            if (event.event === 'model_delta') {
              const delta =
                typeof event.payload?.text === 'string'
                  ? event.payload.text
                  : typeof event.payload?.delta === 'string'
                    ? event.payload.delta
                    : '';
              if (delta) {
                streamed += delta;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: streamed, status: 'Synthesizing…' } : m,
                  ),
                );
              }
              return;
            }

            if (event.event === 'final') {
              if (isZeroTokenFinal(event.payload || {})) {
                const tool =
                  parseZeroTokenTool(event.payload?.route, hintTools) ||
                  zeroTokenTool ||
                  'tool';
                zeroTokenTool = tool;
                const parsed =
                  typeof event.payload?.text === 'string'
                    ? event.payload.text
                    : streamed;
                if (parsed) streamed = parsed;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? {
                          ...m,
                          content: streamed,
                          zeroToken: { toolName: tool },
                          toolError: undefined,
                          status: undefined,
                        }
                      : m,
                  ),
                );
              }
              return;
            }

            if (event.event === 'ui_proposal') {
              const candidate = event.payload.widget_spec;
              if (candidate && typeof candidate === 'object') {
                widget = candidate as WidgetSpec;
              }
              const actionId = typeof event.payload.action_id === 'string' ? event.payload.action_id : '';
              const projectId =
                typeof event.payload.project_id === 'string' ? event.payload.project_id : undefined;
              if (actionId) proposalMeta = { action_id: actionId, project_id: projectId };
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, widget, proposal: proposalMeta }
                    : m,
                ),
              );
            }
          },
        });

        streamed = streamed || response.finalText;
        if (response.sources?.length) {
          sources = mergeSources(
            sources,
            response.sources.map((src) => ({
              host: src.host || (src.url ? new URL(src.url).hostname : ''),
              url: src.url,
              title: src.title,
            })),
          );
        }

        const endZeroToken = zeroTokenTool;
        // Only surface tool-fail empty state when we got no answer and no 0-token final
        // (Model skips zero_token final on tool failure).
        const failedWithoutZeroToken = sawToolFailure && !endZeroToken && !streamed.trim();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: failedWithoutZeroToken
                    ? ''
                    : streamed || 'No written answer came back.',
                  sources,
                  widget: widget || m.widget,
                  proposal: proposalMeta || m.proposal,
                  streaming: false,
                  status: undefined,
                  zeroToken: endZeroToken ? { toolName: endZeroToken } : m.zeroToken,
                  toolError: failedWithoutZeroToken
                    ? `No live result from ${labelZeroTokenTool(toolFailureName || 'tool')}. Check the query and try again.`
                    : undefined,
                  neededFullerResearch:
                    mode === 'research' &&
                    !endZeroToken &&
                    !failedWithoutZeroToken &&
                    Boolean(streamed.trim()) &&
                    looksLikeZeroTokenQuery(value),
                }
              : m,
          ),
        );
      } catch (chatError: unknown) {
        if (abortRef.current) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: m.content || 'Stopped.', streaming: false, status: undefined }
                : m,
            ),
          );
        } else if (chatError instanceof ChatRequestError && chatError.upgradeRequired) {
          setUpgradeHref(true);
          setError(chatError.message);
          setMessages((prev) => prev.filter((m) => m.id !== assistantId && m.id !== userMsg.id));
        } else {
          const msg = chatError instanceof Error ? chatError.message : 'Request failed.';
          setError(msg);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: msg, streaming: false, status: undefined }
                : m,
            ),
          );
        }
      } finally {
        setIsStreaming(false);
        // Stream end without run_completed still arms the post-run slot for free users
        if (!abortRef.current) armPostRunAd();
      }
    },
    [armPostRunAd, awaitingAd, composerMode, input, isIncognito, isStreaming, messages, selectedModelSize],
  );

  const stopStreaming = () => {
    abortRef.current = true;
    setIsStreaming(false);
    setAwaitingAd(false);
    postRunAdArmed.current = false;
  };

  const prompts = composerMode === 'research' ? RESEARCH_PROMPTS : CHAT_PROMPTS;
  const latestProposal = [...messages].reverse().find((m) => m.widget)?.widget;
  const latestProposalMeta = [...messages].reverse().find((m) => m.proposal)?.proposal;

  return (
    <AppShell active="chat" flush>
      <div className="flex h-full min-h-0 flex-col">
        <SessionStartAd enabled={!adsFree} />
        <div className="flex min-h-0 flex-1">
          {/* Main chat column */}
          <div
            className={`flex min-h-0 min-w-0 flex-col transition-all ${
              showDashboard ? 'w-full lg:w-[55%] xl:w-[58%] border-r border-[var(--border)]' : 'w-full'
            }`}
          >
            {/* Toolbar */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-2.5 sm:px-6">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                  {composerMode === 'research' ? 'Chat · Research on' : 'Chat'}
                </p>
                <p className="truncate text-[11px] text-[var(--text-muted)]">
                  {isIncognito ? 'Incognito session' : 'Conversation stays on this device until you save'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDashboard((v) => !v)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                    showDashboard
                      ? 'border-[#E3836C]/40 bg-[#E3836C]/15 text-[#E3836C]'
                      : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)]'
                  }`}
                  title="Show dashboard panel only when you want it"
                >
                  <IconLayoutDashboard size={14} />
                  <span className="hidden sm:inline">{showDashboard ? 'Hide dashboard' : 'Dashboard'}</span>
                </button>
                <button
                  type="button"
                  onClick={clearChat}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-2.5 py-1.5 text-[11px] text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
                  title="Clear conversation"
                >
                  <IconTrash size={14} />
                  <span className="hidden sm:inline">Clear</span>
                </button>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              data-lenis-prevent
              className="chat-scroll flex-1 space-y-4 px-4 py-5 sm:px-6"
            >
              {messages.length === 0 && (
                <div className="mx-auto flex max-h-[420px] max-w-xl flex-col justify-center px-1 pt-6 sm:pt-10">
                  <div className="app-card space-y-5 p-6 sm:p-8">
                    <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-card,14px)] bg-[var(--coral,#EA8069)]/12 text-[var(--coral,#EA8069)]">
                      <IconMessageDots size={22} />
                    </div>
                    <div className="space-y-2">
                      <h1 className="font-serif text-[28px] leading-[1.15] tracking-tight text-[var(--text,#3A342D)] dark:text-[var(--text-primary)]">
                        Ask what your data already knows
                      </h1>
                      <p className="text-sm leading-relaxed text-[var(--text-muted,#81786F)]">
                        Hi {firstName}. Chat for a quiet read of the numbers. Switch to Research when you need live sources.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {prompts.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => void sendMessage(prompt)}
                          className="rounded-full border border-[var(--coral,#EA8069)]/35 bg-[var(--coral,#EA8069)]/10 px-3.5 py-2 text-left text-xs font-medium text-[var(--coral-dark,#C96551)] transition-colors hover:bg-[var(--coral,#EA8069)]/18"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {messages.map((msg) => {
                if (msg.role === 'system') return null;
                const isUser = msg.role === 'user';
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[min(100%,36rem)] space-y-2 ${
                        isUser
                          ? isIncognito
                            ? 'rounded-2xl rounded-tr-md bg-violet-900/60 border border-violet-500/30 px-4 py-3 text-sm text-violet-50'
                            : 'rounded-2xl rounded-tr-md bg-[var(--text-primary)] px-4 py-3 text-sm text-[var(--bg)]'
                          : 'app-card px-4 py-3 text-sm'
                      }`}
                    >
                      {!isUser && msg.mode === 'research' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#E3836C]/12 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-[#E3836C]">
                          <IconSearch size={11} /> Research
                        </span>
                      )}
                      {!isUser && msg.zeroToken && (
                        <span
                          className="ml-1 inline-flex items-center gap-1 rounded-full bg-[#8FA98F]/15 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-[#4A7C59] dark:text-[#9EBB9A]"
                          title="Answer came from a live tool with no LLM tokens"
                        >
                          From tools · 0 tokens · {labelZeroTokenTool(msg.zeroToken.toolName)}
                        </span>
                      )}
                      {!isUser && msg.neededFullerResearch && !msg.zeroToken && !msg.toolError && (
                        <p className="text-[11px] text-[var(--text-muted)]">
                          Needed fuller research — answered with the full agent.
                        </p>
                      )}
                      {isUser && msg.mode === 'research' && (
                        <span className="mb-1 inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider opacity-60">
                          <IconSearch size={11} /> Research
                        </span>
                      )}

                      <div className="whitespace-pre-wrap leading-relaxed">
                        {msg.toolError
                          ? msg.toolError
                          : msg.content || (msg.streaming ? '' : '…')}
                        {msg.streaming && (
                          <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse align-middle bg-[#E3836C]" />
                        )}
                      </div>
                      {!isUser && msg.toolError && !msg.streaming && (
                        <button
                          type="button"
                          className="btn-secondary text-[11px]"
                          onClick={() => {
                            const prior = [...messages].reverse().find((m) => m.role === 'user');
                            if (prior) void sendMessage(prior.content, prior.mode);
                          }}
                        >
                          Retry
                        </button>
                      )}

                      {!isUser && msg.status && msg.streaming && (
                        <p className="text-[11px] font-mono text-[var(--text-muted)]">{msg.status}</p>
                      )}

                      {!isUser && msg.sources && msg.sources.length > 0 && (
                        <SourceChips sources={msg.sources} />
                      )}

                      {!isUser && msg.widget && (
                        <div className="mt-2 space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-2">
                          <div className="flex items-center justify-between px-1">
                            <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                              Widget proposal
                            </p>
                            <button
                              type="button"
                              onClick={() => setShowDashboard(true)}
                              className="text-[11px] text-[#E3836C]"
                            >
                              Preview panel
                            </button>
                          </div>
                          <SandboxedWidgetRenderer widget={msg.widget} isDraftPreview />
                          {msg.proposal && (
                            <div className="flex items-center justify-end gap-2 px-1 pb-1">
                              <button
                                type="button"
                                onClick={() => void addProposalToDashboard(msg.proposal!)}
                                className="btn-primary text-[11px]"
                              >
                                <IconCheck size={12} className="mr-1" /> Add to dashboard
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {!isUser && msg.content && !msg.streaming && (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => void copyMessage(msg.id, msg.content)}
                            className="inline-flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                          >
                            {copiedId === msg.id ? <IconCheck size={12} /> : <IconCopy size={12} />}
                            {copiedId === msg.id ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Errors */}
            {error && (
              <p role="alert" className="mx-4 mb-2 rounded-[var(--radius-card,14px)] border border-[var(--border)] bg-[var(--surface,#FFFCF8)] px-3 py-2 text-xs text-[var(--text,#3A342D)] sm:mx-6">
                {error}
                {upgradeHref ? (
                  <Link href="/billing" className="ml-2 inline-flex min-h-8 items-center rounded-full bg-[var(--coral,#EA8069)] px-3 text-[11px] font-medium text-white">
                    Upgrade
                  </Link>
                ) : null}
              </p>
            )}
            {dashStatus && (
              <p className="mx-4 mb-1 text-[11px] text-[var(--text-muted)] sm:mx-6">{dashStatus}</p>
            )}

            {showPostRunAd && !adsFree && (
              <div className="mx-4 mb-3 sm:mx-6">
                <AdSlot placement="post-run" enabled onLoaded={onPostRunAdLoaded} />
              </div>
            )}

            {/* Composer */}
            <div className="shrink-0 border-t border-[var(--border)] bg-[var(--bg)]/90 px-3 py-3 backdrop-blur-md sm:px-6">
              <div className="mx-auto max-w-3xl space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <div
                    role="tablist"
                    aria-label="Conversation mode"
                    className="inline-flex min-h-8 items-center rounded-full border border-[var(--border)] bg-[var(--surface,#FFFCF8)] p-0.5 shadow-sm"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={composerMode === 'chat'}
                      onClick={() => setComposerMode('chat')}
                      className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-3.5 text-xs font-medium transition-colors ${
                        composerMode === 'chat'
                          ? 'bg-[var(--coral,#EA8069)] text-white'
                          : 'text-[var(--text-muted,#81786F)] hover:text-[var(--text,#3A342D)]'
                      }`}
                    >
                      <IconMessageDots size={14} />
                      Chat
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={composerMode === 'research'}
                      onClick={() => setComposerMode('research')}
                      title="Research uses live web and geo tools"
                      className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-3.5 text-xs font-medium transition-colors ${
                        composerMode === 'research'
                          ? 'bg-[var(--coral,#EA8069)] text-white'
                          : 'text-[var(--text-muted,#81786F)] hover:text-[var(--text,#3A342D)]'
                      }`}
                    >
                      <IconSearch size={14} />
                      Research
                    </button>
                    <Link
                      href="/globe"
                      role="tab"
                      className="inline-flex min-h-8 items-center gap-1.5 rounded-full px-3.5 text-xs font-medium text-[var(--text-muted,#81786F)] hover:text-[var(--text,#3A342D)]"
                    >
                      <IconWorld size={14} />
                      Globe
                    </Link>
                  </div>
                  <span
                    title="Message frequency hints prepared in your browser before send"
                    className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface,#FFFCF8)] px-2.5 py-1 text-[10px] font-medium text-[var(--text-muted,#81786F)]"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--coral,#EA8069)]" aria-hidden />
                    Prepared on device
                  </span>
                  <span className="ml-auto hidden text-[10px] text-[var(--text-muted)] sm:inline">
                    Enter to send · Shift+Enter for newline
                  </span>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void sendMessage();
                  }}
                  className={`app-card flex items-end gap-2 p-2 ${
                    isIncognito ? 'ring-1 ring-violet-500/30' : ''
                  } ${composerMode === 'research' ? 'ring-1 ring-[#E3836C]/25' : ''}`}
                >
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      setError(null);
                      e.target.style.height = 'auto';
                      e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void sendMessage();
                      }
                    }}
                    disabled={inputLocked}
                    placeholder={
                      awaitingAd
                        ? 'Sponsored unit loading…'
                        : composerMode === 'research'
                          ? 'Research a question, place, or trend…'
                          : 'Message AnalyzeIt…'
                    }
                    className="max-h-[140px] min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-[var(--text-muted)] disabled:opacity-60"
                  />
                  <label className="sr-only" htmlFor="research-model-access">
                    Model size
                  </label>
                  <select
                    id="research-model-access"
                    value={selectedModelSize}
                    disabled={inputLocked}
                    onChange={(e) => {
                      const next = normalizeModelSize(e.target.value);
                      const allowed = allowedModelSizes(modelSizeMax);
                      const capped = allowed.includes(next) ? next : modelSizeMax;
                      setSelectedModelSize(capped);
                      writeStoredModelSize(capped);
                    }}
                    title={
                      modelSizeMax === 'small'
                        ? 'Free plan: Small only — upgrade for Medium/Large'
                        : modelSizeMax === 'medium'
                          ? 'Premium: Small or Medium'
                          : 'Premium+: Small, Medium, or Large'
                    }
                    className="h-10 max-w-[7.5rem] shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 text-xs font-medium text-[var(--text-secondary)] outline-none hover:bg-[var(--surface)] disabled:opacity-50"
                  >
                    {modelOptions.map((opt) => (
                      <option key={opt.size} value={opt.size}>
                        {opt.label || MODEL_SIZE_LABELS[opt.size]}
                      </option>
                    ))}
                  </select>
                  {isStreaming ? (
                    <button
                      type="button"
                      onClick={stopStreaming}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
                      aria-label="Stop"
                    >
                      <IconPlayerStop size={16} />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={!input.trim() || awaitingAd}
                      aria-label="Send"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E3836C] text-white disabled:opacity-40"
                    >
                      <IconSend size={16} />
                    </button>
                  )}
                </form>
              </div>
            </div>
          </div>

          {/* On-demand dashboard side panel */}
          <AnimatePresence>
            {showDashboard && (
              <motion.aside
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 24 }}
                className="hidden min-h-0 w-full flex-col border-l border-[var(--border)] bg-[var(--surface)] lg:flex lg:w-[45%] xl:w-[42%]"
              >
                <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <IconLayoutDashboard size={16} className="text-[#E3836C]" />
                    <span className="text-sm font-medium">Dashboard preview</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href="/dashboard" className="btn-secondary text-[11px]">
                      Open full <IconArrowUpRight size={12} className="ml-1" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => setShowDashboard(false)}
                      className="rounded-full p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
                      aria-label="Close dashboard panel"
                    >
                      <IconX size={16} />
                    </button>
                  </div>
                </div>
                <div className="chat-scroll flex-1 space-y-3 p-4">
                  {latestProposal ? (
                    <>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Widgets appear here when proposed. Nothing is saved until you add them.
                      </p>
                      <div className="app-card overflow-hidden p-2">
                        <SandboxedWidgetRenderer widget={latestProposal} isDraftPreview />
                      </div>
                      {latestProposalMeta && (
                        <button
                          type="button"
                          onClick={() => void addProposalToDashboard(latestProposalMeta)}
                          className="btn-primary text-xs"
                        >
                          <IconSparkles size={13} className="mr-1" /> Add to saved dashboard
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                      <IconLayoutDashboard size={28} className="text-[var(--text-muted)]" />
                      <p className="text-sm text-[var(--text-secondary)]">
                        No widgets yet. Ask in chat to build a chart, or open the full dashboard for saved views.
                      </p>
                      <Link href="/dashboard" className="btn-secondary text-xs">
                        Go to Dashboard
                      </Link>
                    </div>
                  )}
                </div>
              </motion.aside>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile dashboard sheet */}
        <AnimatePresence>
          {showDashboard && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="fixed inset-x-0 bottom-0 z-50 max-h-[70vh] rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl lg:hidden"
            >
              <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                <span className="text-sm font-medium">Dashboard</span>
                <button type="button" onClick={() => setShowDashboard(false)} aria-label="Close">
                  <IconX size={18} />
                </button>
              </div>
              <div className="chat-scroll max-h-[60vh] p-4">
                {latestProposal ? (
                  <SandboxedWidgetRenderer widget={latestProposal} isDraftPreview />
                ) : (
                  <p className="text-sm text-[var(--text-secondary)]">
                    Ask for a chart in chat, or{' '}
                    <Link href="/dashboard" className="text-[#E3836C] underline">
                      open Dashboard
                    </Link>
                    .
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}
