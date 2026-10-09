/**
 * First-run onboarding progress.
 *
 * Backend A does not store an onboarding flag. Progress lives in localStorage,
 * keyed by user id, so a refresh resumes the same step. The API we want is
 * described next to the PR.
 */

/**
 * @typedef {'active' | 'completed' | 'skipped' | 'established'} OnboardingStatus
 * @typedef {'data' | 'question' | 'insight'} OnboardingStep
 * @typedef {'file' | 'drive'} OnboardingDataKind
 * @typedef {{
 *   attachment_id: string,
 *   filename: string,
 *   status: string,
 *   extracted_summary: string | null,
 *   notes: string[],
 *   project_id: string | null,
 * }} OnboardingAttachment
 * @typedef {{
 *   id: string,
 *   projectId: string,
 *   provider: string,
 *   name: string,
 * }} OnboardingConnector
 * @typedef {{
 *   host: string,
 *   url?: string,
 *   title?: string,
 *   verified?: boolean,
 *   category?: string,
 * }} CitedSource
 * @typedef {{
 *   version: 1,
 *   userId: string,
 *   status: OnboardingStatus,
 *   step: OnboardingStep,
 *   updatedAt: string,
 *   projectId: string | null,
 *   dataKind: OnboardingDataKind | null,
 *   attachment: OnboardingAttachment | null,
 *   connector: OnboardingConnector | null,
 *   question: string | null,
 *   runId: string | null,
 *   answer: string | null,
 *   sources: CitedSource[],
 *   zeroTokenTool: string | null,
 * }} OnboardingProgress
 * @typedef {{
 *   action: 'show' | 'hide' | 'check-workspace',
 *   progress: OnboardingProgress | null,
 *   persist: boolean,
 *   reason: string,
 * }} OnboardingDecision
 */

export const ONBOARDING_STORAGE_KEY = 'analyzeit_onboarding_v1';
export const NEW_ACCOUNT_SESSION_KEY = 'analyzeit_auth_is_new';
export const ONBOARDING_PATH = '/onboarding';
export const CHAT_PATH = '/research';
/** A same-day account with no saved progress still counts as a first run. */
export const FIRST_RUN_WINDOW_MS = 24 * 60 * 60 * 1000;

export const ONBOARDING_STEPS = ['data', 'question', 'insight'];

/** Same extensions as POST /v1/chat/attachments (see attachmentsApi). */
export const ONBOARDING_FILE_EXTENSIONS = [
  'csv', 'tsv', 'txt', 'dsv', 'psv', 'tab',
  'json', 'ndjson', 'jsonl',
  'xlsx', 'xlsm',
  'pdf',
  'twb', 'twbx',
];

const DRIVE_PROVIDERS = new Set(['google_drive', 'gdrive', 'googledrive']);
const TERMINAL = new Set(['completed', 'skipped', 'established']);
const ZERO_TOKEN_LABELS = {
  weather_lookup: 'weather',
  calculator: 'calculator',
  currency_converter: 'FX',
  stock_lookup: 'stock',
};

