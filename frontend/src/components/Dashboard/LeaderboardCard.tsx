import { useEffect, useState } from 'react';
import { getLeaderboard, type LeaderboardEntry } from '../../services/api';

export default function LeaderboardCard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeaderboard()
      .then(setEntries)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || entries.length === 0) return null;

  return (
    <div className="rounded-xl border border-lc-border bg-lc-surface p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-lc-muted mb-3">
        Leaderboard
      </h3>
      <div className="space-y-2">
        {entries.slice(0, 10).map((entry, i) => (
          <div
            key={entry.userId}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-lc-hover"
          >
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              i === 0 ? 'bg-yellow-500/20 text-yellow-500' :
              i === 1 ? 'bg-gray-400/20 text-gray-400' :
              i === 2 ? 'bg-amber-700/20 text-amber-700' :
              'bg-lc-surface2 text-lc-muted'
            }`}>
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="truncate font-medium text-lc-text">{entry.displayName}</p>
              <p className="text-xs text-lc-muted">{entry.rank} &middot; {entry.rankTitle}</p>
            </div>
            <span className="text-xs font-bold text-lc-accent">{entry.totalXp} XP</span>
          </div>
        ))}
      </div>
    </div>
  );
}
