import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCatalog, getPath } from '../../services/api';
import { getProfile, getProgress, getCompletionPercentage } from '../../services/progressStore';
import type { LearnerProgress, LearningPath, SkillLevel } from '../../types';
import type { CatalogResponse } from '../../services/api';
import ProgressBar from '../common/ProgressBar';
import AIInstructorPanel from '../AIInstructor/AIInstructorPanel';
import CareerPathCard from './CareerPathCard';
import LeaderboardCard from './LeaderboardCard';
import ActivityFeed from '../Feed/ActivityFeed';
import BadgeGrid from '../Badges/BadgeGrid';

const SKILL_ORDER: Record<SkillLevel, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

/**
 * Whether a path is appropriate for the learner's tier.
 * Beginners may access beginner and intermediate paths (most catalog content).
 * Intermediate learners exclude only advanced-only paths; advanced learners see all.
 */
export function difficultyMatches(pathDifficulty: SkillLevel, learnerLevel: SkillLevel): boolean {
  const p = SKILL_ORDER[pathDifficulty];
  if (learnerLevel === 'beginner') {
    return p <= SKILL_ORDER.intermediate;
  }
  return p <= SKILL_ORDER[learnerLevel];
}

/** Return true when at least one learner interest matches the category name (case-insensitive substring). */
export function interestMatchesCategory(interests: string[], categoryName: string): boolean {
  const lower = categoryName.toLowerCase();
  return interests.some((i) => lower.includes(i.toLowerCase()) || i.toLowerCase().includes(lower));
}

