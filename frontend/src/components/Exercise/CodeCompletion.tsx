import { useState } from 'react';
import type { Exercise } from '../../types';

export interface CodeCompletionProps {
  exercise: Exercise;
  onSubmit: (answer: string) => void;
  disabled: boolean;
}

export default function CodeCompletion({ exercise, onSubmit, disabled }: CodeCompletionProps) {
  const [code, setCode] = useState(exercise.codeTemplate ?? '');

  function handleSubmit() {
    const trimmed = code.trim();
    if (trimmed) onSubmit(trimmed);
  }

  return (
    <div>
      <p className="text-lg font-medium text-lc-text mb-4">{exercise.question}</p>

      <label htmlFor={`cc-${exercise.id}`} className="sr-only">
        Code answer
      </label>
      <textarea
        id={`cc-${exercise.id}`}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        disabled={disabled}
        rows={6}
        className="w-full rounded-lg border border-lc-border bg-lc-code px-4 py-3 font-mono text-sm text-lc-text placeholder:text-lc-muted focus:border-lc-accent focus:outline-none focus:ring-1 focus:ring-lc-accent disabled:opacity-60 disabled:cursor-not-allowed"
        aria-label="Code completion answer"
        spellCheck={false}
      />

      <button
        type="button"
        onClick={handleSubmit}
        disabled={disabled || !code.trim()}
        className="mt-4 rounded-lg bg-lc-accent px-5 py-2 text-sm font-medium text-lc-bg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-lc-accent focus-visible:ring-offset-2 focus-visible:ring-offset-lc-bg"
        aria-label="Submit answer"
      >
        Submit
      </button>
    </div>
  );
}
