import { useState } from 'react';
import type { Exercise, SkillLevel, EvaluationResult } from '../../types';
import { evaluateExercise, getHint } from '../../services/api';
import MultipleChoice from './MultipleChoice';
import FillInBlank from './FillInBlank';
import CodeCompletion from './CodeCompletion';
import TrueFalse from './TrueFalse';
import CodeChallenge from './CodeChallenge';
import type { CodeChallengeExercise } from '../../types';
import Markdown from '../common/Markdown';

export interface ExerciseContainerProps {
  exercise: Exercise;
  skillLevel: SkillLevel;
  onComplete: () => void;
}

export default function ExerciseContainer({ exercise, skillLevel, onComplete }: ExerciseContainerProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [hintText, setHintText] = useState<string | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [hintError, setHintError] = useState<string | null>(null);
  const [attemptNumber, setAttemptNumber] = useState(1);

  const submitted = result !== null;

  async function handleSubmit(answer: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await evaluateExercise({
        exercise_id: exercise.id,
        exercise,
        user_answer: answer,
        skill_level: skillLevel,
      });
      setResult(res);
    } catch {
      setError('Failed to evaluate your answer. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleRetry() {
    setResult(null);
    setError(null);
    setHintText(null);
    setHintError(null);
  }

  async function handleGetHint() {
    setHintLoading(true);
    setHintError(null);
    try {
      const res = await getHint({
        exercise,
        attempt_number: attemptNumber,
        skill_level: skillLevel,
      });
      setHintText(res.hint);
      setAttemptNumber((n) => n + 1);
    } catch {
      setHintError('Failed to load hint. Please try again.');
    } finally {
      setHintLoading(false);
    }
  }

  function renderExercise() {
    const disabled = loading || submitted;
    const props = { exercise, onSubmit: handleSubmit, disabled };

    switch (exercise.type) {
      case 'multiple_choice':
        return <MultipleChoice {...props} />;
      case 'fill_in_blank':
        return <FillInBlank {...props} />;
      case 'code_completion':
        return <CodeCompletion {...props} />;
      case 'true_false':
        return <TrueFalse {...props} />;
      case 'code_challenge':
        return (
          <CodeChallenge
            exercise={exercise as CodeChallengeExercise}
            skillLevel={skillLevel}
            onComplete={onComplete}
          />
        );
      default:
        return <p className="text-lc-muted">Unsupported exercise type.</p>;
    }
  }

  // Show hint button before submission or after an incorrect answer
  const showHintButton = !loading && (!submitted || (submitted && !result?.correct));

  return (
    <article
      className="rounded-xl border border-lc-border bg-lc-surface p-6 shadow-sm"
      aria-label={`Exercise: ${exercise.question}`}
    >
      {renderExercise()}

      {loading && (
        <div className="mt-4 flex items-center gap-2 text-sm text-lc-muted" role="status" aria-live="polite">
          <svg className="h-4 w-4 animate-spin text-lc-accent" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          Evaluating…
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg bg-lc-red/10 p-3 text-sm text-lc-red" role="alert">
          {error}
          <button
            type="button"
            onClick={handleRetry}
            className="ml-2 underline hover:text-lc-red/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-lc-red focus-visible:ring-offset-2 focus-visible:ring-offset-lc-bg"
          >
            Retry
          </button>
        </div>
      )}

      {result && (
        <div
          className={`mt-4 rounded-lg p-4 ${
            result.correct ? 'bg-lc-green/10 border border-lc-green/30' : 'bg-lc-accent/10 border border-lc-accent/30'
          }`}
          role="alert"
          aria-live="polite"
        >
          <p className={`font-semibold ${result.correct ? 'text-lc-green' : 'text-lc-accent'}`}>
            {result.correct ? '✓ Correct!' : '✗ Incorrect'}
          </p>

          {!result.correct && result.feedback && (
            <div className="mt-2 rounded-md bg-lc-accent/15 p-3 border border-lc-accent/30">
              <p className="text-sm font-medium text-lc-accent mb-1">Feedback</p>
              <div className="text-sm"><Markdown>{result.feedback}</Markdown></div>
            </div>
          )}

          {result.correct && result.feedback && (
            <div className="mt-1 text-sm text-lc-green"><Markdown>{result.feedback}</Markdown></div>
          )}

          {result.hint && (
            <div className="mt-2 text-sm text-lc-muted italic"><Markdown>{`**Hint:** ${result.hint}`}</Markdown></div>
          )}

          <div className="mt-3">
            {result.correct ? (
              <button
                type="button"
                onClick={onComplete}
                className="rounded-lg bg-lc-green px-5 py-2 text-sm font-medium text-lc-bg hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-lc-green focus-visible:ring-offset-2 focus-visible:ring-offset-lc-bg"
                aria-label="Continue to next exercise"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRetry}
                className="rounded-lg bg-lc-accent px-5 py-2 text-sm font-medium text-lc-bg hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-lc-accent focus-visible:ring-offset-2 focus-visible:ring-offset-lc-bg"
                aria-label="Try again"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      )}

      {/* Hint section */}
      {showHintButton && (
        <div className="mt-4">
          <button
            type="button"
            onClick={handleGetHint}
            disabled={hintLoading}
            className="rounded-lg border border-lc-border bg-lc-surface2 px-4 py-2 text-sm font-medium text-lc-muted hover:bg-lc-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-lc-accent focus-visible:ring-offset-2 focus-visible:ring-offset-lc-bg disabled:opacity-50"
            aria-label="Get a hint"
          >
            {hintLoading ? 'Loading hint…' : '💡 Get a hint'}
          </button>
        </div>
      )}

      {hintText && (
        <div className="mt-3 rounded-lg bg-lc-surface2 border border-lc-border p-3" aria-live="polite">
          <p className="text-sm font-medium text-lc-text mb-1">Hint</p>
          <div className="text-sm text-lc-muted"><Markdown>{hintText}</Markdown></div>
        </div>
      )}

      {hintError && (
        <div className="mt-3 rounded-lg bg-lc-red/10 p-3 text-sm text-lc-red" role="alert">
          {hintError}
        </div>
      )}
    </article>
  );
}
