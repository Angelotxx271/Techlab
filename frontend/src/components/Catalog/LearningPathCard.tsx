import { Link } from 'react-router-dom';
import type { SkillLevel } from '../../types';

export interface LearningPathCardProps {
  id: string;
  title: string;
  description: string;
  estimatedDuration: string;
  difficulty: SkillLevel;
}

const difficultyColors: Record<SkillLevel, string> = {
  beginner: 'bg-lc-green/20 text-lc-green',
  intermediate: 'bg-lc-accent/20 text-lc-accent',
  advanced: 'bg-lc-red/20 text-lc-red',
};

export default function LearningPathCard({
  id,
  title,
  description,
  estimatedDuration,
  difficulty,
}: LearningPathCardProps) {
  return (
    <Link
      to={`/paths/${id}`}
      className="block rounded-lg border border-lc-border bg-lc-surface p-5 shadow-sm transition-colors hover:border-lc-accent/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-lc-accent focus-visible:ring-offset-2 focus-visible:ring-offset-lc-bg"
      aria-label={`${title} — ${difficulty} — ${estimatedDuration}`}
    >
      <h3 className="text-lg font-semibold text-lc-text">{title}</h3>
      <p className="mt-1 text-sm text-lc-muted line-clamp-2">{description}</p>
      <div className="mt-3 flex items-center gap-3">
        <span
          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${difficultyColors[difficulty]}`}
        >
          {difficulty}
        </span>
        <span className="text-xs text-lc-muted">{estimatedDuration}</span>
      </div>
    </Link>
  );
}
