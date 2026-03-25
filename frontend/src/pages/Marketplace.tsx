import { useEffect, useState } from 'react';
import { getMarketplaceDevelopers, type DeveloperListItem } from '../services/api';
import DeveloperCard from '../components/Marketplace/DeveloperCard';
import DeveloperProfile from '../components/Marketplace/DeveloperProfile';

const SKILL_FILTERS = ['all', 'beginner', 'intermediate', 'advanced'] as const;

export default function Marketplace() {
  const [developers, setDevelopers] = useState<DeveloperListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [skillFilter, setSkillFilter] = useState<string>('all');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    const filters = skillFilter !== 'all' ? { skill_level: skillFilter } : undefined;
    setLoading(true);
    getMarketplaceDevelopers(filters)
      .then(setDevelopers)
      .catch(() => setDevelopers([]))
      .finally(() => setLoading(false));
  }, [skillFilter]);

  if (selectedUserId) {
    return (
      <DeveloperProfile
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
      />
    );
  }

  return (
    <section aria-label="Developer Marketplace">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight text-lc-text">
          Developer Marketplace
        </h1>
        <p className="mt-1 text-lc-muted">
          Browse skilled developers and their learning achievements.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center gap-2">
        <span className="text-xs text-lc-muted">Filter by skill:</span>
        {SKILL_FILTERS.map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => setSkillFilter(level)}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
              skillFilter === level
                ? 'bg-lc-accent text-lc-bg'
                : 'bg-lc-surface border border-lc-border text-lc-muted hover:border-lc-accent/40'
            }`}
          >
            {level}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <p className="text-lc-muted animate-pulse">Loading developers...</p>
        </div>
      ) : developers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-lc-border bg-lc-surface p-12 text-center">
          <p className="text-lc-muted">
            No public developer profiles yet. Complete modules and make your profile public to appear here!
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {developers.map((dev) => (
            <DeveloperCard
              key={dev.userId}
              developer={dev}
              onSelect={setSelectedUserId}
            />
          ))}
        </div>
      )}
    </section>
  );
}
