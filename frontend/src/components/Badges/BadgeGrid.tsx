import { useEffect, useState } from 'react';
import { getBadges, type Badge } from '../../services/api';
import { useUser } from '../../contexts/UserContext';

const ICON_MAP: Record<string, string> = {
  rocket: 'M12 19V5m0 0l-7 7m7-7l7 7',
  flame: 'M12 23c-4.97 0-9-3.58-9-8 0-3.07 2.17-6.09 4-7.65C12 2 12 2 12 2s5 4.28 5 8.35c0 4.42-4.03 8-9 8z',
  fire: 'M12 23c-4.97 0-9-3.58-9-8 0-3.07 2.17-6.09 4-7.65C12 2 12 2 12 2s5 4.28 5 8.35c0 4.42-4.03 8-9 8z',
  flag: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z',
  zap: 'M13 2L3 14h9l-1 10 10-12h-9l1-10z',
  moon: 'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z',
  bolt: 'M13 2L3 14h9l-1 10 10-12h-9l1-10z',
  trophy: 'M6 9H4.5a2.5 2.5 0 010-5H6m12 5h1.5a2.5 2.5 0 000-5H18M6 9v6a6 6 0 0012 0V4H6v5zm3 10h6m-3 0v4',
  crown: 'M2 20h20L18 8l-4 6-2-8-2 8-4-6z',
  star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
};

interface Props {
  compact?: boolean;
}

export default function BadgeGrid({ compact }: Props) {
  const { isLoggedIn } = useUser();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [counts, setCounts] = useState({ earned: 0, total: 0 });

  useEffect(() => {
    if (!isLoggedIn) return;
    getBadges().then((res) => {
      setBadges(res.badges);
      setCounts({ earned: res.earnedCount, total: res.totalCount });
    }).catch(() => {});
  }, [isLoggedIn]);

  if (!isLoggedIn || badges.length === 0) return null;

  const displayed = compact ? badges.filter((b) => b.earned) : badges;

  return (
    <div>
      {!compact && (
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-lc-text">Achievements</h3>
          <span className="text-xs text-lc-muted">{counts.earned}/{counts.total}</span>
        </div>
      )}
      <div className={`grid gap-2 ${compact ? 'grid-cols-4' : 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5'}`}>
        {displayed.map((badge) => {
          const iconPath = ICON_MAP[badge.icon] ?? ICON_MAP.star;
          return (
            <div
              key={badge.type}
              title={`${badge.label}: ${badge.description}`}
              className={`group relative flex flex-col items-center rounded-lg border p-3 text-center transition-all ${
                badge.earned
                  ? 'border-lc-accent/30 bg-lc-accent/5 hover:border-lc-accent/60'
                  : 'border-lc-border/40 bg-lc-surface2/30 opacity-40'
              }`}
            >
              <svg
                className={`h-7 w-7 ${badge.earned ? 'text-lc-accent' : 'text-lc-muted'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
              </svg>
              <span className={`mt-1.5 text-[10px] font-medium leading-tight ${badge.earned ? 'text-lc-text' : 'text-lc-muted'}`}>
                {badge.label}
              </span>
              <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-lc-bg px-2 py-1 text-[9px] text-lc-muted opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                {badge.description}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
