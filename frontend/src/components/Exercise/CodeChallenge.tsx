import { useState } from 'react';
import type { CodeChallengeExercise, ChallengeLanguage, ChallengeResult } from '../../types';
import { submitChallenge, getHint } from '../../services/api';
import type { SkillLevel } from '../../types';

export interface CodeChallengeProps {
  exercise: CodeChallengeExercise;
  skillLevel: SkillLevel;
  onComplete: () => void;
}

export default function CodeChallenge({ exercise, skillLevel, onComplete }: CodeChallengeProps) {
  const [language, setLanguage] = useState<ChallengeLanguage>(
    exercise.supportedLanguages[0] ?? 'python',
  );
  const [code, setCode] = useState(exercise.starterTemplate[language] ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ChallengeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [hintText, setHintText] = useState<string | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [hintError, setHintError] = useState<string | null>(null);
  const [attemptNumber, setAttemptNumber] = useState(1);

  function handleLanguageChange(lang: ChallengeLanguage) {
    setLanguage(lang);
    setCode(exercise.starterTemplate[lang] ?? '');
    setResult(null);
    setError(null);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const res = await submitChallenge({
        exercise_id: exercise.id,
        code,
        language,
        test_cases: exercise.testCases.map((tc) => ({
          id: tc.id,
          input: tc.input,
          expected_output: tc.expectedOutput,
          is_hidden: tc.isHidden,
        })),
      });
      setResult(res);
    } catch {
      setError('Failed to submit your solution. Please try again.');
    } finally {
      setSubmitting(false);
    }
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

  const visibleTestCases = exercise.testCases.filter((tc) => !tc.isHidden);

  return (
    <div className="space-y-6">
      {/* Problem statement */}
      <div>
        <h3 className="text-xl font-bold text-lc-text mb-2">Problem</h3>
        <p className="text-lc-muted whitespace-pre-wrap">{exercise.problemStatement}</p>
      </div>

      {/* Input/Output specification */}
      <div>
        <h4 className="text-md font-semibold text-lc-text mb-1">Input / Output</h4>
        <pre className="rounded-lg bg-lc-code p-4 text-sm text-lc-text whitespace-pre-wrap font-mono">
          {exercise.inputOutputSpec}
        </pre>
      </div>

      {/* Visible test cases */}
      {visibleTestCases.length > 0 && (
        <div>
          <h4 className="text-md font-semibold text-lc-text mb-2">Example Test Cases</h4>
          <div className="space-y-2">
            {visibleTestCases.map((tc) => (
              <div key={tc.id} className="rounded-lg border border-lc-border bg-lc-surface2 p-3 text-sm font-mono">
                <div><span className="font-semibold text-lc-muted">Input:</span> {tc.input}</div>
                <div><span className="font-semibold text-lc-muted">Expected:</span> {tc.expectedOutput}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Language selector */}
      <div className="flex items-center gap-3">
        <label htmlFor="language-select" className="text-sm font-medium text-lc-muted">
          Language:
        </label>
        <select
          id="language-select"
          value={language}
          onChange={(e) => handleLanguageChange(e.target.value as ChallengeLanguage)}
          disabled={submitting}
          className="rounded-lg border border-lc-border bg-lc-surface2 px-3 py-1.5 text-sm text-lc-text focus:border-lc-accent focus:outline-none focus:ring-1 focus:ring-lc-accent"
          aria-label="Select programming language"
        >
          {exercise.supportedLanguages.map((lang) => (
            <option key={lang} value={lang}>
              {lang === 'python' ? 'Python' : 'JavaScript'}
            </option>
          ))}
        </select>
      </div>

      {/* Code editor (textarea with monospace styling) */}
      <div>
        <label htmlFor="code-editor" className="sr-only">
          Code editor
        </label>
        <textarea
          id="code-editor"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          disabled={submitting}
          rows={12}
          className="w-full rounded-lg border border-lc-border bg-lc-code px-4 py-3 font-mono text-sm text-lc-text placeholder:text-lc-muted focus:border-lc-accent focus:outline-none focus:ring-1 focus:ring-lc-accent disabled:opacity-60 disabled:cursor-not-allowed"
          aria-label="Code editor"
          spellCheck={false}
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !code.trim()}
          className="rounded-lg bg-lc-accent px-5 py-2 text-sm font-medium text-lc-bg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-lc-accent focus-visible:ring-offset-2 focus-visible:ring-offset-lc-bg"
          aria-label="Submit solution"
        >
          {submitting ? 'Running tests…' : 'Submit Solution'}
        </button>

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

      {/* Submission error */}
      {error && (
        <div className="rounded-lg bg-lc-red/10 p-3 text-sm text-lc-red" role="alert">
          {error}
        </div>
      )}

      {/* Hint display */}
      {hintText && (
        <div className="rounded-lg bg-lc-surface2 border border-lc-border p-3" aria-live="polite">
          <p className="text-sm font-medium text-lc-text">Hint</p>
          <p className="mt-1 text-sm text-lc-muted">{hintText}</p>
        </div>
      )}

      {hintError && (
        <div className="rounded-lg bg-lc-red/10 p-3 text-sm text-lc-red" role="alert">
          {hintError}
        </div>
      )}

      {/* Results */}
      {result && (
        <div aria-live="polite">
          {result.error && (
            <div className="rounded-lg bg-lc-red/10 border border-lc-red/30 p-4 mb-4" role="alert">
              <p className="font-semibold text-lc-red">Runtime Error</p>
              <pre className="mt-1 text-sm text-lc-red whitespace-pre-wrap font-mono">{result.error}</pre>
            </div>
          )}

          {result.allPassed ? (
            <div className="rounded-lg bg-lc-green/10 border border-lc-green/30 p-4">
              <p className="font-semibold text-lc-green">✓ All tests passed!</p>
              {result.executionTimeMs != null && (
                <p className="mt-1 text-sm text-lc-green">
                  Execution time: {result.executionTimeMs.toFixed(1)} ms
                </p>
              )}
              <button
                type="button"
                onClick={onComplete}
                className="mt-3 rounded-lg bg-lc-green px-5 py-2 text-sm font-medium text-lc-bg hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-lc-green focus-visible:ring-offset-2 focus-visible:ring-offset-lc-bg"
                aria-label="Continue to next exercise"
              >
                Continue
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="font-semibold text-lc-accent">Test Results</p>
              {result.testCaseResults.map((tcr) => (
                <div
                  key={tcr.testCaseId}
                  className={`rounded-lg border p-3 text-sm font-mono ${
                    tcr.passed
                      ? 'border-lc-green/30 bg-lc-green/10 text-lc-green'
                      : 'border-lc-red/30 bg-lc-red/10 text-lc-red'
                  }`}
                >
                  <span className="font-semibold">{tcr.passed ? '✓' : '✗'} {tcr.testCaseId}</span>
                  {!tcr.passed && (
                    <div className="mt-1 space-y-0.5">
                      <div>Expected: {tcr.expectedOutput}</div>
                      <div>Actual: {tcr.actualOutput}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
