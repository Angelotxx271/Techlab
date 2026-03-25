import { useEffect, useState } from 'react';
import { getInstructorGuidance } from '../../services/api';
import { getProgress, getProfile } from '../../services/progressStore';
import type { InstructorGuidance } from '../../types';
import Markdown from '../common/Markdown';
import RecommendationCard from './RecommendationCard';

const GUIDANCE_CACHE_KEY = 'instructorGuidance';

const FALLBACK_GUIDANCE: InstructorGuidance = {
  progressSummary: 'Keep going — every module you complete builds your skills!',
  weakAreas: [],
  recommendations: [],
  motivationalMessage: 'You are making progress. Keep it up!',
};

function getCachedGuidance(): InstructorGuidance | null {
  try {
    const raw = localStorage.getItem(GUIDANCE_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as InstructorGuidance;
  } catch { return null; }
}

function cacheGuidance(g: InstructorGuidance): void {
  try { localStorage.setItem(GUIDANCE_CACHE_KEY, JSON.stringify(g)); } catch { /* ignore */ }
}

export default function AIInstructorPanel() {
  const cached = getCachedGuidance();
  const [guidance, setGuidance] = useState<InstructorGuidance | null>(cached);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchGuidance() {
      const profile = getProfile();
      const progress = getProgress();

      try {
        const result = await getInstructorGuidance({
          completed_modules: progress.completedModules,
          current_module: progress.currentModule,
          exercise_accuracy: progress.exerciseAccuracy,
          interests: profile?.interests ?? [],
          skill_level: profile?.skillLevel ?? 'intermediate',
          last_activity_timestamp: progress.lastActivityTimestamp,
        });
        if (!cancelled) {
          setGuidance(result);
          cacheGuidance(result);
          setError(false);
        }
      } catch {
        if (!cancelled && !cached) {
          setGuidance(FALLBACK_GUIDANCE);
          setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchGuidance();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <section aria-label="AI Instructor" className="rounded-lg border border-lc-border bg-lc-surface p-6 shadow-sm">
        <p className="text-lc-accent">Loading AI Instructor guidance…</p>
      </section>
    );
  }

  if (!guidance) return null;

  return (
    <section aria-label="AI Instructor" className="rounded-lg border border-lc-border bg-lc-surface p-6 shadow-sm space-y-5">
      <h2 className="text-xl font-semibold text-lc-text">AI Instructor</h2>

      {error && (
        <p className="text-sm text-lc-accent" role="alert">
          AI Instructor is currently unavailable. Showing general guidance.
        </p>
      )}

      {/* Progress Summary */}
      <div>
        <h3 className="text-sm font-medium text-lc-muted uppercase tracking-wide">Progress Summary</h3>
        <div className="mt-1 text-lc-text"><Markdown>{guidance.progressSummary}</Markdown></div>
      </div>

      {/* Re-engagement Message */}
      {guidance.reEngagementMessage && (
        <div className="rounded-md bg-lc-accent/10 p-3">
          <div className="text-sm text-lc-accent"><Markdown>{guidance.reEngagementMessage}</Markdown></div>
        </div>
      )}

      {/* Weak Areas */}
      {guidance.weakAreas.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-lc-muted uppercase tracking-wide">Areas to Improve</h3>
          <ul className="mt-2 space-y-1">
            {guidance.weakAreas.map((area) => (
              <li key={`${area.pathId}-${area.moduleId}`} className="flex items-center gap-2 text-sm text-lc-accent">
                <span aria-hidden="true">⚠</span>
                <span>{area.moduleTitle} — {Math.round(area.accuracy * 100)}% accuracy</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {guidance.recommendations.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-lc-muted uppercase tracking-wide">Recommendations</h3>
          <div className="mt-2 space-y-2">
            {guidance.recommendations.map((rec, i) => (
              <RecommendationCard key={i} recommendation={rec} />
            ))}
          </div>
        </div>
      )}

      {/* Motivational Message */}
      <div className="rounded-md bg-lc-green/10 p-3">
        <div className="text-sm text-lc-green"><Markdown>{guidance.motivationalMessage}</Markdown></div>
      </div>
    </section>
  );
}
