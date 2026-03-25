import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import type { LearningPath } from '../../types';
import { getPath } from '../../services/api';
import { getProgress } from '../../services/progressStore';
import { useUser } from '../../contexts/UserContext';
import { useTheme } from '../../contexts/ThemeContext';
import XPBar from './XPBar';
import AuthWidget from './AuthWidget';
import StreakBadge from '../Streaks/StreakBadge';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1' },
  { to: '/catalog', label: 'Explore', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
  { to: '/challenge', label: 'Challenge', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
  { to: '/analytics', label: 'Analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { to: '/marketplace', label: 'Marketplace', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { to: '/settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
];

export default function Layout() {
  const { pathId, moduleId } = useParams<{ pathId?: string; moduleId?: string }>();
  const { toggle: toggleTheme, resolvedTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebarCollapsed') === '1'; } catch { return false; }
  });

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem('sidebarCollapsed', next ? '1' : '0'); } catch { /* ignore */ }
  }
  const [pathData, setPathData] = useState<LearningPath | null>(null);
  const { user, isLoggedIn, logout, xp } = useUser();

  useEffect(() => {
    if (!pathId) { setPathData(null); return; }
    let cancelled = false;
    getPath(pathId).then((p) => { if (!cancelled) setPathData(p); }).catch(() => {});
    return () => { cancelled = true; };
  }, [pathId]);

  const progress = getProgress();
  const completedForPath = pathId ? progress.completedModules[pathId] ?? [] : [];
  const sortedModules = pathData?.modules.slice().sort((a, b) => a.order - b.order) ?? [];

  return (
    <div className="flex h-screen overflow-hidden bg-lc-bg">
      {/* Sidebar */}
      <aside
        className={`flex flex-col border-r border-lc-border bg-lc-surface transition-all duration-200 ${collapsed ? 'w-16' : 'w-60'} shrink-0`}
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-2 border-b border-lc-border px-4">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <span className="text-lg font-bold text-lc-accent">TL</span>
            {!collapsed && <span className="font-display text-sm font-semibold text-lc-text">TechLab</span>}
          </Link>
          <button
            onClick={toggleCollapsed}
            className="ml-auto rounded p-1 text-lc-muted hover:bg-lc-hover hover:text-lc-text"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {collapsed
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              }
            </svg>
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col gap-1 p-2">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/dashboard'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-lc-accent/15 text-lc-accent'
                    : 'text-lc-muted hover:bg-lc-hover hover:text-lc-text'
                }`
              }
            >
              <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Theme toggle */}
        {!collapsed && (
          <div className="px-3 pt-2">
            <button
              onClick={toggleTheme}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-lc-muted hover:bg-lc-hover hover:text-lc-text transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                {resolvedTheme === 'dark'
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                }
              </svg>
              <span>{resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
            </button>
          </div>
        )}

        {/* User section */}
        <div className="mt-auto">
          {!collapsed && (
            <div className="border-t border-lc-border px-3 py-3 space-y-2">
              {isLoggedIn && user ? (
                <div className="space-y-2">
                  <StreakBadge />
                  <div className="flex items-center justify-between">
                    <span className="truncate text-xs font-semibold text-lc-text">{user.displayName}</span>
                    <button
                      onClick={logout}
                      className="text-[10px] text-lc-muted hover:text-lc-red"
                    >
                      Sign out
                    </button>
                  </div>
                  {xp && <XPBar totalXp={xp.totalXp} rank={xp.rank} rankTitle={xp.rankTitle} nextRankXp={xp.nextRankXp} />}
                </div>
              ) : (
                <AuthWidget />
              )}
            </div>
          )}
        </div>

        {/* Contextual module list when on a path page */}
        {pathData && !collapsed && (
          <div className="mt-2 flex flex-1 flex-col overflow-hidden border-t border-lc-border">
            <div className="px-4 py-3">
              <p className="truncate text-xs font-semibold uppercase tracking-wider text-lc-muted">{pathData.title}</p>
            </div>
            <div className="flex-1 overflow-y-auto px-2 pb-4">
              {sortedModules.map((m, i) => {
                const done = completedForPath.includes(m.id);
                const active = moduleId === m.id;
                return (
                  <NavLink
                    key={m.id}
                    to={`/paths/${pathData.id}/modules/${m.id}`}
                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs transition-colors ${
                      active
                        ? 'bg-lc-accent/15 text-lc-accent'
                        : 'text-lc-muted hover:bg-lc-hover hover:text-lc-text'
                    }`}
                  >
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      done ? 'bg-lc-green/20 text-lc-green' : 'bg-lc-surface2 text-lc-muted'
                    }`}>
                      {done ? '✓' : i + 1}
                    </span>
                    <span className="truncate">{m.title}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
