import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getPath } from '../services/api';
import { getProgress, getCompletionPercentage } from '../services/progressStore';
import type { LearningPath } from '../types';
import ProgressBar from '../components/common/ProgressBar';

export default function LearningPathDetail() {
  const { pathId } = useParams<{ pathId: string }>();
  const [path, setPath] = useState<LearningPath | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pathId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const p = await getPath(pathId!);
        if (!cancelled) setPath(p);
      } catch {
        if (!cancelled) {
          setPath(null);
          setError('This learning path could not be loaded. It may be unavailable or your connection failed.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [pathId]);

  const progress = getProgress();
  const completedForPath = pathId ? progress.completedModules[pathId] ?? [] : [];
  const sortedModules =
    path?.modules.slice().sort((a, b) => a.order - b.order) ?? [];

  if (!pathId) {
    return (
      <section aria-label="Learning path">
        <p className="text-lc-muted">Invalid path.</p>
        <Link to="/catalog" className="mt-2 inline-block text-lc-accent hover:underline">
          ← Catalog
        </Link>
      </section>
    );
  }

  if (loading) {
    return (
      <section aria-label="Learning path" className="py-12">
        <div className="animate-pulse space-y-4 max-w-2xl">
          <div className="h-4 w-32 rounded bg-lc-surface2" />
          <div className="h-10 max-w-xl rounded bg-lc-surface2" />
          <div className="h-20 rounded bg-lc-surface2" />
        </div>
        <p className="mt-4 text-sm text-lc-muted">Loading modules…</p>
      </section>
    );
  }

  if (error || !path) {
    return (
      <section aria-label="Learning path error" className="max-w-2xl space-y-4">
        <p className="rounded-lg bg-lc-red/10 px-3 py-2 text-lc-red">{error}</p>
        <Link
          to="/catalog"
          className="inline-flex items-center gap-2 rounded-lg border border-lc-border bg-lc-surface px-4 py-2 text-sm font-medium text-lc-text shadow-sm hover:bg-lc-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-lc-accent focus-visible:ring-offset-2 focus-visible:ring-offset-lc-bg"
        >
          ← Back to catalog
        </Link>
      </section>
    );
  }

  const pct = getCompletionPercentage(path.id, path.modules.length);

  return (
    <section aria-label="Learning path detail" className="max-w-3xl space-y-10">
      <nav aria-label="Breadcrumb" className="text-sm text-lc-muted">
        <Link to="/catalog" className="font-medium text-lc-accent hover:underline">
          Catalog
        </Link>
        <span aria-hidden="true" className="mx-2 text-lc-border">
          /
        </span>
        <span className="text-lc-text">{path.title}</span>
      </nav>

      <header className="rounded-2xl border border-lc-border bg-lc-surface p-6 shadow-sm sm:p-8">
        <h1 className="text-3xl font-bold tracking-tight text-lc-text sm:text-4xl">{path.title}</h1>
        <p className="mt-3 text-base leading-relaxed text-lc-muted">{path.description}</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center rounded-full bg-lc-accent/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-lc-accent">
            {path.difficulty}
          </span>
          <span className="text-sm text-lc-muted">{path.estimatedDuration}</span>
          <span className="text-sm text-lc-muted">
            {path.modules.length} module{path.modules.length === 1 ? '' : 's'}
          </span>
        </div>
      </header>

      <div className="rounded-xl border border-lc-border bg-lc-surface p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-lc-muted">Your progress</h2>
        <div className="mt-3">
          <ProgressBar percentage={pct} label={`${path.title} progress`} />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-lc-text">Modules</h2>
        <p className="mt-1 text-sm text-lc-muted">Open a module to read the concept and complete exercises.</p>
        <ol className="mt-5 space-y-3" role="list">
          {sortedModules.map((m, i) => {
            const done = completedForPath.includes(m.id);
            return (
              <li key={m.id}>
                <Link
                  to={`/paths/${path.id}/modules/${m.id}`}
                  className="group flex items-start justify-between gap-4 rounded-xl border border-lc-border bg-lc-surface p-4 shadow-sm transition-all hover:border-lc-accent/40 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-lc-accent focus-visible:ring-offset-2 focus-visible:ring-offset-lc-bg"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-medium text-lc-muted">Module {i + 1}</span>
                    <h3 className="font-semibold text-lc-text group-hover:text-lc-accent">{m.title}</h3>
                  </div>
                  <span
                    className={
                      done
                        ? 'shrink-0 rounded-full bg-lc-green/20 px-2.5 py-1 text-xs font-medium text-lc-green'
                        : 'shrink-0 rounded-full bg-lc-surface2 px-2.5 py-1 text-xs font-medium text-lc-muted'
                    }
                  >
                    {done ? 'Done' : 'Open'}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
