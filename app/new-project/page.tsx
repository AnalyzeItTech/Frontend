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
  IconGitMerge,
  IconDownload,
  IconVolume,
  IconMovie,
  IconCalendar,
  IconFileText,
} from '@tabler/icons-react';
import { ThemeToggle } from '../Components/ui/ThemeToggle';
import { useTheme } from '../Components/ui/ThemeProvider';
import {
  streamChat,
  applyUIAction,
  getProjectLayout,
  updateProjectLayout,
  refreshWidgetData,
  saveProjectTemplate,
  sendPresenceHeartbeat,
  removePresence,
  type StreamEvent,
  type WidgetSpec,
  type UIProposalPayload,
  type ManagedProposal,
  type PresenceUser,
  type ProjectTemplate,
  type ChartAnnotation,
} from '../lib/chatApi';
import { DashboardCanvas, type LayoutSnapshot } from '../Components/dashboard/DashboardCanvas';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metrics?: Array<{ label: string; value: string; change?: string; positive?: boolean }>;
  sqlSnippet?: string;
  incognito?: boolean;
  toolActivity?: string[];
  artifacts?: Array<{
    artifact_id?: string;
    filename: string;
    format?: string;
    type?: string;
    download_url?: string;
    preview_text?: string;
    size_bytes?: number;
  }>;
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
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isNearBottomRef = useRef(true);

  // ─── Undo State Stack & Toast ──────────────────────────────────────────────
  const [layoutHistory, setLayoutHistory] = useState<LayoutSnapshot[]>([]);
  const [actionToast, setActionToast] = useState<{ message: string; widgetTitle?: string } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((message: string, widgetTitle?: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setActionToast({ message, widgetTitle });
    toastTimeoutRef.current = setTimeout(() => {
      setActionToast(null);
    }, 5000);
  }, []);

  const handleRollback = useCallback(
    async (snapshot: LayoutSnapshot) => {
      const targetProjectId = projectId || 'default';
      const targetWidgets = snapshot.widgets;

      try {
        const res = await updateProjectLayout(
          targetProjectId,
          layoutVersion,
          { widgets: targetWidgets },
          'user'
        );
        setCurrentLayout({ widgets: targetWidgets });
        if (res?.version) {
          setLayoutVersion(res.version);
          showToast(`Reverted to v${snapshot.version} (now v${res.version})`);
        } else {
          setLayoutVersion((v) => v + 1);
          showToast(`Reverted to snapshot v${snapshot.version}`);
        }
      } catch (err: any) {
        console.error('Monotonic rollback error:', err);
        try {
          const fresh = await getProjectLayout(targetProjectId);
          setCurrentLayout(fresh.layout_json);
          setLayoutVersion(fresh.version);
        } catch {}
        showToast('Rollback encountered a concurrent modification. Re-synced canvas.');
      }
    },
    [projectId, layoutVersion, showToast]
  );

  // ─── Multi-User Presence & Collaboration State ─────────────────────────────
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);

  // ─── 409 Conflict Rebase State ─────────────────────────────────────────────
  const [conflictState, setConflictState] = useState<{
    actionId: string;
    proposal: ManagedProposal;
    targetProjectId: string;
    freshVersion: number;
    freshWidgets: WidgetSpec[];
    isPureAppend: boolean;
    conflictingWidget?: WidgetSpec;
  } | null>(null);

  // Presence Heartbeat Loop (15s interval with cleanup)
  useEffect(() => {
    const targetProjectId = projectId || urlProjectId;
    if (!targetProjectId) return;

    let userId = 'user-session';
    try {
      userId = localStorage.getItem('analyze_user_id') || `user-${Math.random().toString(36).slice(2, 7)}`;
      localStorage.setItem('analyze_user_id', userId);
    } catch {}

    const userName = 'Analyst ' + userId.slice(-4);

    const sendBeat = async () => {
      try {
        const users = await sendPresenceHeartbeat(targetProjectId, userId, userName);
        setPresenceUsers(users);
      } catch (err) {
        console.debug('Presence heartbeat failed:', err);
      }
    };

    const handleBeforeUnload = () => {
      try {
        const url = `/api/backend/projects/${targetProjectId}/presence?user_id=${encodeURIComponent(userId)}`;
        if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
          navigator.sendBeacon(url);
        }
      } catch {}
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    sendBeat();
    const interval = setInterval(sendBeat, 15000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      removePresence(targetProjectId, userId);
    };
  }, [projectId, urlProjectId]);

  const handleSaveTemplate = async (name: string, description?: string, tags?: string[]) => {
    const saved = await saveProjectTemplate(name, currentLayout.widgets, description, tags);
    showToast(`Saved template "${saved.name}" with ${saved.widgets?.length || 0} parameterized widgets`);
  };

  const handleLoadTemplate = async (template: ProjectTemplate) => {
    if (!template.widgets || template.widgets.length === 0) return;
    setLayoutHistory((hist) => [
      ...hist.slice(-20),
      {
        id: `snap_${Date.now()}`,
        version: layoutVersion,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionSummary: `Loaded template "${template.name}"`,
        widgets: currentLayout.widgets,
      },
    ]);
    const merged = [...currentLayout.widgets, ...template.widgets];
    setCurrentLayout({ widgets: merged });
    const targetProjectId = projectId || 'default';
    if (projectId) {
      try {
        const res = await updateProjectLayout(targetProjectId, layoutVersion, { widgets: merged }, 'user');
        setLayoutVersion(res.version);
      } catch (e) {
        console.warn('Could not persist template layout to backend:', e);
      }
    }
    showToast(`Loaded ${template.widgets.length} widgets from "${template.name}"`);
  };

  const handleUndo = useCallback(() => {
    if (layoutHistory.length > 0) {
      const prevSnap = layoutHistory[layoutHistory.length - 1];
      setLayoutHistory((prev) => prev.slice(0, -1));
      handleRollback(prevSnap);
    }
  }, [layoutHistory, handleRollback]);

  // Track chat scroll position to prevent scroll hijacking during streaming
  const handleChatScroll = useCallback(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = distanceToBottom < 100;
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const el = chatContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  // ─── Single Source of Truth Proposal Actions ────────────────────────────────

  const handleAcceptProposal = useCallback(
    async (actionId: string) => {
      const proposal = proposals.get(actionId);
      if (!proposal) return;
      const targetProjectId = projectId || proposal.projectId || 'default';

      // Save snapshot for Undo
      setLayoutHistory((hist) => [
        ...hist.slice(-20),
        {
          id: `snap_${Date.now()}`,
          version: layoutVersion,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actionSummary: `Applied proposal (${proposal.action})`,
          widgets: currentLayout.widgets,
        },
      ]);

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
          // Re-sync with canonical layout or optimistic addition
          if (proposal.widgets && proposal.widgets.length > 0) {
            setCurrentLayout((prev) => ({
              ...prev,
              widgets: [...prev.widgets, ...proposal.widgets!],
            }));
          } else if (proposal.widgetSpec) {
            setCurrentLayout((prev) => ({
              ...prev,
              widgets: [...prev.widgets, proposal.widgetSpec],
            }));
          }
        }

        // 2. Mark proposal as applied
        setProposals((prev) => {
          const next = new Map(prev);
          next.set(actionId, { ...proposal, status: 'applied' });
          return next;
        });

        const pTitle =
          (proposal.widgetSpec?.props?.title as string) ||
          proposal.widgetSpec?.title ||
          'Widget';
        showToast(`Applied "${pTitle}" to canvas`, pTitle);
      } catch (err: any) {
        console.error('Failed to apply proposal:', err);
        const errMsg = err?.message || 'Failed to apply widget to dashboard.';

        // Check for 409 Conflict: Auto-detect pure additive append vs concurrent edit
        if (String(errMsg).includes('Conflict') || String(errMsg).includes('409')) {
          try {
            const fresh = await getProjectLayout(targetProjectId);
            const freshWidgets = fresh.layout_json?.widgets || [];
            const propWidgetId = proposal.widgetSpec?.id;
            const conflictExists = freshWidgets.some((w: any) => w.id === propWidgetId);

            setConflictState({
              actionId,
              proposal,
              targetProjectId,
              freshVersion: fresh.version,
              freshWidgets,
              isPureAppend: !conflictExists,
              conflictingWidget: conflictExists ? freshWidgets.find((w: any) => w.id === propWidgetId) : undefined,
            });
            return;
          } catch (fetchErr) {
            console.error('Failed to fetch fresh layout after conflict:', fetchErr);
          }
        }

        setProposals((prev) => {
          const next = new Map(prev);
          next.set(actionId, { ...proposal, status: 'error', error: errMsg });
          return next;
        });
      }
    },
    [proposals, projectId, currentLayout, showToast]
  );

  const handleRebaseAndApply = useCallback(async () => {
    if (!conflictState) return;
    const { proposal, targetProjectId, freshVersion, freshWidgets, isPureAppend } = conflictState;
    try {
      let mergedWidgets: WidgetSpec[];
      if (isPureAppend) {
        const toAppend = proposal.widgets && proposal.widgets.length > 0
          ? proposal.widgets
          : proposal.widgetSpec ? [proposal.widgetSpec] : [];
        mergedWidgets = [...freshWidgets, ...toAppend];
      } else {
        // Keep Mine (overwrite existing widget with proposal's widget)
        mergedWidgets = freshWidgets.map((w) =>
          w.id === proposal.widgetSpec?.id ? proposal.widgetSpec : w
        );
      }

      const res = await updateProjectLayout(targetProjectId, freshVersion, { widgets: mergedWidgets }, 'user');
      setCurrentLayout(res.layout_json);
      setLayoutVersion(res.version);
      setProposals((prev) => {
        const next = new Map(prev);
        next.set(proposal.actionId, {
          ...proposal,
          status: 'applied',
          skipped_widgets: proposal.skipped_widgets,
        });
        return next;
      });
      setConflictState(null);
      if (proposal.skipped_widgets && proposal.skipped_widgets.length > 0) {
        showToast(
          `Rebased & applied "${proposal.widgetSpec?.title || 'Widget'}" (Note: ${proposal.skipped_widgets.length} omitted widget(s) preserved in audit log)`
        );
      } else {
        showToast(`Rebased & applied "${proposal.widgetSpec?.title || 'Widget'}" onto canvas (v${res.version})`);
      }
    } catch (err: any) {
      alert(`Rebase failed: ${err.message}`);
    }
  }, [conflictState, showToast]);

  const handleDiscardConflict = useCallback(() => {
    if (!conflictState) return;
    setCurrentLayout({ widgets: conflictState.freshWidgets });
    setLayoutVersion(conflictState.freshVersion);
    setProposals((prev) => {
      const next = new Map(prev);
      next.set(conflictState.actionId, { ...conflictState.proposal, status: 'rejected' });
      return next;
    });
    setConflictState(null);
    showToast('Discarded proposal and synced with latest canvas version.');
  }, [conflictState, showToast]);

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

  const handleWidgetAction = useCallback(
    async (widgetId: string, action: string, payload?: unknown) => {
      if (action === 'delete' || action === 'remove_widget') {
        setCurrentLayout((prev) => {
          const target = prev.widgets.find((w) => w.id === widgetId);
          setLayoutHistory((hist) => [
            ...hist.slice(-20),
            {
              id: `snap_${Date.now()}`,
              version: layoutVersion,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              actionSummary: `Removed "${target?.title || 'Widget'}"`,
              widgets: prev.widgets,
            },
          ]);
          if (target) {
            showToast(`Removed "${target.title || 'Widget'}" from canvas`, target.title);
          }
          return {
            ...prev,
            widgets: prev.widgets.filter((w) => w.id !== widgetId),
          };
        });
      } else if (action === 'refresh') {
        const targetProjectId = projectId || 'default';
        try {
          const res = await refreshWidgetData(targetProjectId, widgetId);
          if (res.updated_widget) {
            setCurrentLayout((prev) => ({
              ...prev,
              widgets: prev.widgets.map((w) => (w.id === widgetId ? res.updated_widget! : w)),
            }));
            const widgetTitle = res.updated_widget.title || 'Widget';
            showToast(`Refreshed live data for "${widgetTitle}"`, widgetTitle);
          }
          if (res.anomaly_proposal) {
            const anomalyPayload = res.anomaly_proposal;
            const anomalyActionId = anomalyPayload.action_id || `act-anomaly-${Date.now()}`;
            setProposals((prev) => {
              const next = new Map(prev);
              next.set(anomalyActionId, {
                actionId: anomalyActionId,
                projectId: targetProjectId,
                action: (anomalyPayload.action as any) || 'add_widget',
                widgetSpec: anomalyPayload.widget_spec,
                widgets: anomalyPayload.widgets,
                skipped_widgets: anomalyPayload.skipped_widgets,
                requiresConfirmation: true,
                status: 'pending',
                createdAt: Date.now(),
              });
              return next;
            });
            showToast(`⚠️ Anomaly rule triggered: ${anomalyPayload.widget_spec?.title || 'Anomaly Alert'}`);
          }
        } catch (err: any) {
          console.error('Widget refresh error:', err);
          showToast(`Refresh failed: ${err?.message || 'Network error'}`);
        }
      } else if (action === 'update_annotations' && Array.isArray(payload)) {
        setCurrentLayout((prev) => {
          const updated = prev.widgets.map((w) => {
            if (w.id === widgetId) {
              return {
                ...w,
                annotations: payload as ChartAnnotation[],
                props: {
                  ...((w.props as any) || {}),
                  annotations: payload,
                },
              };
            }
            return w;
          });
          if (projectId) {
            updateProjectLayout(projectId, layoutVersion, { widgets: updated }, 'user').catch(console.warn);
          }
          return { ...prev, widgets: updated };
        });
        showToast('Saved chart annotation');
      }
    },
    [layoutVersion, showToast, projectId]
  );

  const handleMoveWidget = useCallback(
    (fromIndex: number, toIndex: number) => {
      setCurrentLayout((prev) => {
        const newWidgets = [...prev.widgets];
        if (
          fromIndex < 0 ||
          fromIndex >= newWidgets.length ||
          toIndex < 0 ||
          toIndex >= newWidgets.length
        ) {
          return prev;
        }
        setLayoutHistory((hist) => [
          ...hist.slice(-20),
          {
            id: `snap_${Date.now()}`,
            version: layoutVersion,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            actionSummary: 'Reordered widgets',
            widgets: prev.widgets,
          },
        ]);
        const [moved] = newWidgets.splice(fromIndex, 1);
        newWidgets.splice(toIndex, 0, moved);
        return { ...prev, widgets: newWidgets };
      });
    },
    [layoutVersion]
  );

  const handleToggleWidgetWidth = useCallback(
    (widgetId: string) => {
      setCurrentLayout((prev) => {
        setLayoutHistory((hist) => [
          ...hist.slice(-20),
          {
            id: `snap_${Date.now()}`,
            version: layoutVersion,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            actionSummary: 'Adjusted widget column width',
            widgets: prev.widgets,
          },
        ]);
        const newWidgets = prev.widgets.map((w) => {
          if (w.id !== widgetId) return w;
          const currentSpan = w.span || (w.type === 'line_chart' || w.type === 'table' ? 2 : 1);
          const nextSpan = (currentSpan === 2 ? 1 : 2) as 1 | 2;
          return { ...w, span: nextSpan };
        });
        return { ...prev, widgets: newWidgets };
      });
    },
    [layoutVersion]
  );

  const handleUpdateProposalSpec = useCallback(
    (actionId: string, updatedSpec: WidgetSpec) => {
      setProposals((prev) => {
        const existing = prev.get(actionId);
        if (!existing) return prev;
        const next = new Map(prev);
        next.set(actionId, {
          ...existing,
          widgetSpec: updatedSpec,
        });
        return next;
      });
    },
    []
  );

  const handleRefineWidget = useCallback(
    (widget: WidgetSpec) => {
      const title = widget.props?.title || widget.title || 'selected';
      setInputMessage(`Modify the "${title}" widget to `);
      if (isMobile) setActiveView('chat');
      inputRef.current?.focus();
    },
    [isMobile]
  );

  // ─── Conversational Stream Messaging ────────────────────────────────────────

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isThinking) return;

    // Auto-title workspace from first prompt if still untitled
    if (projectTitle === 'Untitled Analysis Workspace') {
      let derivedTitle = 'Analysis Workspace';
      const lower = text.toLowerCase();
      if (lower.includes('qqq')) {
        derivedTitle = 'Nasdaq-100 (QQQ) Analysis';
      } else if (lower.includes('nasdaq')) {
        derivedTitle = 'Nasdaq Market Analysis';
      } else if (lower.includes('revenue')) {
        derivedTitle = 'Revenue & Financial Analysis';
      } else {
        const cleaned = text
          .replace(/^(create|build|generate|make|show|add)\s+(a\s+)?(dashboard|chart|widget|view)?\s*(for\s+)?/i, '')
          .trim();
        if (cleaned.length > 2) {
          const capitalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
          derivedTitle = capitalized.length > 34 ? capitalized.slice(0, 34) + '…' : capitalized;
        }
      }
      setProjectTitle(derivedTitle);
    }

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
    setTimeout(() => scrollToBottom('smooth'), 50);
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
          widgets: payload.widgets,
          skipped_widgets: payload.skipped_widgets,
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

      if (event.event === 'artifact') {
        const art = event.payload as any;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, artifacts: [...(m.artifacts || []), art] } : m
          )
        );
        setStreamStatus(`Durable artifact generated: ${art.filename || art.format}`);
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
          if (isNearBottomRef.current && chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
          }
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
        layout: { widgets: currentLayout.widgets },
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
          <div
            ref={chatContainerRef}
            onScroll={handleChatScroll}
            data-lenis-prevent
            className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5"
          >
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
                        {inlineProposal.skipped_widgets && inlineProposal.skipped_widgets.length > 0 && (
                          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-[11px] font-mono space-y-1">
                            <div className="flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-300">
                              <IconAlertTriangle size={13} className="shrink-0" />
                              <span>{inlineProposal.skipped_widgets.length} widget(s) omitted by semantic critique:</span>
                            </div>
                            <ul className="list-disc list-inside pl-1 space-y-0.5 opacity-90">
                              {inlineProposal.skipped_widgets.map((sw) => (
                                <li key={sw.id}>
                                  <span className="font-semibold">{sw.title || sw.id}:</span> {sw.reason}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

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

                    {/* Durable Output Artifacts Display */}
                    {msg.artifacts && msg.artifacts.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-[#4A4238]/10 dark:border-white/10">
                        {msg.artifacts.map((art: any, aIdx: number) => {
                          const artFmt = (art.format || art.type || '').toLowerCase();
                          const isAudio = artFmt === 'audio_mp3' || artFmt === 'audio';
                          const isVideo = artFmt === 'video_mp4' || artFmt === 'video';
                          const downloadUrl = art.download_url || `/artifacts/${art.artifact_id}/${art.filename}`;
                          const fullUrl = downloadUrl.startsWith('http') ? downloadUrl : `http://localhost:8001${downloadUrl}`;

                          return (
                            <div
                              key={art.artifact_id || aIdx}
                              className="p-3 rounded-2xl bg-white/70 dark:bg-white/5 border border-[#4A4238]/15 dark:border-white/15 space-y-2 text-xs font-mono"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  {isAudio ? (
                                    <div className="w-7 h-7 rounded-lg bg-[#D4826A]/20 text-[#D4826A] flex items-center justify-center">
                                      <IconVolume size={15} />
                                    </div>
                                  ) : isVideo ? (
                                    <div className="w-7 h-7 rounded-lg bg-[#8FA98F]/20 text-[#8FA98F] flex items-center justify-center">
                                      <IconMovie size={15} />
                                    </div>
                                  ) : artFmt === 'ics' ? (
                                    <div className="w-7 h-7 rounded-lg bg-[#B8A9C9]/20 text-[#B8A9C9] flex items-center justify-center">
                                      <IconCalendar size={15} />
                                    </div>
                                  ) : (
                                    <div className="w-7 h-7 rounded-lg bg-[#0284C7]/20 text-[#0284C7] flex items-center justify-center">
                                      <IconFileText size={15} />
                                    </div>
                                  )}
                                  <div>
                                    <p className="font-semibold text-[#4A4238] dark:text-[#EDE6DC]">
                                      {art.filename || 'Durable Artifact'}
                                    </p>
                                    <p className="text-[10px] opacity-60">
                                      {art.format?.toUpperCase() || 'FILE'} · {art.size_bytes ? `${Math.round(art.size_bytes / 1024)} KB` : 'Ready'}
                                    </p>
                                  </div>
                                </div>

                                <a
                                  href={fullUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download={art.filename}
                                  className="px-2.5 py-1.5 rounded-lg bg-[#4A4238]/10 dark:bg-white/10 hover:bg-[#D4826A] hover:text-white transition-all flex items-center gap-1 text-[11px] font-mono cursor-pointer"
                                >
                                  <IconDownload size={13} />
                                  <span>Download</span>
                                </a>
                              </div>

                              {/* Audio Player if MP3 */}
                              {isAudio && (
                                <audio controls className="w-full h-8 pt-1" src={fullUrl}>
                                  Your browser does not support the audio element.
                                </audio>
                              )}

                              {/* Video Player if MP4 */}
                              {isVideo && (
                                <video controls className="w-full rounded-xl mt-1 border border-black/10" src={fullUrl}>
                                  Your browser does not support the video tag.
                                </video>
                              )}

                              {art.preview_text && !isAudio && !isVideo && (
                                <p className="text-[11px] opacity-75 italic line-clamp-2">
                                  {art.preview_text}
                                </p>
                              )}
                            </div>
                          );
                        })}
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
                ref={inputRef}
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
            layoutHistory={layoutHistory}
            onRollback={handleRollback}
            onAcceptProposal={handleAcceptProposal}
            onRejectProposal={handleRejectProposal}
            onDismissProposal={handleDismissProposal}
            onUpdateProposalSpec={handleUpdateProposalSpec}
            onWidgetAction={handleWidgetAction}
            onRenameWorkspace={(newTitle) => setProjectTitle(newTitle)}
            onRefine={handleRefineWidget}
            onMoveWidget={handleMoveWidget}
            onToggleWidgetWidth={handleToggleWidgetWidth}
            onUndo={handleUndo}
            lastActionToast={actionToast}
            onDismissToast={() => setActionToast(null)}
            presenceUsers={presenceUsers}
            onSaveTemplate={handleSaveTemplate}
            onLoadTemplate={handleLoadTemplate}
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

      {/* ─── 409 Conflict Rebase & Merge Modal ───────────────────────────── */}
      <AnimatePresence>
        {conflictState && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#FAF6F0] dark:bg-[#1C1917] border border-[#4A4238]/20 dark:border-white/15 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 pb-3 border-b border-[#4A4238]/10 dark:border-white/10">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                  <IconGitMerge size={20} />
                </div>
                <div>
                  <h3 className="font-serif text-base font-semibold text-[#4A4238] dark:text-[#EDE6DC]">
                    {conflictState.isPureAppend
                      ? 'Concurrent Update (Auto-Rebase Available)'
                      : 'Concurrent Modification Conflict'}
                  </h3>
                  <p className="text-[11px] font-mono text-[#4A4238]/60 dark:text-white/60">
                    Canvas advanced to v{conflictState.freshVersion} in another session
                  </p>
                </div>
              </div>

              {conflictState.isPureAppend ? (
                <div className="space-y-3 text-xs font-mono">
                  <p className="text-[#4A4238]/80 dark:text-[#EDE6DC]/80 leading-relaxed">
                    Another session or background task updated the layout to <span className="font-semibold text-[#D4826A]">v{conflictState.freshVersion}</span> ({conflictState.freshWidgets.length} widgets).
                  </p>
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                    <p className="font-semibold flex items-center gap-1.5">
                      <IconCheck size={14} /> Safe Additive Append
                    </p>
                    <p className="text-[11px] mt-0.5 opacity-80">
                      Your proposed widget &quot;{conflictState.proposal.widgetSpec?.title || 'Proposed Widget'}&quot; has no ID conflicts with the new canvas. You can safely rebase and apply it without losing concurrent edits.
                    </p>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleDiscardConflict()}
                      className="px-3.5 py-1.5 rounded-xl border border-[#4A4238]/20 dark:border-white/20 text-[#4A4238]/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                    >
                      Discard & Sync
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRebaseAndApply()}
                      className="px-4 py-1.5 rounded-xl bg-[#D4826A] hover:bg-[#c2755e] text-white font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <IconGitMerge size={14} /> Rebase & Apply
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-xs font-mono">
                  <p className="text-[#4A4238]/80 dark:text-[#EDE6DC]/80">
                    The widget &quot;{conflictState.proposal.widgetSpec?.title || conflictState.conflictingWidget?.title}&quot; was modified concurrently. Choose which version to retain:
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-3 rounded-xl border border-[#4A4238]/15 dark:border-white/15 bg-white/40 dark:bg-black/20 space-y-1">
                      <p className="font-semibold text-[#D4826A]">Your Proposal</p>
                      <p className="opacity-70 truncate">{conflictState.proposal.widgetSpec?.title}</p>
                      <p className="opacity-50">Type: {conflictState.proposal.widgetSpec?.component || conflictState.proposal.widgetSpec?.type}</p>
                    </div>
                    <div className="p-3 rounded-xl border border-[#4A4238]/15 dark:border-white/15 bg-white/40 dark:bg-black/20 space-y-1">
                      <p className="font-semibold text-[#0284C7]">Canvas Version</p>
                      <p className="opacity-70 truncate">{conflictState.conflictingWidget?.title}</p>
                      <p className="opacity-50">Type: {conflictState.conflictingWidget?.component || conflictState.conflictingWidget?.type}</p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleDiscardConflict()}
                      className="px-3.5 py-1.5 rounded-xl border border-[#4A4238]/20 dark:border-white/20 text-[#4A4238]/70 dark:text-white/70 hover:bg-black/5 cursor-pointer"
                    >
                      Keep Theirs
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRebaseAndApply()}
                      className="px-4 py-1.5 rounded-xl bg-[#D4826A] hover:bg-[#c2755e] text-white font-semibold cursor-pointer"
                    >
                      Keep Mine (Overwrite)
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
