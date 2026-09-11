const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_V1 = `${API_BASE}/v1`;

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  preferences?: Record<string, unknown>;
  created_at?: string;
  tier?: string;
  entitlements?: Record<string, unknown>;
}

export interface AuthResult {
  token: string;
  user: UserProfile;
}

const TOKEN_KEY = 'analyzeit_token';
const USER_KEY = 'analyzeit_user';

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
}

export function clearAuthSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
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
  const res = await fetch(`${API_V1}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Sign in failed' }));
    throw new Error(errorData.detail || `Sign in failed (${res.status})`);
  }

  const data: AuthResult = await res.json();
  setAuthSession(data.token, data.user);
  return data;
}

export async function register(name: string, email: string, password: string): Promise<AuthResult> {
  const res = await fetch(`${API_V1}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Registration failed' }));
    throw new Error(errorData.detail || `Registration failed (${res.status})`);
  }

  const data: AuthResult = await res.json();
  setAuthSession(data.token, data.user);
  return data;
}

export async function fetchMe(): Promise<UserProfile | null> {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API_V1}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
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
  } catch {
    return null;
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
