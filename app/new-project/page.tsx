'use client';

import React, { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconArrowLeft,
  IconSend,
  IconShieldLock,
  IconSparkles,
  IconUpload,
  IconFileSpreadsheet,
  IconCheck,
  IconAlertCircle,
  IconTerminal2,
  IconColumns,
  IconMessageDots,
  IconLayoutDashboard,
  IconX,
  IconRefresh,
  IconClock,
  IconAlertTriangle,
} from '@tabler/icons-react';
import { ThemeToggle } from '../Components/ui/ThemeToggle';
import { useTheme } from '../Components/ui/ThemeProvider';
import {
  streamChat,
  applyUIAction,
  getProjectLayout,
  type StreamEvent,
  type WidgetSpec,
  type UIProposalPayload,
  type ManagedProposal,
} from '../lib/chatApi';
import { DashboardCanvas } from '../Components/dashboard/DashboardCanvas';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metrics?: Array<{ label: string; value: string; change?: string; positive?: boolean }>;
  sqlSnippet?: string;
  incognito?: boolean;
  toolActivity?: string[];
  artifacts?: Array<{ filename: string; type: string }>;
  streaming?: boolean;
  proposalActionId?: string;
}

function NewProjectContent() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const searchParams = useSearchParams();
  const router = useRouter();

  const urlProjectId = searchParams.get('projectId') || searchParams.get('id') || undefined;

  const [isIncognito, setIsIncognito] = useState(false);
  const [projectTitle, setProjectTitle] = useState('Untitled Analysis Workspace');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const [runId, setRunId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | undefined>(urlProjectId);
  const [activeTools, setActiveTools] = useState<string[]>([]);
  const [streamStatus, setStreamStatus] = useState('');

  // ─── Generative Canvas & Proposal State ─────────────────────────────────────
  const [currentLayout, setCurrentLayout] = useState<{ widgets: WidgetSpec[] }>({ widgets: [] });
  const [layoutVersion, setLayoutVersion] = useState<number>(1);
  const [updatedBy, setUpdatedBy] = useState<string>('agent');
  const [isLayoutInitialLoading, setIsLayoutInitialLoading] = useState<boolean>(false);
  const [proposals, setProposals] = useState<Map<string, ManagedProposal>>(new Map());

  // ─── Responsive View Mode ───────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<'split' | 'chat' | 'canvas'>('split');

  useEffect(() => {
    const checkWidth = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile && activeView === 'split') {
        setActiveView('chat');
      }
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, [activeView]);

  // Initial Project Layout Loading
  useEffect(() => {
    if (!urlProjectId) return;
    setProjectId(urlProjectId);
    setIsLayoutInitialLoading(true);

    getProjectLayout(urlProjectId)
      .then((data) => {
        if (data && data.layout_json?.widgets) {
          setCurrentLayout((prev) => {
            if (data.version >= layoutVersion) {
              return data.layout_json;
            }
            return prev;
          });
          setLayoutVersion(data.version);
          setUpdatedBy(data.updated_by || 'agent');
        }
      })
      .catch((err) => {
        console.warn('Could not load existing project layout:', err);
      })
      .finally(() => {
        setIsLayoutInitialLoading(false);
      });
  }, [urlProjectId]);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      content:
        'Hello Devansh. Welcome to your analysis workspace. You can ask me to build live charts and KPI widgets, connect data streams, or analyze metrics in plain words.',
      timestamp: 'Just now',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  // ─── Single Source of Truth Proposal Actions ────────────────────────────────

  const handleAcceptProposal = useCallback(
    async (actionId: string) => {
      const proposal = proposals.get(actionId);
      if (!proposal) return;
      const targetProjectId = projectId || proposal.projectId || 'default';

      // 1. Optimistic preview transition: Mark as applying
      setProposals((prev) => {
        const next = new Map(prev);
        next.set(actionId, { ...proposal, status: 'applying', error: undefined });
        return next;
      });

      try {
        const res = await applyUIAction(targetProjectId, actionId, true);
        if (res.applied && res.layout) {
          setCurrentLayout(res.layout);
          if (res.layout_version) setLayoutVersion(res.layout_version);
          setUpdatedBy('agent');
        } else {
          // Re-sync with canonical layout
          const updated = await getProjectLayout(targetProjectId);
          setCurrentLayout(updated.layout_json);
          setLayoutVersion(updated.version);
          setUpdatedBy(updated.updated_by || 'agent');
        }

        // 2. Mark proposal as applied
        setProposals((prev) => {
          const next = new Map(prev);
          next.set(actionId, { ...proposal, status: 'applied' });
          return next;
        });
      } catch (err: any) {
        console.error('Failed to apply proposal:', err);
        const errMsg = err?.message || 'Failed to apply widget to dashboard.';

        // Check for 409 Conflict: Auto-sync layout then let user retry
        if (String(errMsg).includes('Conflict') || String(errMsg).includes('409')) {
          try {
            const fresh = await getProjectLayout(targetProjectId);
            setCurrentLayout(fresh.layout_json);
            setLayoutVersion(fresh.version);
          } catch {}
        }

        setProposals((prev) => {
          const next = new Map(prev);
          next.set(actionId, { ...proposal, status: 'error', error: errMsg });
          return next;
        });
      }
    },
    [proposals, projectId]
  );

  const handleRejectProposal = useCallback(
    async (actionId: string) => {
      const proposal = proposals.get(actionId);
      if (!proposal) return;
      const targetProjectId = projectId || proposal.projectId || 'default';

      try {
        await applyUIAction(targetProjectId, actionId, false);
      } catch (err) {
        console.warn('Reject action notification error:', err);
      }

      setProposals((prev) => {
        const next = new Map(prev);
        next.set(actionId, { ...proposal, status: 'rejected' });
        return next;
      });
    },
    [proposals, projectId]
  );

  const handleDismissProposal = useCallback((actionId: string) => {
    setProposals((prev) => {
      const next = new Map(prev);
      next.delete(actionId);
      return next;
    });
  }, []);

  const handleWidgetAction = useCallback((widgetId: string, action: string) => {
    if (action === 'delete' || action === 'remove_widget') {
      setCurrentLayout((prev) => ({
        ...prev,
        widgets: prev.widgets.filter((w) => w.id !== widgetId),
      }));
    }
  }, []);

  // ─── Conversational Stream Messaging ────────────────────────────────────────

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isThinking) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      incognito: isIncognito,
    };

    const assistantId = `bot-${Date.now()}`;
    const assistantPlaceholder: Message = {
      id: assistantId,
      sender: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      incognito: isIncognito,
      toolActivity: [],
      streaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantPlaceholder]);
    setInputMessage('');
    setIsThinking(true);
    setActiveTools([]);
    setStreamStatus('Connecting to agent…');

    const toolLog: string[] = [];
    let currentProposalId: string | undefined = undefined;

    const handleEvent = (event: StreamEvent) => {
      if (event.event === 'run_id') {
        setRunId(event.payload.run_id as string);
        const resolvedPid = event.payload.project_id as string;
        if (resolvedPid && !projectId) {
          setProjectId(resolvedPid);
        }
      }
      if (event.event === 'route_decision') {
        const path = event.payload.path as string;
        setStreamStatus(path === 'direct' ? 'Generating response…' : 'Running agent with tools…');
      }
      if (event.event === 'tool_call') {
        const tool = event.payload.tool as string;
        toolLog.push(`Calling ${tool}…`);
        setActiveTools((prev) => [...prev, tool]);
        setStreamStatus(`Running ${tool}…`);
      }
      if (event.event === 'tool_result') {
        const tool = event.payload.tool as string;
        const summary = (event.payload.summary as string) || 'Done';
        toolLog.push(`${tool}: ${summary}`);
      }

      // ── Generative UI: Handle ui_proposal Stream Event ────────────────────
      if (event.event === 'ui_proposal') {
        const payload = event.payload as unknown as UIProposalPayload;
        const actionId = payload.action_id || `act-${Date.now()}`;
        currentProposalId = actionId;

        const managedProposal: ManagedProposal = {
          actionId,
          projectId: payload.project_id || projectId || 'default',
          action: (payload.action as any) || 'add_widget',
          widgetSpec: payload.widget_spec,
          requiresConfirmation: payload.requires_confirmation !== false,
          status: 'pending',
          createdAt: Date.now(),
        };

        setProposals((prev) => {
          const next = new Map(prev);
          next.set(actionId, managedProposal);
          return next;
        });

        setStreamStatus('Dashboard widget proposed. Review to apply.');

        // Attach proposal to the active assistant message for inline card rendering
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, proposalActionId: actionId } : m
          )
        );
      }

      if (event.event === 'model_delta') {
        const rawDelta = event.payload.text;
        const delta =
          typeof rawDelta === 'string'
            ? rawDelta
            : Array.isArray(rawDelta)
            ? rawDelta.map((p) => (typeof p === 'object' && p && 'text' in p ? (p as { text: string }).text : String(p))).join('')
            : '';
        if (delta) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + delta, toolActivity: [...toolLog] } : m
            )
          );
        }
      }
      if (event.event === 'final') {
        const rawFinal = event.payload.text;
        const finalText =
          typeof rawFinal === 'string'
            ? rawFinal
            : Array.isArray(rawFinal)
            ? rawFinal.map((p) => (typeof p === 'object' && p && 'text' in p ? (p as { text: string }).text : String(p))).join('')
            : '';
        const artifacts = (event.payload.artifacts as Array<{ filename: string; type: string }>) || [];
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: finalText || m.content,
                  toolActivity: [...toolLog],
                  artifacts,
                  streaming: false,
                  proposalActionId: currentProposalId || m.proposalActionId,
                }
              : m
          )
        );
      }
      if (event.event === 'error') {
        const errMsg =
          (event.payload.message as string) ||
          (event.payload.error as string) ||
          (event.payload.detail as string) ||
          'Agent encountered an unexpected error.';
        setStreamStatus(`Error: ${errMsg}`);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: m.content
                    ? `${m.content}\n\n⚠️ Error: ${errMsg}`
                    : `⚠️ The agent encountered an error while processing your request:\n\n${errMsg}`,
                  toolActivity: [...toolLog, `Error: ${errMsg}`],
                  streaming: false,
                }
              : m
          )
        );
      }
      if (event.event === 'run_cancelled') {
        setStreamStatus('Run cancelled.');
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: m.content ? `${m.content}\n\n[Run cancelled by user]` : 'Request was cancelled.',
                  streaming: false,
                }
              : m
          )
        );
      }
    };

    try {
      const result = await streamChat({
        message: text,
        runId,
        projectId,
        projectTitle,
        incognito: isIncognito,
        onEvent: handleEvent,
      });
      setRunId(result.runId);
      if (result.projectId) {
        setProjectId(result.projectId);
      }
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== assistantId) return m;
          const content =
            result.finalText ||
            m.content ||
            'The agent completed the request, but no text response was returned. Please verify that Backend A and Model are running.';
          return {
            ...m,
            content,
            artifacts: result.artifacts.length ? result.artifacts : m.artifacts,
            streaming: false,
            proposalActionId: currentProposalId || m.proposalActionId,
          };
        })
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: m.content
                  ? `${m.content}\n\n⚠️ Error: ${errMsg}`
                  : `⚠️ Unable to complete request.\n\n${errMsg}\n\nPlease ensure Backend A (port 8000) and Model (port 8001) are up and running.`,
                streaming: false,
              }
            : m
        )
      );
    } finally {
      setIsThinking(false);
      setActiveTools([]);
      setStreamStatus('');
    }
  };

  const handleFileUpload = () => {
    const sampleFiles = ['q3_financial_cohorts.csv', 'user_telemetry_events.parquet', 'stripe_invoices_2026.xlsx'];
    const randomFile = sampleFiles[Math.floor(Math.random() * sampleFiles.length)];
    if (!attachedFiles.includes(randomFile)) {
      setAttachedFiles((prev) => [...prev, randomFile]);
      handleSendMessage(`Attached data source: ${randomFile}. Please inspect the column schemas and summary stats.`);
    }
  };

  const handleBackToDashboard = (e: React.MouseEvent) => {
    if (inputMessage.trim() || isThinking) {
      if (!window.confirm('You have unsent input or active analysis. Return to Dashboard?')) {
        e.preventDefault();
        return;
      }
    }
  };

  const activeProposalsList = Array.from(proposals.values());
  const pendingCount = activeProposalsList.filter((p) => p.status === 'pending').length;

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-500 ${
        isIncognito
          ? 'bg-[#100D16] text-[#E7E2EE]'
          : 'bg-[#F3EDE4] dark:bg-[#161311] text-[#4A4238] dark:text-[#EDE6DC]'
      }`}
    >
      {/* ─── Top Header Navigation ────────────────────────────────────────── */}
      <header
        className={`sticky top-0 z-30 px-4 sm:px-8 py-3 flex items-center justify-between border-b backdrop-blur-xl transition-colors duration-300 ${
          isIncognito
            ? 'bg-[#100D16]/80 border-purple-500/20'
            : 'bg-[#F3EDE4]/80 dark:bg-[#161311]/80 border-[#4A4238]/10 dark:border-white/10'
        }`}
      >
        <div className="flex items-center gap-3 sm:gap-5">
          {/* Back to Dashboard Link with preserved Project ID */}
          <Link
            href={projectId ? `/Dashboard?projectId=${projectId}` : '/Dashboard'}
            onClick={handleBackToDashboard}
            className={`flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider px-3 py-1.5 rounded-full border transition-all ${
              isIncognito
                ? 'border-purple-500/30 text-purple-300 hover:bg-purple-950/50'
                : 'border-[#4A4238]/15 dark:border-white/15 text-[#4A4238]/70 dark:text-[#EDE6DC]/70 hover:text-[#4A4238] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <IconArrowLeft size={14} />
            <span>Dashboard</span>
          </Link>

          {/* Project Title Editor */}
          <div className="flex items-center gap-2">
            {isEditingTitle ? (
              <input
                type="text"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                onBlur={() => setIsEditingTitle(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
                autoFocus
                className="font-serif text-base sm:text-lg font-medium px-2 py-0.5 rounded border border-[#D4826A] bg-transparent focus:outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingTitle(true)}
                className="group flex items-center gap-2 font-serif text-base sm:text-lg font-medium tracking-tight hover:text-[#D4826A] transition-colors cursor-pointer text-left max-w-[200px] sm:max-w-xs truncate"
              >
                <span className="truncate">{projectTitle}</span>
                <span className="text-xs font-mono opacity-0 group-hover:opacity-60 transition-opacity">✎</span>
              </button>
            )}
          </div>
        </div>

        {/* View Switcher & Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* View Mode Segment Switcher */}
          <div className="flex items-center p-1 rounded-full bg-black/5 dark:bg-white/5 border border-[#4A4238]/10 dark:border-white/10 text-xs font-mono">
            {!isMobile && (
              <button
                type="button"
                onClick={() => setActiveView('split')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-all cursor-pointer ${
                  activeView === 'split'
                    ? 'bg-white dark:bg-[#24201D] text-[#4A4238] dark:text-white shadow-xs font-semibold'
                    : 'text-[#4A4238]/60 dark:text-white/60 hover:text-[#4A4238] dark:hover:text-white'
                }`}
                title="Split screen (Chat + Live Canvas)"
              >
                <IconColumns size={13} />
                <span>Split</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveView('chat')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-all cursor-pointer ${
                activeView === 'chat'
                  ? 'bg-white dark:bg-[#24201D] text-[#4A4238] dark:text-white shadow-xs font-semibold'
                  : 'text-[#4A4238]/60 dark:text-white/60 hover:text-[#4A4238] dark:hover:text-white'
              }`}
              title="Chat Copilot view"
            >
              <IconMessageDots size={13} />
              <span>Chat</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('canvas')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-all cursor-pointer relative ${
                activeView === 'canvas'
                  ? 'bg-white dark:bg-[#24201D] text-[#4A4238] dark:text-white shadow-xs font-semibold'
                  : 'text-[#4A4238]/60 dark:text-white/60 hover:text-[#4A4238] dark:hover:text-white'
              }`}
              title="Dashboard Canvas view"
            >
              <IconLayoutDashboard size={13} />
              <span>Canvas</span>
              {currentLayout.widgets.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 bg-[#D4826A]/20 text-[#D4826A] rounded-full font-bold">
                  {currentLayout.widgets.length}
                </span>
              )}
              {pendingCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-[#D4826A] animate-pulse" />
              )}
            </button>
          </div>

          {/* Incognito Mode Pill Toggle */}
          <button
            type="button"
            onClick={() => setIsIncognito((v) => !v)}
            className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono uppercase tracking-wider transition-all duration-300 cursor-pointer ${
              isIncognito
                ? 'bg-purple-900/60 border-purple-500 text-purple-200 shadow-md ring-2 ring-purple-500/30'
                : 'bg-white/60 dark:bg-white/05 border-[#4A4238]/15 dark:border-white/15 text-[#4A4238]/70 dark:text-[#EDE6DC]/70 hover:border-[#D4826A]/40'
            }`}
            title="When active, queries and session data are ephemeral and bypassed from storage"
          >
            <IconShieldLock
              size={14}
              className={isIncognito ? 'text-purple-300' : 'text-[#4A4238]/50 dark:text-white/50'}
            />
            <span>Incognito</span>
          </button>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* User Profile Avatar */}
          <div
            className={`w-8 h-8 rounded-full border flex items-center justify-center font-mono text-xs font-bold transition-colors ${
              isIncognito
                ? 'bg-purple-900/50 border-purple-400/40 text-purple-200'
                : 'bg-[#E8C4A0] dark:bg-[#3D352E] border-[#4A4238]/20 dark:border-white/15 text-[#4A4238] dark:text-[#EDE6DC]'
            }`}
            title="Signed in as Devansh"
          >
            DV
          </div>
        </div>
      </header>

      {/* ─── Incognito Security Notice Banner ─────────────────────────────── */}
      <AnimatePresence>
        {isIncognito && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-purple-950/70 border-b border-purple-500/25 px-6 py-2 flex items-center justify-center gap-2 text-xs font-mono text-purple-200"
          >
            <IconShieldLock size={14} className="text-purple-400 flex-shrink-0" />
            <span>
              <strong>Incognito Active:</strong> Questions and generated schemas are isolated from your saved dashboard history.
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Main Workspace Layout (Split vs Single Panel) ────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT / CHAT PANEL */}
        <div
          className={`flex flex-col h-[calc(100vh-61px)] transition-all ${
            activeView === 'split'
              ? 'w-full lg:w-[46%] xl:w-[44%] border-r border-[#4A4238]/10 dark:border-white/10'
              : activeView === 'chat'
              ? 'w-full max-w-4xl mx-auto'
              : 'hidden'
          }`}
        >
          {/* Scrollable Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {messages.map((msg) => {
              const inlineProposal = msg.proposalActionId ? proposals.get(msg.proposalActionId) : undefined;

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'assistant' && (
                    <div
                      className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-serif font-bold text-xs shadow-xs ${
                        msg.incognito ? 'bg-purple-600' : 'bg-[#D4826A]'
                      }`}
                    >
                      A
                    </div>
                  )}

                  <div
                    className={`max-w-xl space-y-3 ${
                      msg.sender === 'user'
                        ? `${
                            msg.incognito
                              ? 'bg-purple-900/60 border border-purple-500/30 text-purple-100'
                              : 'bg-[#4A4238] dark:bg-[#EDE6DC] text-[#F3EDE4] dark:text-[#161311]'
                          } p-4 rounded-2xl rounded-tr-xs text-sm leading-relaxed shadow-sm`
                        : `${
                            isIncognito
                              ? 'bg-[#1A1624] border border-purple-500/20 text-purple-100'
                              : 'glass-card border border-[#4A4238]/08 dark:border-white/10 text-[#4A4238] dark:text-[#EDE6DC]'
                          } p-5 rounded-2xl rounded-tl-xs text-sm leading-relaxed shadow-sm`
                    }`}
                  >
                    <div className="leading-relaxed whitespace-pre-wrap">
                      {msg.content || (msg.streaming ? '' : 'No content generated.')}
                      {msg.streaming && (
                        <span className="inline-block w-1.5 h-4 ml-0.5 bg-[#D4826A] animate-pulse align-middle" />
                      )}
                    </div>

                    {/* Tool Activity Badges */}
                    {msg.toolActivity && msg.toolActivity.length > 0 && (
                      <div className="pt-2 space-y-1">
                        {msg.toolActivity.map((line, idx) => (
                          <div
                            key={idx}
                            className={`text-[11px] font-mono px-2 py-1 rounded-lg ${
                              isIncognito
                                ? 'bg-purple-950/40 text-purple-300'
                                : 'bg-black/5 dark:bg-white/5 text-[#4A4238]/70 dark:text-[#EDE6DC]/70'
                            }`}
                          >
                            {line}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ─── Inline Generative UI Proposal Confirmation Banner ─── */}
                    {inlineProposal && (
                      <div
                        className={`mt-3 p-3.5 rounded-xl border space-y-2.5 transition-all ${
                          inlineProposal.status === 'applied'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                            : inlineProposal.status === 'rejected'
                            ? 'bg-black/5 dark:bg-white/5 border-transparent opacity-60'
                            : inlineProposal.status === 'error'
                            ? 'bg-red-500/10 border-red-500/30'
                            : 'bg-[#D4826A]/10 border-[#D4826A]/30'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider">
                            <IconSparkles size={14} className="text-[#D4826A]" />
                            <span>
                              {inlineProposal.status === 'applied'
                                ? 'Widget Added to Canvas'
                                : inlineProposal.status === 'rejected'
                                ? 'Proposal Rejected'
                                : 'Proposed Widget'}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10">
                            {inlineProposal.widgetSpec.component || inlineProposal.widgetSpec.type}
                          </span>
                        </div>

                        <p className="text-xs font-serif text-[#4A4238] dark:text-[#EDE6DC]">
                          <em>
                            &quot;
                            {(inlineProposal.widgetSpec.props?.title as string) ||
                              inlineProposal.widgetSpec.title ||
                              'Untitled'}
                            &quot;
                          </em>
                        </p>

                        {inlineProposal.status === 'pending' && (
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleRejectProposal(inlineProposal.actionId)}
                              className="px-3 py-1.5 rounded-lg border border-[#4A4238]/20 dark:border-white/20 hover:bg-black/5 text-[11px] font-mono transition-all cursor-pointer"
                            >
                              Reject
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAcceptProposal(inlineProposal.actionId)}
                              className="px-3.5 py-1.5 rounded-lg bg-[#D4826A] hover:bg-[#C0734E] text-white text-[11px] font-mono font-semibold flex items-center gap-1 transition-all shadow-sm cursor-pointer"
                            >
                              <IconCheck size={13} />
                              <span>Accept &amp; Apply</span>
                            </button>
                          </div>
                        )}

                        {inlineProposal.status === 'applying' && (
                          <div className="flex items-center gap-2 text-xs font-mono text-[#D4826A] pt-1">
                            <span className="w-3 h-3 border-2 border-[#D4826A]/30 border-t-[#D4826A] rounded-full animate-spin" />
                            <span>Applying widget to canvas…</span>
                          </div>
                        )}

                        {inlineProposal.status === 'applied' && (
                          <div className="flex items-center justify-between text-xs font-mono text-emerald-600 dark:text-emerald-400 pt-0.5">
                            <span className="flex items-center gap-1">
                              <IconCheck size={14} /> Active on Canvas
                            </span>
                            {activeView === 'chat' && (
                              <button
                                type="button"
                                onClick={() => setActiveView(isMobile ? 'canvas' : 'split')}
                                className="underline hover:opacity-80 cursor-pointer"
                              >
                                View on Canvas →
                              </button>
                            )}
                          </div>
                        )}

                        {inlineProposal.status === 'error' && (
                          <div className="space-y-1.5 pt-1">
                            <p className="text-[11px] font-mono text-red-500">
                              {inlineProposal.error || 'Failed to apply proposal.'}
                            </p>
                            <button
                              type="button"
                              onClick={() => handleAcceptProposal(inlineProposal.actionId)}
                              className="px-3 py-1 rounded-md bg-[#D4826A] text-white text-[10px] font-mono flex items-center gap-1"
                            >
                              <IconRefresh size={12} /> Retry
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="text-[10px] font-mono opacity-40 text-right">{msg.timestamp}</div>
                  </div>

                  {msg.sender === 'user' && (
                    <div
                      className={`w-8 h-8 rounded-full border flex-shrink-0 flex items-center justify-center font-mono text-xs font-bold ${
                        msg.incognito
                          ? 'bg-purple-900/50 border-purple-400/40 text-purple-200'
                          : 'bg-[#E8C4A0] dark:bg-[#3D352E] border-[#4A4238]/20 text-[#4A4238] dark:text-[#EDE6DC]'
                      }`}
                    >
                      DV
                    </div>
                  )}
                </motion.div>
              );
            })}

            {/* Thinking Animation */}
            {isThinking && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 items-center">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-white font-serif font-bold text-xs ${
                    isIncognito ? 'bg-purple-600' : 'bg-[#D4826A]'
                  }`}
                >
                  A
                </div>
                <div
                  className={`px-4 py-3 rounded-2xl text-xs font-mono flex items-center gap-2 ${
                    isIncognito
                      ? 'bg-[#1A1624] border border-purple-500/20 text-purple-300'
                      : 'glass-card text-[#4A4238]/70 dark:text-[#EDE6DC]/70'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-[#D4826A] animate-ping" />
                  <span>{streamStatus || 'Synthesizing data stream and hypotheses…'}</span>
                  {activeTools.length > 0 && <span className="opacity-60">({activeTools.join(', ')})</span>}
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ─── Bottom Chat Input Bar ────────────────────────────────────── */}
          <div className="p-4 border-t border-[#4A4238]/10 dark:border-white/10 space-y-2 bg-[#F3EDE4]/50 dark:bg-[#161311]/50 backdrop-blur-md">
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 px-1">
                {attachedFiles.map((file, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono border bg-white/80 dark:bg-white/10 border-[#4A4238]/15 dark:border-white/15 text-[#4A4238] dark:text-[#EDE6DC]"
                  >
                    <IconFileSpreadsheet size={13} className="text-[#D4826A]" />
                    <span>{file}</span>
                  </span>
                ))}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-1.5 rounded-2xl border border-[#4A4238]/15 dark:border-white/15 bg-white/70 dark:bg-white/05 shadow-md flex items-center gap-2 transition-all focus-within:border-[#D4826A]/50 focus-within:ring-2 focus-within:ring-[#D4826A]/20"
            >
              <button
                type="button"
                onClick={handleFileUpload}
                className="p-2 rounded-xl text-[#4A4238]/50 dark:text-white/50 hover:text-[#D4826A] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                title="Attach CSV or data file"
              >
                <IconUpload size={16} />
              </button>

              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask a question or request a dashboard widget (e.g. 'Build a dashboard for Nasdaq QQQ')…"
                disabled={isThinking}
                className="flex-1 bg-transparent px-2 py-1.5 text-xs sm:text-sm placeholder-current/40 focus:outline-none"
              />

              <button
                type="submit"
                disabled={isThinking || !inputMessage.trim()}
                className="px-4 py-2 rounded-xl bg-[#4A4238] dark:bg-[#EDE6DC] hover:bg-[#383129] dark:hover:bg-white text-[#F3EDE4] dark:text-[#161311] text-xs font-mono flex items-center gap-1.5 transition-all disabled:opacity-30 cursor-pointer shadow-sm"
              >
                <span>Send</span>
                <IconSend size={13} />
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT / LIVE DASHBOARD CANVAS PANEL */}
        <div
          className={`flex-1 flex flex-col h-[calc(100vh-61px)] overflow-hidden transition-all ${
            activeView === 'split'
              ? 'w-full lg:w-[54%] xl:w-[56%]'
              : activeView === 'canvas'
              ? 'w-full'
              : 'hidden'
          }`}
        >
          <DashboardCanvas
            projectName={projectTitle}
            projectId={projectId}
            layoutVersion={layoutVersion}
            updatedBy={updatedBy}
            widgets={currentLayout.widgets}
            proposals={activeProposalsList}
            onAcceptProposal={handleAcceptProposal}
            onRejectProposal={handleRejectProposal}
            onDismissProposal={handleDismissProposal}
            onWidgetAction={handleWidgetAction}
            onPromptChip={(chipText) => {
              if (activeView === 'canvas' && !isMobile) {
                setActiveView('split');
              }
              handleSendMessage(chipText);
            }}
            isAgentRunning={isThinking}
          />
        </div>
      </div>
    </div>
  );
}

export default function NewProjectPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center font-mono text-xs opacity-50">
          Loading analysis workspace…
        </div>
      }
    >
      <NewProjectContent />
    </Suspense>
  );
}
