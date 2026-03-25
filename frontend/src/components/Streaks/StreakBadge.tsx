import { useEffect, useState } from 'react';
import { getStreak, type StreakData } from '../../services/api';
import { useUser } from '../../contexts/UserContext';

export default function StreakBadge() {
  const { isLoggedIn } = useUser();
  const [streak, setStreak] = useState<StreakData | null>(null);

  useEffect(() => {
    if (!isLoggedIn) return;
    getStreak().then(setStreak).catch(() => {});
  }, [isLoggedIn]);

  if (!streak || !isLoggedIn) return null;

  const flameColor = streak.currentStreak >= 7 ? 'text-orange-400' : streak.currentStreak >= 3 ? 'text-amber-400' : 'text-lc-muted';
  const goalPips = [0, 1].map((i) => i < streak.todayExercises);

  return (
    <div className="flex items-center gap-2 rounded-lg bg-lc-surface2/60 px-3 py-2">
      <div className={`relative ${flameColor}`}>
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 23c-4.97 0-9-3.58-9-8 0-3.07 2.17-6.09 4-7.65.37-.32.92-.06.92.42 0 1.62.76 3.08 2.01 4.04C10.61 8.17 12 5.17 12 2c0-.55.45-1 1-1 0 0 .73 1.46 1.89 3.47C16.21 6.85 21 10.28 21 15c0 4.42-4.03 8-9 8z" />
        </svg>
        {streak.currentStreak > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-lc-accent text-[9px] font-bold text-lc-bg">
            {streak.currentStreak}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-lc-text truncate">
          {streak.currentStreak > 0 ? `${streak.currentStreak} day streak` : 'Start a streak!'}
        </p>
        <div className="flex gap-1 mt-0.5">
          {goalPips.map((filled, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${filled ? 'bg-lc-green' : 'bg-lc-surface2'}`}
            />
          ))}
        </div>
        <p className="text-[8px] text-lc-muted mt-0.5">
          {streak.dailyGoalMet ? 'Daily goal met!' : `${Math.max(0, 2 - streak.todayExercises)} more to goal`}
        </p>
      </div>
    </div>
  );
}