export default function Dashboard() {
  const profile = getProfile();
  const [progress, setProgress] = useState<LearnerProgress>(() => getProgress());
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [pathDetails, setPathDetails] = useState<Record<string, LearningPath>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setProgress(getProgress());
  }, []);

  // Fetch catalog and resolve path details for in-progress + recommended paths
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const cat = await getCatalog();
        if (cancelled) return;
        setCatalog(cat);

        // Collect all path IDs we need details for
        const allPathIds = new Set<string>();
        cat.categories.forEach((c) => c.paths.forEach((p) => allPathIds.add(p)));

        const details: Record<string, LearningPath> = {};
        await Promise.all(
          [...allPathIds].map(async (pid) => {
            try {
              const p = await getPath(pid);
              if (!cancelled) details[pid] = p;
            } catch {
              // skip paths that fail to load
            }
          }),
        );
        if (!cancelled) {
          setPathDetails(details);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError('Unable to load catalog. Please try again.');
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  if (!profile) {
    return (
      <section aria-label="Dashboard" className="text-center py-12">
        <h1 className="text-2xl font-bold text-lc-text mb-2">Welcome to TechLab</h1>
        <p className="text-lc-muted">Please complete onboarding to get personalized recommendations.</p>
      </section>
    );
  }

  if (loading) {
    return (
      <section aria-label="Dashboard" className="py-8">
        <p className="text-lc-muted">Loading your dashboard…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section aria-label="Dashboard" className="py-8">
        <p className="text-lc-red">{error}</p>
      </section>
    );
  }

  // --- Derive in-progress paths ---
  const inProgressPathIds = Object.keys(progress.currentModule);
  const inProgressPaths = inProgressPathIds
    .map((pid) => pathDetails[pid])
    .filter(Boolean) as LearningPath[];

  // --- Derive recommended paths ---
  const recommendedPaths: LearningPath[] = [];
  const exploreAllTopics = profile.interests.length === 0;
  if (catalog) {
    const matchingCategories = catalog.categories.filter((cat) =>
      exploreAllTopics || interestMatchesCategory(profile.interests, cat.name),
    );
    const matchingPathIds = new Set(matchingCategories.flatMap((c) => c.paths));

    for (const pid of matchingPathIds) {
      const path = pathDetails[pid];
      if (path && difficultyMatches(path.difficulty, profile.skillLevel)) {
        // Don't recommend paths already in progress
        if (!inProgressPathIds.includes(pid)) {
          recommendedPaths.push(path);
        }
      }
    }
  }

  return (
    <section aria-label="Dashboard" className="space-y-10">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-lc-text">Welcome back!</h1>
        <p className="mt-1 text-lc-muted">
          Skill level: <span className="font-medium capitalize">{profile.skillLevel}</span>
        </p>
      </div>

      {/* Career Path Recommendation */}
      <CareerPathCard />

      {/* AI Instructor Panel */}
      <AIInstructorPanel />

      {/* Badges */}
      <BadgeGrid compact />

      {/* Leaderboard + Feed */}
      <div className="grid gap-6 md:grid-cols-2">
        <LeaderboardCard />
        <ActivityFeed />
      </div>

      {/* In Progress Section */}
      {inProgressPaths.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-lc-text mb-4">In Progress</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {inProgressPaths.map((path) => {
              const pct = getCompletionPercentage(path.id, path.modules.length);
              const currentModuleId = progress.currentModule[path.id];
              const currentModule = path.modules.find((m) => m.id === currentModuleId);

              return (
                <div
                  key={path.id}
                  className="rounded-lg border border-lc-border bg-lc-surface p-5 shadow-sm transition-colors hover:border-lc-accent/40 hover:bg-lc-hover"
                >
                  <h3 className="text-lg font-semibold text-lc-text">{path.title}</h3>
                  <p className="mt-1 text-sm text-lc-muted line-clamp-2">{path.description}</p>
                  <div className="mt-3">
                    <ProgressBar percentage={pct} label={`${path.title} progress`} />
                  </div>
                  <Link
                    to={
                      currentModuleId
                        ? `/paths/${path.id}/modules/${currentModuleId}`
                        : `/paths/${path.id}`
                    }
                    className="mt-3 inline-block text-sm font-medium text-lc-accent hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-lc-accent focus-visible:ring-offset-2 focus-visible:ring-offset-lc-bg"
                    aria-label={`Continue ${path.title}${currentModule ? ` — ${currentModule.title}` : ''}`}
                  >
                    Continue where you left off →
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recommended Section */}
      {recommendedPaths.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-lc-text mb-4">
            {exploreAllTopics ? 'Explore topics' : 'Recommended for you'}
          </h2>
          {exploreAllTopics && (
            <p className="text-sm text-lc-muted mb-4">
              You have not selected interests yet — here are paths that match your skill level. You can also browse the full catalog.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recommendedPaths.map((path) => (
              <Link
                key={path.id}
                to={`/paths/${path.id}`}
                className="block rounded-lg border border-lc-border bg-lc-surface p-5 shadow-sm transition-colors transition-shadow hover:border-lc-accent/40 hover:bg-lc-hover hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-lc-accent focus-visible:ring-offset-2 focus-visible:ring-offset-lc-bg"
                aria-label={`${path.title} — ${path.difficulty} — ${path.estimatedDuration}`}
              >
                <h3 className="text-lg font-semibold text-lc-text">{path.title}</h3>
                <p className="mt-1 text-sm text-lc-muted line-clamp-2">{path.description}</p>
                <div className="mt-3 flex items-center gap-3">
                  <span className="inline-block rounded-full bg-lc-accent/15 px-2.5 py-0.5 text-xs font-medium capitalize text-lc-accent">
                    {path.difficulty}
                  </span>
                  <span className="text-xs text-lc-muted">{path.estimatedDuration}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {inProgressPaths.length === 0 && recommendedPaths.length === 0 && (
        <div className="text-center py-8">
          <p className="text-lc-muted">No recommendations yet. Browse the catalog to get started!</p>
          <Link
            to="/catalog"
            className="mt-3 inline-block rounded-lg bg-lc-accent px-4 py-2 text-sm font-medium text-lc-bg hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-lc-accent focus-visible:ring-offset-2 focus-visible:ring-offset-lc-bg"
          >
            Browse Catalog
          </Link>
        </div>
      )}
    </section>
  );
}
