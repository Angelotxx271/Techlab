const BASE_URL = '/api/auth';
const TOKEN_KEY = 'authToken';

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  currentPosition: string;
  role: string;
  bio: string;
  isPublic: boolean;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function register(username: string, password: string, displayName?: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, display_name: displayName || username }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || 'Registration failed');
  }
  const data: AuthResponse = await res.json();
  setToken(data.token);
  return data;
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || 'Login failed');
  }
  const data: AuthResponse = await res.json();
  setToken(data.token);
  return data;
}

export async function getMe(): Promise<AuthUser | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch(`${BASE_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      clearToken();
      return null;
    }
    return await res.json();
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  const token = getToken();
  if (token) {
    fetch(`${BASE_URL}/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }
  clearToken();
}

export function isLoggedIn(): boolean {
  return !!getToken();
}
