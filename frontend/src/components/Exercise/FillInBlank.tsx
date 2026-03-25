import { useState } from 'react';
import type { Exercise } from '../../types';

export interface FillInBlankProps {
  exercise: Exercise;
  onSubmit: (answer: string) => void;
  disabled: boolean;
}

export default function FillInBlank({ exercise, onSubmit, disabled }: FillInBlankProps) {
  const [answer, setAnswer] = useState('');

  function handleSubmit() {
    const trimmed = answer.trim();
    if (trimmed) onSubmit(trimmed);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && answer.trim() && !disabled) {
      handleSubmit();
    }
  }

  return (
    <div>
      <p className="text-lg font-medium text-lc-text mb-4">{exercise.question}</p>

      <label htmlFor={`fib-${exercise.id}`} className="sr-only">
        Your answer
      </label>
      <input
        id={`fib-${exercise.id}`}
        type="text"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Type your answer…"
        className="w-full rounded-lg border border-lc-border bg-lc-surface2 px-4 py-2 text-lc-text placeholder:text-lc-muted focus:border-lc-accent focus:outline-none focus:ring-1 focus:ring-lc-accent disabled:opacity-60 disabled:cursor-not-allowed"
        aria-label="Fill in the blank answer"
      />

      <button
        type="button"
        onClick={handleSubmit}
        disabled={disabled || !answer.trim()}
        className="mt-4 rounded-lg bg-lc-accent px-5 py-2 text-sm font-medium text-lc-bg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-lc-accent focus-visible:ring-offset-2 focus-visible:ring-offset-lc-bg"
        aria-label="Submit answer"
      >
        Submit
      </button>
    </div>
  );
}
