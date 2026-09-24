const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_V1 = `${API_BASE}/v1`;

export const AUTH_REQUEST_TIMEOUT_MS = 15000;

/** Backend unreachable, suspended, or returned a non-JSON page (e.g. Render 503 HTML). */
export class ApiUnavailableError extends Error {
  constructor(message = 'We are seeing a large number of people right now because of high demand. Please try again in a little while.') {
    super(message);
    this.name = 'ApiUnavailableError';
  }
}

function throwIfApiUnavailable(res: Response): void {
  if (res.status === 502 || res.status === 503 || res.status === 504) {
    throw new ApiUnavailableError();
  }
  const contentType = res.headers.get('content-type') || '';
  if (res.ok && !contentType.includes('application/json')) {
    throw new ApiUnavailableError();
  }
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs: number = AUTH_REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Request timed out. Check your connection and try again.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}


export interface UserProfile {
  id: string;
  email: string;
  name: string;
  preferences?: Record<string, unknown>;
  created_at?: string;
  tier?: string;
  trial_status?: string;
  trial_ends_at?: string | null;
  trial_used?: boolean;
  entitlements?: Record<string, unknown>;
}

export interface AuthResult {
  token: string;
  user: UserProfile;
  is_new?: boolean;
}

const TOKEN_KEY = 'analyzeit_token';
const USER_KEY = 'analyzeit_user';
export const AUTH_COOKIE = 'analyzeit_auth';

/** Host-only cookies break across analyzeit.in ↔ www.analyzeit.in after login. */
function authCookieSuffix(maxAge: number): string {
  const parts = [`Path=/`, `SameSite=Lax`, `Max-Age=${maxAge}`];
  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    if (host === 'analyzeit.in' || host.endsWith('.analyzeit.in')) {
      parts.push('Domain=.analyzeit.in');
    }
    if (window.location.protocol === 'https:') {
      parts.push('Secure');
    }
  }
  return parts.join('; ');
}

function writeAuthCookie(present: boolean) {
  if (typeof document === 'undefined') return;
  document.cookie = present
    ? `${AUTH_COOKIE}=1; ${authCookieSuffix(60 * 60 * 24 * 30)}`
    : `${AUTH_COOKIE}=; ${authCookieSuffix(0)}`;
}

/** Keep middleware cookie in sync for sessions that already exist in localStorage. */
export function syncAuthCookieFromStorage(): void {
  writeAuthCookie(Boolean(getStoredToken()));
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return Boolean(getStoredToken());
}

/** Prevent open redirects from `?next=` values. */
export function safeNextPath(raw: string | null | undefined, fallback = '/research'): string {
  if (!raw) return fallback;
  if (!raw.startsWith('/')) return fallback;
  if (raw.startsWith('//')) return fallback;
  if (raw.startsWith('/login')) return fallback;
  if (raw.includes('://')) return fallback;
  return raw;
}

export function setAuthSession(token: string, user: UserProfile): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  writeAuthCookie(true);
}

export function clearAuthSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  writeAuthCookie(false);
}

export function getAuthHeaders(): Record<string, string> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const res = await fetchWithTimeout(`${API_V1}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  throwIfApiUnavailable(res);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Sign in failed' }));
    throw new Error(typeof errorData.detail === 'string' ? errorData.detail : 'Sign in failed');
  }

  const data: AuthResult = await res.json();
  setAuthSession(data.token, data.user);
  return data;
}

export async function register(name: string, email: string, password: string): Promise<AuthResult> {
  const res = await fetchWithTimeout(`${API_V1}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });

  throwIfApiUnavailable(res);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Registration failed' }));
    throw new Error(typeof errorData.detail === 'string' ? errorData.detail : 'Registration failed');
  }

  const data: AuthResult = await res.json();
  setAuthSession(data.token, data.user);
  return data;
}


export async function loginWithGoogle(credential: string): Promise<AuthResult> {
  const res = await fetchWithTimeout(`${API_V1}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Google sign-in failed' }));
    throw new Error(typeof errorData.detail === 'string' ? errorData.detail : 'Google sign-in failed');
  }

  const data: AuthResult = await res.json();
  setAuthSession(data.token, data.user);
  return data;
}


export async function startGitHubAuth(nextPath = '/research'): Promise<void> {
  const params = new URLSearchParams({ next: nextPath });
  const res = await fetchWithTimeout(`${API_V1}/auth/github/start?${params.toString()}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'GitHub sign-in is not configured' }));
    throw new Error(typeof errorData.detail === 'string' ? errorData.detail : 'GitHub sign-in is not configured');
  }
  const data = (await res.json()) as { auth_url?: string };
  if (!data.auth_url) {
    throw new Error('GitHub did not return an authorize URL');
  }
  window.location.assign(data.auth_url);
}


export async function loginWithGitHub(code: string, state: string): Promise<AuthResult> {
  const res = await fetchWithTimeout(`${API_V1}/auth/github`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, state }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'GitHub sign-in failed' }));
    throw new Error(typeof errorData.detail === 'string' ? errorData.detail : 'GitHub sign-in failed');
  }

  const data: AuthResult = await res.json();
  setAuthSession(data.token, data.user);
  return data;
}


export async function confirmAuthSession(): Promise<UserProfile> {
  const token = getStoredToken();
  if (!token) {
    throw new Error('No session token after sign-in. Please try again.');
  }
  const user = await fetchMe();
  if (!user) {
    clearAuthSession();
    throw new Error(
      'Account request finished, but we could not confirm your session. Try signing in.',
    );
  }
  writeAuthCookie(true);
  return user;
}

export async function fetchMe(): Promise<UserProfile | null> {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const res = await fetchWithTimeout(`${API_V1}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    throwIfApiUnavailable(res);
    if (!res.ok) {
      if (res.status === 401) {
        clearAuthSession();
      }
      return null;
    }
    const user: UserProfile = await res.json();
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
    return user;
  } catch (err) {
    if (err instanceof ApiUnavailableError) throw err;
    throw new ApiUnavailableError();
  }
}

export async function updateUserProfile(data: { name?: string; preferences?: Record<string, unknown> }): Promise<UserProfile> {
  const res = await fetch(`${API_V1}/auth/profile`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to update profile' }));
    throw new Error(errorData.detail || `Update profile failed (${res.status})`);
  }

  const user: UserProfile = await res.json();
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
  return user;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`${API_V1}/auth/change-password`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ old_password: currentPassword, new_password: newPassword }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to change password' }));
    throw new Error(errorData.detail || `Change password failed (${res.status})`);
  }

  return res.json();
}

export function logout(): void {
  clearAuthSession();
}
