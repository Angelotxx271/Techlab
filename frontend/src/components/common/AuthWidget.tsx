import { useState } from 'react';
import { useUser } from '../../contexts/UserContext';

export default function AuthWidget() {
  const { login, register } = useUser();
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full rounded-lg bg-lc-accent/10 px-3 py-2 text-center text-xs font-medium text-lc-accent hover:bg-lc-accent/20"
      >
        Sign in to track XP
      </button>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setError('');
    setLoading(true);
    try {
      if (mode === 'register') {
        await register(username.trim(), password, displayName.trim() || username.trim());
      } else {
        await login(username.trim(), password);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-lc-text">
          {mode === 'login' ? 'Sign in' : 'Create account'}
        </span>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-[10px] text-lc-muted hover:text-lc-text"
        >
          &times;
        </button>
      </div>

      {mode === 'register' && (
        <input
          type="text"
          placeholder="Display name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full rounded border border-lc-border bg-lc-bg px-2 py-1.5 text-[11px] text-lc-text placeholder-lc-muted focus:border-lc-accent focus:outline-none"
        />
      )}
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="w-full rounded border border-lc-border bg-lc-bg px-2 py-1.5 text-[11px] text-lc-text placeholder-lc-muted focus:border-lc-accent focus:outline-none"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded border border-lc-border bg-lc-bg px-2 py-1.5 text-[11px] text-lc-text placeholder-lc-muted focus:border-lc-accent focus:outline-none"
      />

      {error && <p className="text-[10px] text-lc-red">{error}</p>}

      <button
        type="submit"
        disabled={!username.trim() || !password.trim() || loading}
        className="w-full rounded bg-lc-accent px-3 py-1.5 text-[11px] font-medium text-lc-bg hover:opacity-90 disabled:opacity-50"
      >
        {loading ? '...' : mode === 'login' ? 'Sign in' : 'Register'}
      </button>

      <button
        type="button"
        onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
        className="w-full text-center text-[10px] text-lc-accent hover:underline"
      >
        {mode === 'login' ? 'Need an account? Register' : 'Have an account? Sign in'}
      </button>
    </form>
  );
}
