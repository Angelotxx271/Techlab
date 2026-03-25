import { useState } from 'react';
import type { Exercise } from '../../types';

export interface MultipleChoiceProps {
  exercise: Exercise;
  onSubmit: (answer: string) => void;
  disabled: boolean;
}

export default function MultipleChoice({ exercise, onSubmit, disabled }: MultipleChoiceProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const options = exercise.options ?? [];

  function handleSubmit() {
    if (selected) onSubmit(selected);
  }

  return (
    <div>
      <p className="text-lg font-medium text-lc-text mb-4">{exercise.question}</p>

      <fieldset disabled={disabled}>
        <legend className="sr-only">Choose an answer</legend>
        <div className="space-y-2" role="radiogroup" aria-label="Answer options">
          {options.map((option) => (
            <label
              key={option}
              className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                selected === option
                  ? 'border-lc-accent bg-lc-accent/10'
                  : 'border-lc-border hover:border-lc-accent/40'
              } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <input
                type="radio"
                name={`mc-${exercise.id}`}
                value={option}
                checked={selected === option}
                onChange={() => setSelected(option)}
                className="accent-lc-accent"
                aria-label={option}
              />
              <span className="text-lc-text">{option}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={disabled || !selected}
        className="mt-4 rounded-lg bg-lc-accent px-5 py-2 text-sm font-medium text-lc-bg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-lc-accent focus-visible:ring-offset-2 focus-visible:ring-offset-lc-bg"
        aria-label="Submit answer"
      >
        Submit
      </button>
    </div>
  );
}
