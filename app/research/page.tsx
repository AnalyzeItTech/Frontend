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
import { SandboxedWidgetRenderer } from '../Components/dashboard/WidgetRenderer';
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
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hi ${firstName}. Ask anything here — toggle Research when you want the agent to pull live sources from the web. Dashboard stays out of the way until you ask for it.`,
    },
  ]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgradeHref, setUpgradeHref] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [dashStatus, setDashStatus] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const abortRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const nearBottomRef = useRef(true);

  useEffect(() => {
    const preset = params.get('q');
    if (preset) {
      setInput(preset);
      setComposerMode('research');
    }
  }, [params]);

  useEffect(() => {
    if (!nearBottomRef.current || !scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isStreaming, showDashboard]);

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
      if (!value || isStreaming) return;

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
      abortRef.current = false;
      nearBottomRef.current = true;

      let widget: WidgetSpec | undefined;
      let proposalMeta: { action_id: string; project_id?: string } | undefined;
      let sources: ResearchSource[] = [];
      let streamed = '';

      const outbound =
        mode === 'research'
          ? `[Research mode] Prefer web/news/geo tools and cite sources.\n\n${value}`
          : value;

      try {
        const response = await streamChat({
          message: outbound,
          projectTitle: mode === 'research' ? 'Research & Discovery' : 'Chat',
          incognito: isIncognito,
          onEvent: (event: StreamEvent) => {
            if (abortRef.current) return;

            if (event.event === 'route_decision') {
              const nextMode = event.payload?.response_mode === 'report' ? 'report' : 'chat';
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, status: nextMode === 'report' ? 'Generating report…' : 'Answering…' }
                    : m,
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

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: streamed || 'No written answer came back.',
                  sources,
                  widget: widget || m.widget,
                  proposal: proposalMeta || m.proposal,
                  streaming: false,
                  status: undefined,
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
      }
    },
    [composerMode, input, isIncognito, isStreaming],
  );

  const stopStreaming = () => {
    abortRef.current = true;
    setIsStreaming(false);
  };

  const prompts = composerMode === 'research' ? RESEARCH_PROMPTS : CHAT_PROMPTS;
  const latestProposal = [...messages].reverse().find((m) => m.widget)?.widget;
  const latestProposalMeta = [...messages].reverse().find((m) => m.proposal)?.proposal;

  return (
    <AppShell active="chat" flush>
      <div className="flex h-full min-h-0 flex-col">
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
              {messages.length <= 1 && (
                <div className="mx-auto max-w-lg space-y-4 pt-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E3836C]/15 text-[#E3836C]">
                    <IconMessageDots size={22} />
                  </div>
                  <h1 className="font-serif text-2xl tracking-tight text-[var(--text-primary)]">
                    Ask <em className="text-[#E3836C] not-italic italic">anything</em>
                  </h1>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Chat for analysis. Flip on Research for live sources. Open Dashboard only when you need the canvas.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 pt-2">
                    {prompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => void sendMessage(prompt)}
                        className="btn-secondary text-left text-xs"
                      >
                        {prompt}
                      </button>
                    ))}
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
                      {isUser && msg.mode === 'research' && (
                        <span className="mb-1 inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider opacity-60">
                          <IconSearch size={11} /> Research
                        </span>
                      )}

                      <div className="whitespace-pre-wrap leading-relaxed">
                        {msg.content || (msg.streaming ? '' : '…')}
                        {msg.streaming && (
                          <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse align-middle bg-[#E3836C]" />
                        )}
                      </div>

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
              <p role="alert" className="mx-4 mb-2 rounded-xl border border-[#B86450]/25 bg-[#B86450]/10 px-3 py-2 text-xs text-[#9B4D3B] sm:mx-6">
                {error}
                {upgradeHref ? (
                  <Link href="/billing" className="ml-1 font-medium underline">
                    Upgrade
                  </Link>
                ) : null}
              </p>
            )}
            {dashStatus && (
              <p className="mx-4 mb-1 text-[11px] text-[var(--text-muted)] sm:mx-6">{dashStatus}</p>
            )}

            {/* Composer */}
            <div className="shrink-0 border-t border-[var(--border)] bg-[var(--bg)]/90 px-3 py-3 backdrop-blur-md sm:px-6">
              <div className="mx-auto max-w-3xl space-y-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    data-active={composerMode === 'chat'}
                    onClick={() => setComposerMode('chat')}
                    className="composer-mode-btn inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)]"
                  >
                    <IconMessageDots size={13} />
                    Chat
                  </button>
                  <button
                    type="button"
                    data-active={composerMode === 'research'}
                    onClick={() => setComposerMode('research')}
                    className="composer-mode-btn inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)]"
                    title="Research uses live web and geo tools"
                  >
                    <IconSearch size={13} />
                    Research
                  </button>
                  <Link
                    href="/globe"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
                  >
                    <IconWorld size={13} />
                    Globe
                  </Link>
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
                    disabled={isStreaming}
                    placeholder={
                      composerMode === 'research'
                        ? 'Research a question, place, or trend…'
                        : 'Message AnalyzeIt…'
                    }
                    className="max-h-[140px] min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-[var(--text-muted)] disabled:opacity-60"
                  />
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
                      disabled={!input.trim()}
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
