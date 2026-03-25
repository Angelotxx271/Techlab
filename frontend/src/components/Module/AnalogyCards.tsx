import type { Analogy } from '../../types';

interface AnalogyCardsProps {
  analogies: Analogy[];
}

export default function AnalogyCards({ analogies }: AnalogyCardsProps) {
  if (analogies.length === 0) return null;

  return (
    <div>
      <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-lc-muted">
        Real-World Analogies
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {analogies.map((a, i) => (
          <div
            key={i}
            className="rounded-xl border border-lc-border bg-lc-surface2 p-5"
          >
            <p className="text-sm font-bold text-lc-accent">{a.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-lc-text">{a.analogy}</p>
            <div className="mt-3 rounded-lg bg-lc-bg/60 p-3">
              <p className="text-xs font-medium text-lc-muted">How it maps:</p>
              <p className="mt-1 text-xs leading-relaxed text-lc-text/80">{a.explanation}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
