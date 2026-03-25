import { useEffect, useState } from 'react';
import { getAnalytics, type AnalyticsData } from '../../services/api';
import { useUser } from '../../contexts/UserContext';
import SkillRadar from './SkillRadar';
import ContributionHeatmap from './ContributionHeatmap';

export default function AnalyticsPage() {
  const { isLoggedIn } = useUser();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) { setLoading(false); return; }
    getAnalytics().then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [isLoggedIn]);

  if (!isLoggedIn) return <p className="py-12 text-center text-lc-muted">Sign in to view analytics.</p>;
  if (loading) return <p className="py-12 text-center text-lc-muted">Loading analytics...</p>;
  if (!data) return <p className="py-12 text-center text-lc-red">Failed to load analytics.</p>;

  const maxXP = Math.max(...data.dailyActivity.map((d) => d.xp), 1);
  const maxEx = Math.max(...data.dailyActivity.map((d) => d.exercises), 1);

  return (
    <section className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-lc-text">Analytics</h1>
        <p className="mt-1 text-lc-muted">Your learning progress at a glance.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Exercises', value: data.totalExercises },
          { label: 'Days Active', value: data.totalDaysActive },
          { label: 'Current Streak', value: `${data.currentStreak}d` },
          { label: 'Strongest', value: data.strongest ?? '—' },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-lc-border bg-lc-surface p-4">
            <p className="text-xs text-lc-muted">{s.label}</p>
            <p className="text-2xl font-bold text-lc-text mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Contribution heatmap */}
      <ContributionHeatmap data={data.yearHeatmap ?? {}} totalContributions={data.totalContributions ?? 0} />

      {/* XP over time */}
      <div className="rounded-lg border border-lc-border bg-lc-surface p-5">
        <h3 className="text-sm font-semibold text-lc-text mb-4">XP Over Time (Last 30 Days)</h3>
        <div className="flex items-end gap-[2px] h-32">
          {data.dailyActivity.map((d) => (
            <div key={d.date} className="group relative flex-1 flex flex-col justify-end">
              <div
                className="w-full rounded-t bg-lc-accent/80 hover:bg-lc-accent transition-colors"
                style={{ height: `${Math.max((d.xp / maxXP) * 100, d.xp > 0 ? 4 : 0)}%` }}
              />
              <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-lc-bg px-1.5 py-0.5 text-[9px] text-lc-muted opacity-0 shadow group-hover:opacity-100">
                {d.date.slice(5)}: {d.xp} XP
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activity per day */}
      <div className="rounded-lg border border-lc-border bg-lc-surface p-5">
        <h3 className="text-sm font-semibold text-lc-text mb-4">Exercises Per Day</h3>
        <div className="flex items-end gap-[2px] h-24">
          {data.dailyActivity.map((d) => (
            <div key={d.date} className="group relative flex-1 flex flex-col justify-end">
              <div
                className="w-full rounded-t bg-lc-green/70 hover:bg-lc-green transition-colors"
                style={{ height: `${Math.max((d.exercises / maxEx) * 100, d.exercises > 0 ? 6 : 0)}%` }}
              />
              <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-lc-bg px-1.5 py-0.5 text-[9px] text-lc-muted opacity-0 shadow group-hover:opacity-100">
                {d.date.slice(5)}: {d.exercises}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Skill Radar + Category XP */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-lc-border bg-lc-surface p-5 flex flex-col items-center">
          <h3 className="text-sm font-semibold text-lc-text mb-4 self-start">Skill Distribution</h3>
          <SkillRadar scores={data.categoryScores} />
        </div>
        <div className="rounded-lg border border-lc-border bg-lc-surface p-5">
          <h3 className="text-sm font-semibold text-lc-text mb-4">XP By Category</h3>
          <div className="space-y-3">
            {Object.entries(data.categoryXp).sort((a, b) => b[1] - a[1]).map(([cat, xp]) => {
              const maxCat = Math.max(...Object.values(data.categoryXp), 1);
              return (
                <div key={cat}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-lc-text">{cat}</span>
                    <span className="text-lc-muted">{xp} XP</span>
                  </div>
                  <div className="h-2 rounded-full bg-lc-surface2 overflow-hidden">
                    <div className="h-full rounded-full bg-lc-accent transition-all" style={{ width: `${(xp / maxCat) * 100}%` }} />
                  </div>
                </div>
              );
            })}
            {Object.keys(data.categoryXp).length === 0 && (
              <p className="text-xs text-lc-muted">Complete exercises to see category breakdown.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
