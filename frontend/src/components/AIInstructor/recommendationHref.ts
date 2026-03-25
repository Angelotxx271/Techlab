import type { NextStepRecommendation } from '../../types';

/** Build the SPA route for a recommendation (path overview or specific module). */
export function recommendationToHref(rec: NextStepRecommendation): string {
  const pid = encodeURIComponent(rec.pathId);
  if (rec.moduleId) {
    return `/paths/${pid}/modules/${encodeURIComponent(rec.moduleId)}`;
  }
  return `/paths/${pid}`;
}
