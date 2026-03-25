import { useEffect, useState } from 'react';
import LearningPathCard from './LearningPathCard';
import type { LearningPath } from '../../types';

interface CatalogCategory {
  id: string;
  name: string;
  description: string;
  paths: string[];
}

interface CatalogResponse {
  categories: CatalogCategory[];
}

const ALL_CATEGORY = 'all';

export default function TopicCatalog() {
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [pathDetails, setPathDetails] = useState<Record<string, LearningPath>>({});
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchCatalog() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch('/api/catalog');
        if (!res.ok) throw new Error('Failed to load catalog');
        const data: CatalogResponse = await res.json();

        if (cancelled) return;
        setCategories(data.categories);

        // Collect unique path IDs across all categories
        const uniquePathIds = Array.from(
          new Set(data.categories.flatMap((c) => c.paths)),
        );

        // Fetch all path details in parallel
        const results = await Promise.allSettled(
          uniquePathIds.map(async (pathId) => {
            const r = await fetch(`/api/paths/${pathId}`);
            if (!r.ok) return null;
            return (await r.json()) as LearningPath;
          }),
        );

        if (cancelled) return;

        const details: Record<string, LearningPath> = {};
        results.forEach((result) => {
          if (result.status === 'fulfilled' && result.value) {
            details[result.value.id] = result.value;
          }
        });
        setPathDetails(details);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Something went wrong');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchCatalog();
    return () => { cancelled = true; };
  }, []);

  // Determine which paths to show based on active category
  const visiblePaths: LearningPath[] =
    activeCategory === ALL_CATEGORY
      ? Object.values(pathDetails)
      : (categories
          .find((c) => c.id === activeCategory)
          ?.paths.map((pid) => pathDetails[pid])
          .filter(Boolean) as LearningPath[]) ?? [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16" role="status">
        <span className="text-lc-muted">Loading catalog…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-lc-red/30 bg-lc-red/10 p-6 text-center" role="alert">
        <p className="text-lc-red">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 rounded bg-lc-red px-4 py-2 text-sm font-medium text-lc-bg hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-lc-red focus-visible:ring-offset-2 focus-visible:ring-offset-lc-bg"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Category tabs */}
      <nav aria-label="Category filter" className="mb-6">
        <ul className="flex flex-wrap gap-2" role="tablist">
          <li role="presentation">
            <button
              role="tab"
              aria-selected={activeCategory === ALL_CATEGORY}
              onClick={() => setActiveCategory(ALL_CATEGORY)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-lc-accent focus-visible:ring-offset-2 focus-visible:ring-offset-lc-bg ${
                activeCategory === ALL_CATEGORY
                  ? 'bg-lc-accent text-lc-bg'
                  : 'bg-lc-surface2 text-lc-muted hover:bg-lc-hover'
              }`}
            >
              All
            </button>
          </li>
          {categories.map((cat) => (
            <li key={cat.id} role="presentation">
              <button
                role="tab"
                aria-selected={activeCategory === cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-lc-accent focus-visible:ring-offset-2 focus-visible:ring-offset-lc-bg ${
                  activeCategory === cat.id
                    ? 'bg-lc-accent text-lc-bg'
                    : 'bg-lc-surface2 text-lc-muted hover:bg-lc-hover'
                }`}
              >
                {cat.name}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Path cards grid */}
      <div
        role="tabpanel"
        aria-label={`${activeCategory === ALL_CATEGORY ? 'All' : categories.find((c) => c.id === activeCategory)?.name} learning paths`}
        className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
      >
        {visiblePaths.length === 0 ? (
          <p className="col-span-full text-center text-lc-muted py-8">
            No learning paths available in this category yet.
          </p>
        ) : (
          visiblePaths.map((path) => (
            <LearningPathCard
              key={path.id}
              id={path.id}
              title={path.title}
              description={path.description}
              estimatedDuration={path.estimatedDuration}
              difficulty={path.difficulty}
            />
          ))
        )}
      </div>
    </div>
  );
}
