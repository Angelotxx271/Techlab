import { Link } from 'react-router-dom';
import type { NextStepRecommendation } from '../../types';
import { recommendationToHref } from './recommendationHref';

const TYPE_CONFIG: Record<
  NextStepRecommendation['type'],
  { icon: string; label: string; color: string }
> = {
  continue_path: { icon: '▶', label: 'Continue Path', color: 'bg-lc-accent/15 text-lc-accent' },
  review_module: { icon: '🔄', label: 'Review Module', color: 'bg-lc-red/15 text-lc-red' },
  start_new_path: { icon: '🚀', label: 'Start New Path', color: 'bg-lc-green/15 text-lc-green' },
};

interface RecommendationCardProps {
  recommendation: NextStepRecommendation;
}

export default function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const config = TYPE_CONFIG[recommendation.type] ?? TYPE_CONFIG.continue_path;
  const to = recommendationToHref(recommendation);

  return (
    <Link
      to={to}
      className="block w-full rounded-xl border border-lc-border bg-lc-surface p-4 text-left shadow-sm transition-all hover:border-lc-accent/40 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-lc-accent focus-visible:ring-offset-2 focus-visible:ring-offset-lc-bg"
      aria-label={`${config.label}: ${recommendation.reason}`}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl shrink-0" aria-hidden="true">
          {config.icon}
        </span>
        <div className="min-w-0 flex-1">
          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${config.color}`}>
            {config.label}
          </span>
          <p className="mt-1 text-sm text-lc-text">{recommendation.reason}</p>
          <p className="mt-2 text-xs font-medium text-lc-accent">Open lesson →</p>
          <p className="mt-0.5 text-xs text-lc-muted/50 break-all">
            {recommendation.moduleId
              ? `${recommendation.pathId} → ${recommendation.moduleId}`
              : recommendation.pathId}
          </p>
        </div>
      </div>
    </Link>
  );
}
