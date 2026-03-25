import { useEffect, useState } from 'react';
import { getDeveloperDetail, type DeveloperDetail } from '../../services/api';

interface DeveloperProfileProps {
  userId: string;
  onClose: () => void;
}

export default function DeveloperProfile({ userId, onClose }: DeveloperProfileProps) {
  const [dev, setDev] = useState<DeveloperDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDeveloperDetail(userId)
      .then(setDev)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="rounded-xl border border-lc-border bg-lc-surface p-6">
        <p className="text-sm text-lc-muted animate-pulse">Loading profile...</p>
      </div>
    );
  }

  if (!dev) {
    return (
      <div className="rounded-xl border border-lc-border bg-lc-surface p-6">
        <p className="text-sm text-lc-red">Failed to load developer profile.</p>
        <button onClick={onClose} className="mt-2 text-sm text-lc-accent hover:underline">
          Go back
        </button>
      </div>
    );
  }

  const completedPaths = Object.entries(dev.completedModules).filter(
    ([, modules]) => modules.length > 0,
  );

  return (
    <div className="rounded-xl border border-lc-border bg-lc-surface overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-lc-accent/10 to-lc-surface p-6">
        <button
          onClick={onClose}
          className="text-xs text-lc-muted hover:text-lc-text mb-4 inline-block"
        >
          &larr; Back to marketplace
        </button>
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-lc-accent/20 text-2xl font-bold text-lc-accent">
            {dev.displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-lc-text">{dev.displayName}</h2>
            {dev.currentPosition && (
              <p className="text-sm text-lc-muted">{dev.currentPosition}</p>
            )}
            <div className="mt-2 flex items-center gap-3">
              <span className="rounded-full bg-lc-accent/15 px-3 py-1 text-xs font-bold text-lc-accent">
                {dev.rank} &middot; {dev.rankTitle}
              </span>
              <span className="text-xs text-lc-muted">{dev.totalXp} XP</span>
            </div>
          </div>
        </div>
        {dev.bio && (
          <p className="mt-4 text-sm text-lc-muted leading-relaxed">{dev.bio}</p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 border-t border-lc-border divide-x divide-lc-border">
        <div className="p-4 text-center">
          <p className="text-lg font-bold text-lc-text">{completedPaths.length}</p>
          <p className="text-xs text-lc-muted">Paths</p>
        </div>
        <div className="p-4 text-center">
          <p className="text-lg font-bold text-lc-text capitalize">{dev.skillLevel}</p>
          <p className="text-xs text-lc-muted">Skill Level</p>
        </div>
        <div className="p-4 text-center">
          <p className="text-lg font-bold text-lc-text">{dev.totalXp}</p>
          <p className="text-xs text-lc-muted">Total XP</p>
        </div>
      </div>

      {/* Completed paths & accuracy */}
      {completedPaths.length > 0 && (
        <div className="border-t border-lc-border p-5">
          <h3 className="text-sm font-semibold text-lc-text mb-3">Completed Paths</h3>
          <div className="space-y-2">
            {completedPaths.map(([pathId, modules]) => {
              const accuracies = modules
                .map((mid) => dev.exerciseAccuracy[mid])
                .filter((a) => a !== undefined);
              const avgAccuracy =
                accuracies.length > 0
                  ? Math.round((accuracies.reduce((s, a) => s + a, 0) / accuracies.length) * 100)
                  : null;

              return (
                <div
                  key={pathId}
                  className="flex items-center justify-between rounded-lg bg-lc-bg px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-lc-text">{pathId}</p>
                    <p className="text-xs text-lc-muted">{modules.length} modules completed</p>
                  </div>
                  {avgAccuracy !== null && (
                    <span className={`text-xs font-bold ${avgAccuracy >= 80 ? 'text-lc-green' : avgAccuracy >= 60 ? 'text-yellow-500' : 'text-lc-red'}`}>
                      {avgAccuracy}% accuracy
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent XP activity */}
      {dev.xpHistory.length > 0 && (
        <div className="border-t border-lc-border p-5">
          <h3 className="text-sm font-semibold text-lc-text mb-3">Recent Activity</h3>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {dev.xpHistory.slice(0, 20).map((entry, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-lc-muted">{entry.reason}</span>
                <span className="font-bold text-lc-accent">+{entry.amount} XP</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
