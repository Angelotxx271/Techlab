import { useState } from 'react';
import type { Flashcard } from '../../types';

interface FlashcardDeckProps {
  cards: Flashcard[];
}

export default function FlashcardDeck({ cards }: FlashcardDeckProps) {
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (cards.length === 0) return null;

  const card = cards[current];

  function next() {
    setFlipped(false);
    setCurrent((i) => (i + 1) % cards.length);
  }

  function prev() {
    setFlipped(false);
    setCurrent((i) => (i - 1 + cards.length) % cards.length);
  }

  return (
    <div>
      <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-lc-muted">
        Flashcards
      </h3>

      <div
        className="group relative cursor-pointer select-none"
        onClick={() => setFlipped(!flipped)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setFlipped(!flipped); } }}
        aria-label={flipped ? 'Click to see question' : 'Click to reveal answer'}
      >
        <div className="relative min-h-[180px] rounded-xl border border-lc-border bg-lc-surface2 p-6 transition-all duration-300">
          {/* Front */}
          <div className={`transition-opacity duration-200 ${flipped ? 'opacity-0' : 'opacity-100'}`}>
            <p className="text-xs font-medium uppercase tracking-wider text-lc-accent">Question</p>
            <p className="mt-3 text-lg font-medium text-lc-text">{card.front}</p>
          </div>
          {/* Back */}
          <div className={`absolute inset-0 flex flex-col justify-center p-6 transition-opacity duration-200 ${flipped ? 'opacity-100' : 'opacity-0'}`}>
            <p className="text-xs font-medium uppercase tracking-wider text-lc-green">Answer</p>
            <p className="mt-3 text-lg text-lc-text">{card.back}</p>
          </div>
        </div>
        <p className="mt-2 text-center text-xs text-lc-muted">
          {flipped ? 'Click to flip back' : 'Click to reveal answer'}
        </p>
      </div>

      {/* Navigation */}
      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={(e) => { e.stopPropagation(); prev(); }}
          className="rounded-lg border border-lc-border px-4 py-2 text-sm font-medium text-lc-muted hover:bg-lc-hover hover:text-lc-text"
        >
          Previous
        </button>
        <span className="text-sm text-lc-muted">
          {current + 1} / {cards.length}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); next(); }}
          className="rounded-lg border border-lc-border px-4 py-2 text-sm font-medium text-lc-muted hover:bg-lc-hover hover:text-lc-text"
        >
          Next
        </button>
      </div>
    </div>
  );
}
