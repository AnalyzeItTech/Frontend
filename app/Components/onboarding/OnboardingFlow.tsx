'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type DragEvent, type RefObject } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconArrowRight,
  IconCheck,
  IconFile,
  IconPlugConnected,
  IconRefresh,
  IconUpload,
} from '@tabler/icons-react';
import { UpgradeModal, type UpgradeReason } from '../billing/UpgradeModal';
import { ChatMarkdown } from '../chat/ChatMarkdown';
import { SourceChips, type ResearchSource } from '../research/SourceChips';
import { sourceFromProgressPayload } from '../globe/dataQuality.mjs';
import { getStoredUser } from '../../lib/auth';
import { redactClientError, ChatRequestError } from '../../lib/apiErrors';
import {
  ATTACHMENT_ACCEPT_ATTR,
  uploadChatAttachment,
} from '../../lib/attachmentsApi';
import { isLlmMonthlyQuotaError } from '../../lib/llmQuota';
import {
  answerIsOnlyPipelineFail,
  contextWallFromStreamEvent,
  contextWallSummary,
  mergeContextWall,
  quoteFreeContextLimit,
  type ContextWallSignal,
} from '../../lib/contextWall.mjs';
import {
  cancelRun,
  getProjects,
  streamChat,
  type StreamEvent,
} from '../../lib/chatApi';
import { fetchProjectConnectors } from '../../lib/customObjectsApi';
import { useTheme } from '../ui/ThemeProvider';
import {
  CHAT_PATH,
  chatHref,
  clearIsNewAccount,
  connectorsHref,
  driveConnectorFromApi,
  fileChoiceError,
  goToStep,
  labelZeroTokenTool,
  markCompleted,
  markSkipped,
  mergeCitedSources,
  normalizeCitedSources,
  noteRouteDecision,
  rememberAnswer,
  rememberQuestion,
  saveProgress,
  selectDrive,
  selectFile,
  stepIndex,
  pickWorkspaceProjectId,
  suggestedQuestions,
  textFromPayload,
  uploadFailed,
  usableChatProjectId,
  type OnboardingConnector,
  type OnboardingProgress,
  type OnboardingStep,
} from '../../lib/onboarding.mjs';
import { resolveFirstRun } from './resolveFirstRun';

const STEP_LABELS: Record<OnboardingStep, string> = {
  data: 'Your data',
  question: 'One question',
  insight: 'Answer',
};

const ASK_TIMEOUT_MS = 120_000;

type DrivePhase = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

function commit(next: OnboardingProgress | null) {
  if (!next) return null;
  saveProgress(localStorage, next);
  return next;
}