function iso(now) {
  const date = now instanceof Date ? now : new Date(typeof now === 'number' ? now : Date.now());
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function cleanLabel(value, max = 120) {
  if (typeof value !== 'string') return '';
  const text = value.replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function asString(value) {
  return typeof value === 'string' ? value : '';
}

function readAll(storage) {
  if (!storage || typeof storage.getItem !== 'function') return {};
  try {
    const parsed = JSON.parse(storage.getItem(ONBOARDING_STORAGE_KEY) || '');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const records = parsed.records;
    if (!records || typeof records !== 'object' || Array.isArray(records)) return {};
    return records;
  } catch {
    return {};
  }
}

export function createMemoryStorage(seed) {
  const data = new Map(Object.entries(seed || {}));
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
  };
}

/**
 * Unscoped uploads are stored on `_chat_<userId>`. POST /v1/chat with that id
 * returns 500 and the error response has no CORS header, so the browser only
 * sees a failed fetch. A real workspace id is safe to send.
 * @param {unknown} projectId
 * @returns {string | null}
 */
export function usableChatProjectId(projectId) {
  const id = asString(projectId).trim();
  if (!id || id.startsWith('_chat_')) return null;
  return id;
}

/**
 * @param {unknown} projects
 * @param {unknown} [preferred]
 * @returns {string | null}
 */
export function pickWorkspaceProjectId(projects, preferred) {
  const ids = [];
  for (const project of Array.isArray(projects) ? projects : []) {
    const id = usableChatProjectId(project && (project.id || project.project_id));
    if (id && !ids.includes(id)) ids.push(id);
  }
  const prefer = usableChatProjectId(preferred);
  if (prefer && ids.includes(prefer)) return prefer;
  return ids[0] || null;
}

/** An auto-created empty workspace is not evidence the person has used the product. */
export function workspaceLooksUnused(projects) {
  if (!Array.isArray(projects)) return false;
  if (projects.length === 0) return true;
  return projects.every((project) => {
    const widgets = project && typeof project.widget_count === 'number' ? project.widget_count : 0;
    return widgets <= 0;
  });
}

export function fileChoiceError(filename) {
  const name = asString(filename).trim();
  if (!name) return 'Choose a file to upload.';
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
  if (!ONBOARDING_FILE_EXTENSIONS.includes(ext)) {
    return 'This file type can’t be uploaded. Use a CSV, spreadsheet, JSON, text, PDF, or Tableau file.';
  }
  return null;
}

export function accountLooksNew(createdAt, now = Date.now(), windowMs = FIRST_RUN_WINDOW_MS) {
  if (typeof createdAt !== 'string' || !createdAt.trim()) return false;
  const stamp = new Date(createdAt).getTime();
  if (Number.isNaN(stamp)) return false;
  const age = (typeof now === 'number' ? now : Date.now()) - stamp;
  if (age < -5 * 60 * 1000) return false;
  return age <= windowMs;
}

export function postAuthPath(nextPath, isNew) {
  const dest = typeof nextPath === 'string' && nextPath.startsWith('/') && !nextPath.startsWith('//')
    ? nextPath
    : CHAT_PATH;
  if (!isNew) return dest;
  if (dest === CHAT_PATH || dest === '/' || dest === '/home') return ONBOARDING_PATH;
  return dest;
}

export function destinationAfterAuth(nextPath, isNew, existingStatus) {
  if (isNew && !TERMINAL.has(existingStatus)) return postAuthPath(nextPath, true);
  const dest = typeof nextPath === 'string' && nextPath.startsWith('/') && !nextPath.startsWith('//')
    ? nextPath
    : CHAT_PATH;
  return dest;
}

export function readIsNewAccount(storage) {
  return Boolean(storage && storage.getItem(NEW_ACCOUNT_SESSION_KEY) === '1');
}

export function writeIsNewAccount(storage) {
  storage?.setItem?.(NEW_ACCOUNT_SESSION_KEY, '1');
}

export function clearIsNewAccount(storage) {
  storage?.removeItem?.(NEW_ACCOUNT_SESSION_KEY);
}

function blank(userId, now) {
  return {
    version: 1,
    userId,
    status: 'active',
    step: 'data',
    updatedAt: iso(now),
    projectId: null,
    dataKind: null,
    attachment: null,
    connector: null,
    question: null,
    runId: null,
    answer: null,
    sources: [],
    zeroTokenTool: null,
  };
}

function sanitizeAttachment(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const attachment_id = asString(raw.attachment_id).trim();
  const filename = asString(raw.filename).trim();
  if (!attachment_id || !filename) return null;
  const summary = asString(raw.extracted_summary).trim();
  const notes = Array.isArray(raw.notes) ? raw.notes.filter((note) => typeof note === 'string' && note.trim()) : [];
  return {
    attachment_id,
    filename,
    status: asString(raw.status),
    extracted_summary: summary || null,
    notes,
    project_id: asString(raw.project_id).trim() || null,
  };
}

function sanitizeConnector(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = asString(raw.id).trim();
  const projectId = asString(raw.projectId).trim();
  if (!id || !projectId) return null;
  if (!isGoogleDriveProvider(raw.provider)) return null;
  return {
    id,
    projectId,
    provider: normalizeProvider(raw.provider),
    name: cleanLabel(raw.name) || 'Google Drive',
  };
}

function sanitizeSources(list) {
  return normalizeCitedSources(list).slice(0, 12);
}

/** @param {unknown} record @returns {OnboardingProgress | null} */
export function coerceFields(record) {
  if (!record || typeof record !== 'object') return null;
  const userId = asString(record.userId).trim();
  if (!userId) return null;
  const status = ['active', 'completed', 'skipped', 'established'].includes(record.status) ? record.status : null;
  if (!status) return null;
  const attachment = sanitizeAttachment(record.attachment);
  const connector = sanitizeConnector(record.connector);
  let dataKind = record.dataKind === 'file' || record.dataKind === 'drive' ? record.dataKind : null;
  if (dataKind === 'file' && !attachment) dataKind = connector ? 'drive' : null;
  if (dataKind === 'drive' && !connector) dataKind = attachment ? 'file' : null;
  if (!dataKind && attachment) dataKind = 'file';
  if (!dataKind && connector) dataKind = 'drive';
  const hasData = Boolean((dataKind === 'file' && attachment) || (dataKind === 'drive' && connector));
  let step = ONBOARDING_STEPS.includes(record.step) ? record.step : 'data';
  if (!hasData) step = 'data';
  const question = cleanLabel(record.question, 4000) || null;
  const answer = typeof record.answer === 'string' ? record.answer : null;
  return {
    version: 1,
    userId,
    status,
    step,
    updatedAt: asString(record.updatedAt) || iso(),
    projectId: asString(record.projectId).trim() || attachment?.project_id || connector?.projectId || null,
    dataKind,
    attachment: dataKind === 'drive' ? null : attachment,
    connector: dataKind === 'file' ? null : connector,
    question,
    runId: asString(record.runId).trim() || null,
    answer,
    sources: sanitizeSources(record.sources),
    zeroTokenTool: asString(record.zeroTokenTool).trim() || null,
  };
}

/** Drop an insight that never received an answer so resume lands on the question. */
/** @param {unknown} record @returns {OnboardingProgress | null} */
export function progressForResume(record) {
  const progress = coerceFields(record);
  if (!progress) return null;
  if (progress.status === 'active' && progress.step === 'insight' && !asString(progress.answer).trim()) {
    return { ...progress, step: 'question' };
  }
  return progress;
}

/** @param {string} userId @param {number | Date} [now] @returns {OnboardingProgress} */
export function startProgress(userId, now) {
  return blank(userId, now);
}

/** @param {Storage | null | undefined} storage @param {string} userId @returns {OnboardingProgress | null} */
export function loadProgress(storage, userId) {
  if (!userId) return null;
  const record = readAll(storage)[userId];
  return coerceFields(record);
}

/** @param {Storage | null | undefined} storage @param {OnboardingProgress | null} progress @returns {boolean} */
export function saveProgress(storage, progress) {
  const clean = coerceFields(progress);
  if (!storage || !clean) return false;
  try {
    const records = readAll(storage);
    records[clean.userId] = clean;
    storage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({ version: 1, records }));
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {Storage | null | undefined} local
 * @param {Storage | null | undefined} session
 * @param {string} userId
 * @returns {OnboardingProgress | null}
 */
export function seedNewAccount(local, session, userId) {
  if (!userId) return null;
  writeIsNewAccount(session);
  const existing = loadProgress(local, userId);
  if (existing) return existing;
  const progress = startProgress(userId);
  saveProgress(local, progress);
  return progress;
}

/**
 * @param {{
 *   userId?: string | null,
 *   stored?: OnboardingProgress | null,
 *   isNewAccount?: boolean,
 *   createdAt?: string | null,
 *   projectCount?: number | null,
 *   workspaceUnused?: boolean | null,
 *   now?: number,
 * }} [input]
 * @returns {OnboardingDecision}
 */
export function decideOnboarding({
  userId,
  stored,
  isNewAccount = false,
  createdAt,
  projectCount = null,
  workspaceUnused = null,
  now = Date.now(),
} = {}) {
  if (!userId) return { action: 'hide', progress: null, persist: false, reason: 'signed-out' };
  const record = stored && stored.userId === userId ? coerceFields(stored) : null;
  if (record && record.status !== 'active') {
    return { action: 'hide', progress: record, persist: false, reason: record.status };
  }
  if (record && record.status === 'active') {
    return { action: 'show', progress: progressForResume(record), persist: false, reason: 'resume' };
  }
  if (isNewAccount) {
    return { action: 'show', progress: startProgress(userId, now), persist: true, reason: 'new-account' };
  }
  if (!accountLooksNew(createdAt, now)) {
    return { action: 'hide', progress: null, persist: false, reason: 'not-first-run' };
  }
  if (projectCount == null && workspaceUnused == null) {
    return { action: 'check-workspace', progress: null, persist: false, reason: 'recent-account' };
  }
  // Signup creates an empty workspace. That is still a first run.
  // Only a project that already has widgets counts as started.
  const unused = workspaceUnused == null ? projectCount === 0 : workspaceUnused;
  if (!unused) {
    return {
      action: 'hide',
      progress: { ...startProgress(userId, now), status: 'established' },
      persist: true,
      reason: 'already-started',
    };
  }
  return { action: 'show', progress: startProgress(userId, now), persist: true, reason: 'first-run' };
}

/** @param {OnboardingProgress | null} progress @param {Partial<OnboardingProgress>} patch @param {number | Date} [now] @returns {OnboardingProgress | null} */
export function applyProgress(progress, patch, now) {
  return coerceFields({ ...progress, ...patch, status: 'active', updatedAt: iso(now) });
}

/** @param {OnboardingProgress} progress @param {number | Date} [now] @returns {OnboardingProgress | null} */
export function markSkipped(progress, now) {
  const clean = coerceFields({ ...progress, status: 'skipped', updatedAt: iso(now) });
  return clean;
}

/** @param {OnboardingProgress} progress @param {number | Date} [now] @returns {OnboardingProgress | null} */
export function markCompleted(progress, now) {
  return coerceFields({ ...progress, status: 'completed', updatedAt: iso(now) });
}

/** @param {OnboardingProgress} progress @param {unknown} attachment @param {number | Date} [now] @returns {OnboardingProgress | null} */
export function selectFile(progress, attachment, now) {
  const file = sanitizeAttachment(attachment);
  if (!file || file.status === 'failed') return coerceFields(progress);
  return applyProgress(progress, {
    step: 'question',
    dataKind: 'file',
    attachment: file,
    connector: null,
    projectId: usableChatProjectId(file.project_id)
      || usableChatProjectId(progress?.projectId)
      || file.project_id
      || progress?.projectId
      || null,
    question: null,
    answer: null,
    sources: [],
    runId: null,
    zeroTokenTool: null,
  }, now);
}

/** @param {OnboardingProgress} progress @param {unknown} connector @param {number | Date} [now] @returns {OnboardingProgress | null} */
export function selectDrive(progress, connector, now) {
  const drive = sanitizeConnector(connector);
  if (!drive) return coerceFields(progress);
  return applyProgress(progress, {
    step: 'question',
    dataKind: 'drive',
    connector: drive,
    attachment: null,
    projectId: drive.projectId,
    question: null,
    answer: null,
    sources: [],
    runId: null,
    zeroTokenTool: null,
  }, now);
}

/** @param {OnboardingProgress} progress @param {string} question @param {number | Date} [now] @returns {OnboardingProgress | null} */
export function rememberQuestion(progress, question, now) {
  const text = asString(question).trim();
  if (!text) return coerceFields(progress);
  return applyProgress(progress, {
    step: 'insight',
    question: text,
    answer: null,
    sources: [],
    runId: null,
    zeroTokenTool: null,
  }, now);
}

/** @param {OnboardingProgress} progress @param {unknown} result @param {number | Date} [now] @returns {OnboardingProgress | null} */
export function rememberAnswer(progress, result, now) {
  const incoming = result && typeof result === 'object' ? result : {};
  return applyProgress(progress, {
    step: 'insight',
    answer: typeof incoming.answer === 'string' ? incoming.answer : '',
    sources: incoming.sources,
    runId: asString(incoming.runId).trim() || null,
    zeroTokenTool: asString(incoming.zeroTokenTool).trim() || null,
    projectId: usableChatProjectId(incoming.projectId)
      || usableChatProjectId(progress?.projectId)
      || asString(incoming.projectId).trim()
      || progress?.projectId
      || null,
  }, now);
}

/** @param {OnboardingProgress} progress @param {OnboardingStep} step @param {number | Date} [now] @returns {OnboardingProgress | null} */
export function goToStep(progress, step, now) {
  const current = coerceFields(progress);
  if (!current || !ONBOARDING_STEPS.includes(step)) return current;
  if (ONBOARDING_STEPS.indexOf(step) > ONBOARDING_STEPS.indexOf(current.step)) return current;
  return applyProgress(current, { step }, now);
}

export function stepIndex(step) {
  const index = ONBOARDING_STEPS.indexOf(step);
  return index < 0 ? 0 : index;
}

export function suggestedQuestions({ filename, extractedSummary, connectorName } = {}) {
  const file = cleanLabel(filename);
  const source = cleanLabel(connectorName);
  const summary = asString(extractedSummary).trim();
  const questions = [];
  if (file) {
    questions.push(`What is in ${file}?`);
    questions.push(`Summarize ${file} in plain language.`);
    if (summary) questions.push(`What should I look at first in ${file}?`);
  } else if (source) {
    questions.push(`What data is available from ${source}?`);
    questions.push(`Summarize what ${source} has synced.`);
  }
  return [...new Set(questions)].slice(0, 3);
}

export function normalizeProvider(provider) {
  return asString(provider).trim().toLowerCase().replace(/[\s-]+/g, '_');
}

export function isGoogleDriveProvider(provider) {
  return DRIVE_PROVIDERS.has(normalizeProvider(provider));
}

export function usableDriveConnector(connector) {
  if (!connector || typeof connector !== 'object') return false;
  if (!isGoogleDriveProvider(connector.provider)) return false;
  const status = asString(connector.status).toLowerCase();
  if (status !== 'connected' && status !== 'healthy') return false;
  const mode = asString(connector.data_mode).toLowerCase();
  if (mode === 'seed_demo' || mode === 'preview') return false;
  return true;
}

/** @param {unknown} connector @param {string} projectId @returns {OnboardingConnector | null} */
export function driveConnectorFromApi(connector, projectId) {
  if (!usableDriveConnector(connector)) return null;
  const id = asString(connector.id).trim();
  const project = asString(projectId).trim();
  if (!id || !project) return null;
  return {
    id,
    projectId: project,
    provider: normalizeProvider(connector.provider),
    name: cleanLabel(connector.name) || 'Google Drive',
  };
}

export function connectorsHref(projectId) {
  const id = usableChatProjectId(projectId);
  if (!id) return '/connectors';
  return `/connectors?project=${encodeURIComponent(id)}`;
}

export function chatHref(projectId) {
  const id = usableChatProjectId(projectId);
  if (!id) return CHAT_PATH;
  return `${CHAT_PATH}?project=${encodeURIComponent(id)}`;
}

export function uploadFailed(attachment) {
  return asString(attachment?.status).toLowerCase() === 'failed';
}

export function zeroTokenToolFromRoute(route) {
  if (typeof route !== 'string') return null;
  if (route.startsWith('zero_token_tool_failed')) return null;
  if (!/^zero_token_tool:(?!.*_failed)/.test(route)) return null;
  const name = route.slice('zero_token_tool:'.length).trim();
  return name || null;
}

export function labelZeroTokenTool(toolName) {
  if (ZERO_TOKEN_LABELS[toolName]) return ZERO_TOKEN_LABELS[toolName];
  return asString(toolName).replace(/_/g, ' ');
}

export function noteRouteDecision(payload) {
  const reason = asString(payload?.reason);
  const route = asString(payload?.route);
  const failed = reason.startsWith('zero_token_tool_failed') || route.startsWith('zero_token_tool_failed');
  const tool = zeroTokenToolFromRoute(reason) || zeroTokenToolFromRoute(route);
  return { tool: failed ? null : tool, failed };
}

export function textFromPayload(raw) {
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) {
    return raw.map((part) => {
      if (typeof part === 'string') return part;
      if (part && typeof part === 'object' && typeof part.text === 'string') return part.text;
      return '';
    }).join('');
  }
  if (raw && typeof raw === 'object' && typeof raw.text === 'string') return raw.text;
  return '';
}

export function normalizeCitedSources(list) {
  const out = [];
  for (const src of Array.isArray(list) ? list : []) {
    if (!src || typeof src !== 'object') continue;
    const url = typeof src.url === 'string' && /^https?:\/\//i.test(src.url) ? src.url : '';
    let host = asString(src.host).trim().replace(/^www\./i, '');
    if (!host && url) {
      try {
        host = new URL(url).hostname.replace(/^www\./i, '');
      } catch {
        host = '';
      }
    }
    if (!host && !url) continue;
    const title = asString(src.title).trim();
    const category = asString(src.category).trim();
    out.push({
      host: host || url,
      ...(url ? { url } : {}),
      ...(title ? { title } : {}),
      ...(src.verified === true ? { verified: true } : {}),
      ...(category ? { category } : {}),
    });
  }
  return out;
}

export function mergeCitedSources(prev, next) {
  const out = normalizeCitedSources(prev);
  for (const src of normalizeCitedSources(next)) {
    const idx = out.findIndex((item) => (src.url && item.url === src.url) || (!src.url && item.host === src.host));
    if (idx >= 0) out[idx] = { ...out[idx], ...src };
    else out.push(src);
  }
  return out.slice(0, 12);
}
