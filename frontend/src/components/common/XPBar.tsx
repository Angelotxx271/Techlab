interface XPBarProps {
  totalXp: number;
  rank: string;
  rankTitle: string;
  nextRankXp: number;
}

export default function XPBar({ totalXp, rank, rankTitle, nextRankXp }: XPBarProps) {
  const progress = nextRankXp > 0 ? Math.min((totalXp / nextRankXp) * 100, 100) : 100;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="font-bold text-lc-accent">{rank}</span>
        <span className="text-lc-muted">{totalXp} XP</span>
      </div>
      <div className="h-1.5 rounded-full bg-lc-surface2 overflow-hidden">
        <div
          className="h-full rounded-full bg-lc-accent transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-[9px] text-lc-muted">{rankTitle} &middot; {nextRankXp - totalXp > 0 ? `${nextRankXp - totalXp} XP to next rank` : 'Max rank'}</p>
    </div>
  );
}
