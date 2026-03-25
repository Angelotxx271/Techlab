import { useState } from 'react';
import type { KeyTerm } from '../../types';

interface KeyConceptsProps {
  terms: KeyTerm[];
}

export default function KeyConcepts({ terms }: KeyConceptsProps) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (terms.length === 0) return null;

  return (
    <div>
      <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-lc-muted">
        Key Concepts
      </h3>
      <div className="space-y-2">
        {terms.map((t, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setExpanded(expanded === i ? null : i)}
            className="w-full rounded-lg border border-lc-border bg-lc-surface2 px-4 py-3 text-left transition-colors hover:border-lc-accent/40"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-lc-text">{t.term}</span>
              <svg
                className={`h-4 w-4 text-lc-muted transition-transform ${expanded === i ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {expanded === i && (
              <p className="mt-2 text-sm leading-relaxed text-lc-muted">{t.definition}</p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
