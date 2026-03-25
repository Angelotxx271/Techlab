import type { DeveloperListItem } from '../../services/api';

interface DeveloperCardProps {
  developer: DeveloperListItem;
  onSelect: (userId: string) => void;
}

export default function DeveloperCard({ developer, onSelect }: DeveloperCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(developer.userId)}
      className="text-left w-full rounded-xl border border-lc-border bg-lc-surface p-5 transition-all hover:border-lc-accent/40 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-lc-accent"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lc-accent/15 text-sm font-bold text-lc-accent">
          {developer.displayName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lc-text truncate">{developer.displayName}</h3>
          {developer.currentPosition && (
            <p className="text-xs text-lc-muted truncate">{developer.currentPosition}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs font-bold text-lc-accent">{developer.rank}</p>
          <p className="text-[10px] text-lc-muted">{developer.totalXp} XP</p>
        </div>
      </div>

      {developer.bio && (
        <p className="mt-3 text-xs text-lc-muted line-clamp-2">{developer.bio}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="rounded-full bg-lc-surface2 px-2 py-0.5 text-[10px] font-medium capitalize text-lc-muted">
          {developer.skillLevel}
        </span>
        {developer.completedPaths.slice(0, 3).map((p) => (
          <span
            key={p}
            className="rounded-full bg-lc-accent/10 px-2 py-0.5 text-[10px] font-medium text-lc-accent"
          >
            {p}
          </span>
        ))}
        {developer.completedPaths.length > 3 && (
          <span className="text-[10px] text-lc-muted">
            +{developer.completedPaths.length - 3} more
          </span>
        )}
      </div>
    </button>
  );
}
