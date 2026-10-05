export const ONBOARDING_STORAGE_KEY: string;
export const NEW_ACCOUNT_SESSION_KEY: string;
export const ONBOARDING_PATH: string;
export const CHAT_PATH: string;
export const FIRST_RUN_WINDOW_MS: number;
export const ONBOARDING_STEPS: readonly ['data', 'question', 'insight'];
export const ONBOARDING_FILE_EXTENSIONS: readonly string[];

export type OnboardingStatus = 'active' | 'completed' | 'skipped' | 'established';
export type OnboardingStep = 'data' | 'question' | 'insight';
export type OnboardingDataKind = 'file' | 'drive';

export type OnboardingAttachment = {
  attachment_id: string;
  filename: string;
  status: string;
  extracted_summary: string | null;
  notes: string[];
  project_id: string | null;
};

export type OnboardingConnector = {
  id: string;
  projectId: string;
  provider: string;
  name: string;
};

export type CitedSource = {
  host: string;
  url?: string;
  title?: string;
  verified?: boolean;
  category?: string;
};

export type OnboardingProgress = {
  version: 1;
  userId: string;
  status: OnboardingStatus;
  step: OnboardingStep;
  updatedAt: string;
  projectId: string | null;
  dataKind: OnboardingDataKind | null;
  attachment: OnboardingAttachment | null;
  connector: OnboardingConnector | null;
  question: string | null;
  runId: string | null;
  answer: string | null;
  sources: CitedSource[];
  zeroTokenTool: string | null;
};

export type OnboardingDecision = {
  action: 'show' | 'hide' | 'check-workspace';
  progress: OnboardingProgress | null;
  persist: boolean;
  reason: string;
};

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function createMemoryStorage(seed?: Record<string, string>): KeyValueStorage;
export function fileChoiceError(filename: string): string | null;
export function accountLooksNew(createdAt: unknown, now?: number, windowMs?: number): boolean;
export function postAuthPath(nextPath: string, isNew: boolean): string;
export function destinationAfterAuth(nextPath: string, isNew: boolean, existingStatus?: string | null): string;
export function readIsNewAccount(storage: KeyValueStorage | null | undefined): boolean;
export function writeIsNewAccount(storage: KeyValueStorage | null | undefined): void;
export function clearIsNewAccount(storage: KeyValueStorage | null | undefined): void;
export function coerceFields(record: unknown): OnboardingProgress | null;
export function progressForResume(record: unknown): OnboardingProgress | null;
export function startProgress(userId: string, now?: number | Date): OnboardingProgress;
export function loadProgress(storage: KeyValueStorage | null | undefined, userId: string): OnboardingProgress | null;
export function saveProgress(storage: KeyValueStorage | null | undefined, progress: OnboardingProgress | null): boolean;
export function seedNewAccount(
  local: KeyValueStorage | null | undefined,
  session: KeyValueStorage | null | undefined,
  userId: string,
): OnboardingProgress | null;
export function decideOnboarding(input?: {
  userId?: string | null;
  stored?: OnboardingProgress | null;
  isNewAccount?: boolean;
  createdAt?: string | null;
  projectCount?: number | null;
  workspaceUnused?: boolean | null;
  now?: number;
}): OnboardingDecision;
export function usableChatProjectId(projectId: unknown): string | null;
export function pickWorkspaceProjectId(
  projects: Array<{ id?: string | null; project_id?: string | null }> | null | undefined,
  preferred?: unknown,
): string | null;
export function workspaceLooksUnused(projects: Array<{ widget_count?: number | null }> | null | undefined): boolean;
export function applyProgress(
  progress: OnboardingProgress | null,
  patch: Partial<OnboardingProgress>,
  now?: number | Date,
): OnboardingProgress | null;
export function markSkipped(progress: OnboardingProgress, now?: number | Date): OnboardingProgress | null;
export function markCompleted(progress: OnboardingProgress, now?: number | Date): OnboardingProgress | null;
export function selectFile(
  progress: OnboardingProgress,
  attachment: unknown,
  now?: number | Date,
): OnboardingProgress | null;
export function selectDrive(
  progress: OnboardingProgress,
  connector: unknown,
  now?: number | Date,
): OnboardingProgress | null;
export function rememberQuestion(
  progress: OnboardingProgress,
  question: string,
  now?: number | Date,
): OnboardingProgress | null;
export function rememberAnswer(
  progress: OnboardingProgress,
  result: {
    answer?: string;
    sources?: unknown;
    runId?: string | null;
    zeroTokenTool?: string | null;
    projectId?: string | null;
  },
  now?: number | Date,
): OnboardingProgress | null;
export function goToStep(
  progress: OnboardingProgress,
  step: OnboardingStep,
  now?: number | Date,
): OnboardingProgress | null;
export function stepIndex(step: string): number;
export function suggestedQuestions(input?: {
  filename?: string | null;
  extractedSummary?: string | null;
  connectorName?: string | null;
}): string[];
export function normalizeProvider(provider: unknown): string;
export function isGoogleDriveProvider(provider: unknown): boolean;
export function usableDriveConnector(connector: unknown): boolean;
export function driveConnectorFromApi(connector: unknown, projectId: string): OnboardingConnector | null;
export function connectorsHref(projectId?: string | null): string;
export function chatHref(projectId?: string | null): string;
export function uploadFailed(attachment: { status?: string } | null | undefined): boolean;
export function zeroTokenToolFromRoute(route: unknown): string | null;
export function labelZeroTokenTool(toolName: string): string;
export function noteRouteDecision(payload: { reason?: unknown; route?: unknown } | null | undefined): {
  tool: string | null;
  failed: boolean;
};
export function textFromPayload(raw: unknown): string;
export function normalizeCitedSources(list: unknown): CitedSource[];
export function mergeCitedSources(prev: unknown, next: unknown): CitedSource[];
