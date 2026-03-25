import { useEffect, useState } from 'react';
import { getActivityFeed, type FeedEvent } from '../../services/api';

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const TYPE_ICONS: Record<string, string> = {
  badge: '🏆',
  xp: '⚡',
  path_complete: '🎓',
  streak: '🔥',
};

export default function ActivityFeed() {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const data = await getActivityFeed();
        if (mounted) setEvents(data);
      } catch { /* ignore */ }
      finally { if (mounted) setLoading(false); }
    }
    load();

    const interval = setInterval(load, 30_000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  if (loading) return <div className="rounded-lg border border-lc-border bg-lc-surface p-4"><p className="text-xs text-lc-muted">Loading feed...</p></div>;

  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-lc-border bg-lc-surface p-4">
        <h3 className="text-sm font-semibold text-lc-text mb-2">Activity</h3>
        <p className="text-xs text-lc-muted">No recent activity yet. Complete exercises to see the feed!</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-lc-border bg-lc-surface p-4">
      <h3 className="text-sm font-semibold text-lc-text mb-3">Recent Activity</h3>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {events.slice(0, 15).map((ev, i) => (
          <div key={i} className="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-lc-hover/50 transition-colors">
            <span className="text-sm mt-0.5">{TYPE_ICONS[ev.type] ?? '📌'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-lc-text">
                <span className="font-semibold">{ev.displayName}</span>{' '}
                <span className="text-lc-muted">{ev.action}</span>
              </p>
              <p className="text-[9px] text-lc-muted">{timeAgo(ev.timestamp)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