export function OnboardingFlow() {
  const router = useRouter();
  const { isIncognito } = useTheme();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const runIdRef = useRef<string | null>(null);
  const [phase, setPhase] = useState<'loading' | 'error' | 'ready'>('loading');
  const [loadError, setLoadError] = useState('');
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [drivePhase, setDrivePhase] = useState<DrivePhase>('idle');
  const [driveAttempt, setDriveAttempt] = useState(0);
  const [drives, setDrives] = useState<OnboardingConnector[]>([]);
  const [driveError, setDriveError] = useState('');
  const askTimeoutRef = useRef<number | null>(null);
  const [draft, setDraft] = useState('');
  const [asking, setAsking] = useState(false);
  const [statusLine, setStatusLine] = useState('');
  const [askError, setAskError] = useState('');
  const [stopped, setStopped] = useState(false);
  const [upgrade, setUpgrade] = useState<{ open: boolean; reason: UpgradeReason }>({ open: false, reason: 'generic' });
  const contextLabel = quoteFreeContextLimit(null);

  const leave = useCallback((href: string) => {
    abortRef.current?.abort();
    const runId = runIdRef.current;
    if (runId) void cancelRun(runId).catch(() => undefined);
    clearIsNewAccount(sessionStorage);
    router.push(href);
  }, [router]);

  const load = useCallback(() => {
    const user = getStoredUser();
    if (!user?.id) return;
    setPhase('loading');
    setLoadError('');
    let cancelled = false;
    resolveFirstRun(user)
      .then((decision) => {
        if (cancelled) return;
        if (decision.action !== 'show' || !decision.progress) {
          router.replace(CHAT_PATH);
          return;
        }
        setProgress(decision.progress);
        setDraft(decision.progress.question || '');
        setPhase('ready');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(redactClientError(err, 'Couldn’t open the setup.'));
        setPhase('error');
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => load(), [load]);

  useEffect(() => () => {
    abortRef.current?.abort();
    if (askTimeoutRef.current) window.clearTimeout(askTimeoutRef.current);
  }, []);

  useEffect(() => {
    if (phase !== 'ready' || progress?.step !== 'data') return;
    let cancelled = false;
    setDrivePhase('loading');
    setDriveError('');
    (async () => {
      try {
        const projects = await getProjects();
        const found: OnboardingConnector[] = [];
        for (const project of projects) {
          const rows = await fetchProjectConnectors(project.id, { strict: true });
          for (const row of rows) {
            const drive = driveConnectorFromApi(row, project.id);
            if (drive) found.push(drive);
          }
        }
        if (cancelled) return;
        setDrives(found);
        setDrivePhase(found.length ? 'ready' : 'empty');
      } catch (err: unknown) {
        if (cancelled) return;
        setDrives([]);
        setDriveError(redactClientError(err, 'Couldn’t check connectors.'));
        setDrivePhase('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phase, progress?.step, driveAttempt]);

  const ensureWorkspaceId = async (current: OnboardingProgress) => {
    const existing = usableChatProjectId(current.projectId);
    if (existing) return { progress: current, projectId: existing };
    try {
      const projects = await getProjects();
      const projectId = pickWorkspaceProjectId(projects, current.projectId);
      if (!projectId) return { progress: current, projectId: null };
      const next = commit({ ...current, projectId });
      return { progress: next || { ...current, projectId }, projectId };
    } catch {
      return { progress: current, projectId: null };
    }
  };

  const skip = () => {
    if (!progress) {
      leave(CHAT_PATH);
      return;
    }
    commit(markSkipped(progress));
    leave(CHAT_PATH);
  };

  const onFile = async (file: File) => {
    if (!progress || uploading) return;
    const choiceError = fileChoiceError(file.name);
    if (choiceError) {
      setUploadError(choiceError);
      return;
    }
    setUploading(true);
    setUploadError('');
    try {
      const pinned = await ensureWorkspaceId(progress);
      const uploaded = await uploadChatAttachment(pinned.projectId, file);
      if (uploadFailed(uploaded)) {
        const note = uploaded.notes?.find((item) => item.trim()) || 'Could not extract text from this file.';
        setUploadError(`${uploaded.filename}: ${note}`);
        return;
      }
      const next = commit(selectFile(pinned.progress, uploaded));
      if (next) {
        setProgress(next);
        setDraft('');
        setAskError('');
      }
    } catch (err: unknown) {
      setUploadError(redactClientError(err, 'Couldn’t upload that file.'));
    } finally {
      setUploading(false);
    }
  };

  const chooseDrive = (drive: OnboardingConnector) => {
    if (!progress) return;
    const next = commit(selectDrive(progress, drive));
    if (next) {
      setProgress(next);
      setDraft('');
      setAskError('');
    }
  };

  const backTo = (step: OnboardingStep) => {
    if (!progress || asking) return;
    const next = commit(goToStep(progress, step));
    if (next) setProgress(next);
  };

  const ask = async (question: string) => {
    if (!progress || asking) return;
    const text = question.trim();
    if (!text) return;
    const started = commit(rememberQuestion(progress, text));
    if (!started) return;
    const pinned = await ensureWorkspaceId(started);
    setProgress(pinned.progress);
    setDraft(text);
    setAsking(true);
    setAskError('');
    setStopped(false);
    setStatusLine('Working on your question…');

    const controller = new AbortController();
    abortRef.current = controller;
    runIdRef.current = null;
    const wallRef: { current: ContextWallSignal | null } = { current: null };
    let openedReason: 'context' | 'capacity' | null = null;
    let streamed = '';
    let sources = started.sources;
    let zeroTokenTool: string | null = null;
    let sawToolFailure = false;

    const noteWall = (event: StreamEvent) => {
      const next = contextWallFromStreamEvent(event);
      if (!next) return;
      wallRef.current = mergeContextWall(wallRef.current, next);
      const reason = wallRef.current?.upgradeReason;
      if (!wallRef.current?.openUpgrade || !reason) return;
      if (openedReason === 'context') return;
      if (openedReason === reason) return;
      openedReason = reason;
      setUpgrade({ open: true, reason });
    };

    askTimeoutRef.current = window.setTimeout(() => {
      controller.abort();
      const runId = runIdRef.current;
      if (runId) void cancelRun(runId).catch(() => undefined);
      setStopped(true);
      setStatusLine('');
      setAskError('The answer didn’t finish in time. You can try the question again.');
      setAsking(false);
    }, ASK_TIMEOUT_MS);

    try {
      const response = await streamChat({
        message: text,
        projectId: pinned.projectId || undefined,
        attachmentIds: started.attachment ? [started.attachment.attachment_id] : undefined,
        incognito: isIncognito,
        signal: controller.signal,
        onEvent: (event) => {
          noteWall(event);
          if (event.event === 'run_id' || event.event === 'run_started') {
            const runId = typeof event.payload?.run_id === 'string' ? event.payload.run_id : event.run_id;
            if (runId) runIdRef.current = runId;
          }
          if (event.event === 'route_decision') {
            const noted = noteRouteDecision(event.payload);
            if (noted.failed) {
              sawToolFailure = true;
              zeroTokenTool = null;
            } else if (noted.tool) {
              zeroTokenTool = noted.tool;
              setStatusLine(`Looking up via ${labelZeroTokenTool(noted.tool)}…`);
            }
          }
          if (event.event === 'model_delta') {
            streamed += textFromPayload(event.payload?.text);
            const snapshot = streamed;
            const citedNow = sources;
            setProgress((current: OnboardingProgress | null) => current && current.step === 'insight' ? { ...current, answer: snapshot, sources: citedNow } : current);
          }
          if (event.event === 'tool_progress') {
            const detail = typeof event.payload?.detail === 'string' ? event.payload.detail : '';
            if (detail) setStatusLine(detail);
            const nested = event.payload?.progress as Record<string, unknown> | undefined;
            const step = (typeof event.payload?.step === 'string' ? event.payload.step : nested?.step) || '';
            if (step === 'source_found') {
              const found = sourceFromProgressPayload({ ...(event.payload || {}), progress: nested, detail });
              if (found?.host || found?.url) {
                sources = mergeCitedSources(sources, [found]);
                const citedNow = sources;
                setProgress((current: OnboardingProgress | null) => current && current.step === 'insight' ? { ...current, sources: citedNow } : current);
              }
            }
          }
          if (event.event === 'final') {
            const parsed = textFromPayload(event.payload?.text);
            if (parsed) streamed = parsed;
            sources = mergeCitedSources(sources, event.payload?.sources);
          }
        },
      });
      if (controller.signal.aborted) return;
      const answer = response.finalText || streamed;
      const cited = mergeCitedSources(sources, response.sources);
      const tool = sawToolFailure ? null : zeroTokenTool;
      const projectId = usableChatProjectId(response.projectId) || pinned.projectId;
      const wall = wallRef.current;
      const pipelineOnly = !answer.trim() || answerIsOnlyPipelineFail(answer);
      const visible = wall?.softFail && pipelineOnly ? contextWallSummary(wall, contextLabel) : answer;
      const saved = commit(rememberAnswer(pinned.progress, {
        answer: visible,
        sources: cited,
        runId: response.runId || runIdRef.current,
        zeroTokenTool: tool,
        projectId,
      }));
      if (saved) setProgress(saved);
      setStatusLine('');
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      const chatError = err instanceof ChatRequestError ? err : null;
      if (chatError && isLlmMonthlyQuotaError(chatError)) {
        setUpgrade({ open: true, reason: 'quota' });
      } else if (chatError?.code === 'CLIENT_CONTEXT_TRUNCATED') {
        setUpgrade({ open: true, reason: 'context' });
      } else if (chatError?.upgradeRequired) {
        setUpgrade({
          open: true,
          reason: chatError.code === 'PIPELINE_INSUFFICIENT_DATA' ? 'capacity' : 'generic',
        });
      }
      setAskError(redactClientError(err, 'The question didn’t finish.'));
      if (streamed.trim()) {
        const saved = commit(rememberAnswer(pinned.progress, {
          answer: streamed,
          sources,
          runId: runIdRef.current,
          zeroTokenTool: sawToolFailure ? null : zeroTokenTool,
          projectId: pinned.projectId,
        }));
        if (saved) setProgress(saved);
      }
    } finally {
      if (askTimeoutRef.current) window.clearTimeout(askTimeoutRef.current);
      askTimeoutRef.current = null;
      if (!controller.signal.aborted) setAsking(false);
      abortRef.current = null;
    }
  };

  const finish = () => {
    if (!progress) return;
    const next = commit(markCompleted(progress));
    leave(chatHref(next?.projectId || progress.projectId));
  };

  if (phase === 'loading') {
    return (
      <div role="status" aria-live="polite" className="app-card mx-auto w-full max-w-2xl space-y-4 p-6 sm:p-8">
        <div className="h-4 w-40 animate-pulse rounded-full bg-[var(--surface-3)]" />
        <div className="h-24 animate-pulse rounded-2xl bg-[var(--surface-3)]" />
        <p className="text-sm text-[var(--text-secondary)]">Opening your setup…</p>
      </div>
    );
  }

  if (phase === 'error' || !progress) {
    return (
      <div role="alert" className="app-card mx-auto w-full max-w-2xl space-y-4 p-6 sm:p-8">
        <h1 className="page-title">Couldn’t open setup</h1>
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
          {loadError || 'Please try again.'}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => load()} className="btn-primary h-auto min-h-11 px-5">
            Retry
          </button>
          <button type="button" onClick={skip} className="btn-secondary h-auto min-h-11 px-5">
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  const step = progress.step;
  const questions = suggestedQuestions({
    filename: progress.dataKind === 'file' ? progress.attachment?.filename : null,
    extractedSummary: progress.dataKind === 'file' ? progress.attachment?.extracted_summary : null,
    connectorName: progress.dataKind === 'drive' ? progress.connector?.name : null,
  });
  const answer = progress.answer?.trim() || '';
  const usableAnswer = Boolean(answer) && !answerIsOnlyPipelineFail(answer);
  const cited = normalizeCitedSources(progress.sources) as ResearchSource[];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
            <p className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
            Step {stepIndex(step) + 1} of 3
          </p>
          <h1 className="page-title mt-2">
            One real answer <em>from your data</em>
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--text-secondary)]">
            Upload a file, or open Connectors if you want to link Google Drive. Then ask one question and read the answer with the sources that come back.
          </p>
        </div>
        <button type="button" onClick={skip} className="btn-ghost h-auto min-h-11 shrink-0 px-3 text-[var(--text-secondary)]">
          Skip for now
        </button>
      </div>

      <ol className="grid grid-cols-3 gap-2" aria-label="Setup steps">
        {(['data', 'question', 'insight'] as OnboardingStep[]).map((id) => {
          const index = stepIndex(id);
          const current = stepIndex(step);
          const state = index === current ? 'current' : index < current ? 'done' : 'upcoming';
          return (
            <li key={id}>
              <button
                type="button"
                disabled={state === 'upcoming' || asking}
                onClick={() => state === 'done' && backTo(id)}
                aria-current={state === 'current' ? 'step' : undefined}
                className={`flex min-h-11 w-full items-center justify-center rounded-full border px-2 text-center text-xs sm:text-sm ${
                  state === 'current'
                    ? 'border-[var(--coral)] bg-[var(--coral)]/12 text-[var(--text-primary)]'
                    : state === 'done'
                      ? 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]'
                      : 'border-[var(--border)] text-[var(--text-muted)]'
                } disabled:cursor-default`}
              >
                {state === 'done' ? <IconCheck size={14} className="mr-1 hidden sm:inline" /> : null}
                {STEP_LABELS[id]}
              </button>
            </li>
          );
        })}
      </ol>

      {step === 'data' ? (
        <DataStep
          progress={progress}
          uploading={uploading}
          uploadError={uploadError}
          dragOver={dragOver}
          drivePhase={drivePhase}
          drives={drives}
          driveError={driveError}
          fileRef={fileRef}
          onBrowse={() => fileRef.current?.click()}
          onFile={(file) => void onFile(file)}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onChooseDrive={chooseDrive}
          onRetryDrive={() => setDriveAttempt((attempt) => attempt + 1)}
        />
      ) : null}

      {step === 'question' ? (
        <section className="app-card space-y-4 p-5 sm:p-6">
          <div>
            <h2 className="font-serif text-2xl text-[var(--text-primary)]">Ask one question</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {progress.dataKind === 'file' && progress.attachment
                ? `These use the name of ${progress.attachment.filename}. Pick one, or write your own.`
                : progress.connector
                  ? `These use the name of ${progress.connector.name}. Pick one, or write your own.`
                  : 'Write a question about the data you just added.'}
            </p>
          </div>
          {questions.length ? (
            <div className="flex flex-col gap-2" role="group" aria-label="Suggested questions">
              {questions.map((question) => (
                <button
                  key={question}
                  type="button"
                  disabled={asking}
                  onClick={() => void ask(question)}
                  className="min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-left text-sm text-[var(--text-primary)] transition hover:border-[var(--coral)] disabled:opacity-50"
                >
                  {question}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-secondary)]">No suggestion is available until a file or Drive connection is selected.</p>
          )}
          {progress.attachment?.extracted_summary ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <p className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">Extracted summary</p>
              <p className="mt-2 max-h-32 overflow-y-auto text-sm leading-relaxed text-[var(--text-secondary)]">
                {progress.attachment.extracted_summary}
              </p>
            </div>
          ) : null}
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void ask(draft);
            }}
          >
            <label htmlFor="onboarding-question" className="block text-sm text-[var(--text-secondary)]">
              Or write your own
            </label>
            <textarea
              id="onboarding-question"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={3}
              disabled={asking}
              className="w-full resize-y rounded-[var(--radius-input,8px)] border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-sm text-[var(--text-primary)]"
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="submit" disabled={asking || !draft.trim()} className="btn-primary h-auto min-h-11 px-5 disabled:opacity-50">
                {asking ? 'Asking…' : 'Ask this'}
                <IconArrowRight size={15} className="ml-1" />
              </button>
              <button type="button" onClick={() => backTo('data')} disabled={asking} className="btn-secondary h-auto min-h-11 px-5">
                Choose different data
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {step === 'insight' ? (
        <section className="app-card space-y-4 p-5 sm:p-6" aria-live="polite">
          <div>
            <h2 className="font-serif text-2xl text-[var(--text-primary)]">
              {usableAnswer ? 'Your answer' : asking ? 'Working on it' : 'The question didn’t finish'}
            </h2>
            {progress.question ? (
              <p className="mt-2 text-sm text-[var(--text-secondary)]">You asked: {progress.question}</p>
            ) : null}
          </div>
          {progress.zeroTokenTool && usableAnswer ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#8FA98F]/15 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-[#4A7C59] dark:text-[#9EBB9A]">
              From tools · 0 tokens · {labelZeroTokenTool(progress.zeroTokenTool)}
            </span>
          ) : null}
          {asking && statusLine ? (
            <p role="status" className="text-sm text-[var(--text-secondary)]">{statusLine}</p>
          ) : null}
          {answer ? (
            <div className="text-sm leading-relaxed text-[var(--text-primary)]">
              <ChatMarkdown text={answer} />
            </div>
          ) : asking ? (
            <div className="h-20 animate-pulse rounded-2xl bg-[var(--surface-3)]" />
          ) : (
            <p className="text-sm text-[var(--text-secondary)]">No answer text came back.</p>
          )}
          {usableAnswer ? (
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">Sources cited</p>
              {cited.length ? (
                <SourceChips sources={cited} />
              ) : (
                <p className="mt-2 text-sm text-[var(--text-secondary)]">No sources were cited with this answer.</p>
              )}
              <p className="mt-3 text-sm text-[var(--text-secondary)]">
                {progress.attachment
                  ? `This question included ${progress.attachment.filename}.`
                  : progress.connector
                    ? `This question was scoped to ${progress.connector.name}.`
                    : null}
              </p>
            </div>
          ) : null}
          {askError ? (
            <p role="alert" className="text-sm text-[var(--danger,#C45B4A)]">{askError}</p>
          ) : null}
          {stopped && !askError ? (
            <p className="text-sm text-[var(--text-secondary)]">Stopped before the answer finished.</p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            {usableAnswer ? (
              <button type="button" onClick={finish} className="btn-primary h-auto min-h-11 px-5">
                Continue to chat
              </button>
            ) : (
              <button
                type="button"
                disabled={asking || !progress.question}
                onClick={() => progress.question && void ask(progress.question)}
                className="btn-primary h-auto min-h-11 px-5 disabled:opacity-50"
              >
                <IconRefresh size={15} className="mr-1" />
                Try the question again
              </button>
            )}
            <button type="button" onClick={() => backTo('question')} disabled={asking} className="btn-secondary h-auto min-h-11 px-5">
              Ask something else
            </button>
          </div>
        </section>
      ) : null}

      <UpgradeModal
        open={upgrade.open}
        reason={upgrade.reason}
        contextLimitLabel={contextLabel}
        onClose={() => setUpgrade((current) => ({ ...current, open: false }))}
      />
    </div>
  );
}

function DataStep({
  progress,
  uploading,
  uploadError,
  dragOver,
  drivePhase,
  drives,
  driveError,
  fileRef,
  onBrowse,
  onFile,
  onDragOver,
  onDragLeave,
  onChooseDrive,
  onRetryDrive,
}: {
  progress: OnboardingProgress;
  uploading: boolean;
  uploadError: string;
  dragOver: boolean;
  drivePhase: DrivePhase;
  drives: OnboardingConnector[];
  driveError: string;
  fileRef: RefObject<HTMLInputElement | null>;
  onBrowse: () => void;
  onFile: (file: File) => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDragLeave: () => void;
  onChooseDrive: (drive: OnboardingConnector) => void;
  onRetryDrive: () => void;
}) {
  return (
    <div className="grid gap-4">
      <section
        className={`app-card space-y-4 p-5 sm:p-6 ${dragOver ? 'border-[var(--coral)]' : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={(event) => {
          event.preventDefault();
          onDragLeave();
          const file = event.dataTransfer.files?.[0];
          if (file) onFile(file);
        }}
      >
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--coral)]/12 text-[var(--coral)]">
            <IconUpload size={22} />
          </div>
          <div>
            <h2 className="font-serif text-2xl text-[var(--text-primary)]">Upload a file</h2>
            <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
              CSV, spreadsheet, JSON, text, PDF, or Tableau. The file is sent to your account with the usual chat upload.
            </p>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept={ATTACHMENT_ACCEPT_ATTR}
          aria-label="Upload a file"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) onFile(file);
          }}
        />
        {uploading ? (
          <p role="status" className="text-sm text-[var(--text-secondary)]">Uploading…</p>
        ) : progress.attachment && progress.dataKind === 'file' ? (
          <p className="text-sm text-[var(--text-secondary)]">Current file: {progress.attachment.filename}</p>
        ) : (
          <p className="text-sm text-[var(--text-secondary)]">No file chosen yet.</p>
        )}
        {uploadError ? <p role="alert" className="text-sm text-[var(--danger,#C45B4A)]">{uploadError}</p> : null}
        <button type="button" onClick={onBrowse} disabled={uploading} className="btn-primary h-auto min-h-11 px-5 disabled:opacity-50">
          <IconFile size={16} className="mr-1" />
          {uploading ? 'Uploading…' : progress.attachment ? 'Choose a different file' : 'Choose a file'}
        </button>
      </section>

      <section className="app-card space-y-4 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--coral)]/12 text-[var(--coral)]">
            <IconPlugConnected size={22} />
          </div>
          <div>
            <h2 className="font-serif text-2xl text-[var(--text-primary)]">Google Drive</h2>
            <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
              Drive is linked from the Connectors page. Come back here afterward. This step continues only when a Drive connection is already on your account.
            </p>
          </div>
        </div>
        {drivePhase === 'loading' ? (
          <p role="status" className="text-sm text-[var(--text-secondary)]">Looking for a Google Drive connection…</p>
        ) : null}
        {drivePhase === 'empty' ? (
          <p className="text-sm text-[var(--text-secondary)]">No Google Drive connection on this account yet.</p>
        ) : null}
        {drivePhase === 'error' ? (
          <div role="alert" className="space-y-3">
            <p className="text-sm text-[var(--danger,#C45B4A)]">{driveError}</p>
            <button type="button" onClick={onRetryDrive} className="btn-secondary h-auto min-h-11 px-5">
              <IconRefresh size={15} className="mr-1" />
              Check again
            </button>
          </div>
        ) : null}
        {drivePhase === 'ready' ? (
          <div className="flex flex-col gap-2">
            {drives.map((drive) => (
              <button
                key={drive.id}
                type="button"
                onClick={() => onChooseDrive(drive)}
                className="min-h-11 rounded-2xl border border-[var(--border)] px-4 py-3 text-left text-sm text-[var(--text-primary)] hover:border-[var(--coral)]"
              >
                Use {drive.name}
              </button>
            ))}
          </div>
        ) : null}
        <Link href={connectorsHref(progress.projectId)} className="btn-secondary h-auto min-h-11 px-5">
          Open Connectors
          <IconArrowRight size={15} className="ml-1" />
        </Link>
      </section>
    </div>
  );
}
