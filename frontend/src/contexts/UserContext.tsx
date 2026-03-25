import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { AuthUser } from '../services/auth';
import * as authService from '../services/auth';

interface XPSummary {
  totalXp: number;
  rank: string;
  rankTitle: string;
  nextRankXp: number;
  exercisesCompleted: number;
}

interface UserContextValue {
  user: AuthUser | null;
  isLoggedIn: boolean;
  loading: boolean;
  xp: XPSummary | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, displayName?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  refreshXP: () => Promise<void>;
}

const XP_CACHE_KEY = 'xpSummary';

function getCachedXP(): XPSummary | null {
  try {
    const raw = localStorage.getItem(XP_CACHE_KEY);
    return raw ? JSON.parse(raw) as XPSummary : null;
  } catch { return null; }
}

function cacheXP(xp: XPSummary): void {
  try { localStorage.setItem(XP_CACHE_KEY, JSON.stringify(xp)); } catch { /* ignore */ }
}

function clearCachedXP(): void {
  try { localStorage.removeItem(XP_CACHE_KEY); } catch { /* ignore */ }
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [xp, setXP] = useState<XPSummary | null>(getCachedXP);

  const fetchXP = useCallback(async () => {
    if (!authService.isLoggedIn()) return;
    try {
      const res = await fetch('/api/xp/summary', {
        headers: authService.getAuthHeaders(),
      });
      if (res.ok) {
        const data: XPSummary = await res.json();
        setXP(data);
        cacheXP(data);
      }
    } catch { /* ignore */ }
  }, []);

  const refreshUser = useCallback(async () => {
    const me = await authService.getMe();
    setUser(me);
    if (me) fetchXP();
  }, [fetchXP]);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const loginFn = useCallback(async (username: string, password: string) => {
    const { user: u } = await authService.login(username, password);
    setUser(u);
    fetchXP();
  }, [fetchXP]);

  const registerFn = useCallback(async (username: string, password: string, displayName?: string) => {
    const { user: u } = await authService.register(username, password, displayName);
    setUser(u);
    fetchXP();
  }, [fetchXP]);

  const logoutFn = useCallback(() => {
    authService.logout();
    setUser(null);
    setXP(null);
    clearCachedXP();

    const keysToRemove = [
      'learnerProfile', 'learnerProgress', 'moduleStates',
      'careerPathRec', 'instructorGuidance', 'sidebarCollapsed',
    ];
    const apiCacheKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith('apiCache:')) apiCacheKeys.push(k);
    }
    [...keysToRemove, ...apiCacheKeys].forEach((k) => {
      try { localStorage.removeItem(k); } catch { /* ignore */ }
    });

    window.location.href = '/';
  }, []);

  return (
    <UserContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        loading,
        xp,
        login: loginFn,
        register: registerFn,
        logout: logoutFn,
        refreshUser,
        refreshXP: fetchXP,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}
