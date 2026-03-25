import { useState } from 'react';
import type { Exercise } from '../../types';

export interface TrueFalseProps {
  exercise: Exercise;
  onSubmit: (answer: string) => void;
  disabled: boolean;
}

export default function TrueFalse({ exercise, onSubmit, disabled }: TrueFalseProps) {
  const [selected, setSelected] = useState<string | null>(null);

  function handleSubmit() {
    if (selected) onSubmit(selected);
  }

  return (
    <div>
      <p className="text-lg font-medium text-lc-text mb-4">{exercise.question}</p>

      <fieldset disabled={disabled}>
        <legend className="sr-only">Select True or False</legend>
        <div className="flex gap-3" role="radiogroup" aria-label="True or False">
          {['True', 'False'].map((value) => (
            <label
              key={value}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors ${
                selected === value
                  ? 'border-lc-accent bg-lc-accent/10'
                  : 'border-lc-border hover:border-lc-accent/40'
              } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <input
                type="radio"
                name={`tf-${exercise.id}`}
                value={value}
                checked={selected === value}
                onChange={() => setSelected(value)}
                className="accent-lc-accent"
                aria-label={value}
              />
              <span className="text-lc-text font-medium">{value}</span>
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
