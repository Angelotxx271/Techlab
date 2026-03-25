import { useState, useEffect, useCallback, useRef } from 'react';
import type { Module, SkillLevel } from '../../types';
import { getModule, awardXP, awardBonusXP } from '../../services/api';
import {
  setCurrentModule, completeModule, updateExerciseAccuracy,
  getProgress, saveProgress, saveModuleState, getModuleState, clearModuleState,
} from '../../services/progressStore';
import { createAdaptiveState, recordResult, getDifficultySignal } from '../../services/adaptiveDifficulty';
import type { AdaptiveState, DifficultySignal } from '../../services/adaptiveDifficulty';
import { useUser } from '../../contexts/UserContext';
import ExerciseContainer from '../Exercise/ExerciseContainer';
import ExplanationPanel from './ExplanationPanel';
import PhaseIndicator from './PhaseIndicator';
import FlashcardDeck from './FlashcardDeck';
import AnalogyCards from './AnalogyCards';
import KeyConcepts from './KeyConcepts';
import TerminalPanel from '../Terminal/TerminalPanel';

export interface ModuleViewProps {
  pathId: string;
  moduleId: string;
}

type Phase = 'learn' | 'engage' | 'practice';

function getSkillLevel(): SkillLevel {
  try {
    const raw = localStorage.getItem('learnerProfile');
    if (raw) {
      const profile = JSON.parse(raw);
      if (
        profile.skillLevel === 'beginner' ||
        profile.skillLevel === 'intermediate' ||
        profile.skillLevel === 'advanced'
      ) {
        return profile.skillLevel;
      }
    }
  } catch { /* ignore */ }
  return 'intermediate';
}

export default function ModuleView({ pathId, moduleId }: ModuleViewProps) {
  const [module, setModule] = useState<Module | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('learn');
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [moduleComplete, setModuleComplete] = useState(false);
  const [adaptiveState, setAdaptiveState] = useState<AdaptiveState>(createAdaptiveState);
  const [difficultyPrompt, setDifficultyPrompt] = useState<DifficultySignal>(null);
  const [xpGain, setXpGain] = useState<number | null>(null);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const correctCountRef = useRef(0);
  const skillLevel = getSkillLevel();
  const { isLoggedIn, refreshXP } = useUser();

  const fetchModule = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getModule(pathId, moduleId);
      setModule(data);
    } catch {
      setError('Failed to load module content. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [pathId, moduleId]);

  useEffect(() => { fetchModule(); }, [fetchModule]);

  // Restore cached state or reset on module change
  useEffect(() => {
    const cached = getModuleState(pathId, moduleId);
    if (cached) {
      setPhase(cached.phase);
      setCurrentExerciseIndex(cached.exerciseIndex);
      correctCountRef.current = cached.correctCount;
      setAdaptiveState({
        consecutiveCorrect: cached.consecutiveCorrect,
        consecutiveIncorrect: cached.consecutiveIncorrect,
        totalCorrect: cached.correctCount,
        totalAnswered: cached.exerciseIndex,
      });
      setTimeout(() => window.scrollTo(0, cached.scrollY), 100);
    } else {
      setPhase('learn');
      setCurrentExerciseIndex(0);
      setModuleComplete(false);
      setAdaptiveState(createAdaptiveState());
      setDifficultyPrompt(null);
      correctCountRef.current = 0;
    }
  }, [pathId, moduleId]);

  // Save state on changes (debounced via effect)
  useEffect(() => {
    if (!module || moduleComplete) return;
    const timeout = setTimeout(() => {
      saveModuleState(pathId, moduleId, {
        phase,
        exerciseIndex: currentExerciseIndex,
        scrollY: window.scrollY,
        correctCount: correctCountRef.current,
        consecutiveCorrect: adaptiveState.consecutiveCorrect,
        consecutiveIncorrect: adaptiveState.consecutiveIncorrect,
      });
    }, 500);
    return () => clearTimeout(timeout);
  }, [phase, currentExerciseIndex, adaptiveState, module, moduleComplete, pathId, moduleId]);

  useEffect(() => {
    if (module) setCurrentModule(pathId, moduleId);
  }, [module, pathId, moduleId]);

  async function handleExerciseComplete() {
    if (!module) return;
    correctCountRef.current += 1;
    const newState = recordResult(adaptiveState, true);
    setAdaptiveState(newState);
    const signal = getDifficultySignal(newState);
    const nextIndex = currentExerciseIndex + 1;

    // Award XP
    if (isLoggedIn) {
      const exercise = module.exercises[currentExerciseIndex];
      try {
        const result = await awardXP({
          exercise_id: `${pathId}/${moduleId}/${exercise.id}`,
          difficulty: exercise.difficulty,
          exercise_type: exercise.type,
          context: `${pathId}/${moduleId}`,
        });
        if (result.awarded > 0) {
          setXpGain(result.awarded);
          setTimeout(() => setXpGain(null), 2000);
          refreshXP();
        }
      } catch { /* ignore */ }
    }

    if (nextIndex >= module.exercises.length) {
      completeModule(pathId, moduleId);
      updateExerciseAccuracy(moduleId, correctCountRef.current / module.exercises.length);
      clearModuleState(pathId, moduleId);
      setModuleComplete(true);
      if (isLoggedIn) {
        awardBonusXP('module', `${pathId}/${moduleId}`).then(() => refreshXP()).catch(() => {});
      }
    } else if (signal) {
      setDifficultyPrompt(signal);
    } else {
      setCurrentExerciseIndex(nextIndex);
    }
  }

  function handleAcceptDifficulty() {
    const progress = getProgress();
    const currentLevel = progress.difficultyOverride ?? skillLevel;
    const newLevel: SkillLevel =
      difficultyPrompt === 'increase'
        ? currentLevel === 'beginner' ? 'intermediate' : 'advanced'
        : currentLevel === 'advanced' ? 'intermediate' : 'beginner';
    progress.difficultyOverride = newLevel;
    saveProgress(progress);
    setAdaptiveState(createAdaptiveState());
    setDifficultyPrompt(null);
    if (!module) return;
    const nextIndex = currentExerciseIndex + 1;
    if (nextIndex >= module.exercises.length) {
      completeModule(pathId, moduleId);
      updateExerciseAccuracy(moduleId, correctCountRef.current / module.exercises.length);
      clearModuleState(pathId, moduleId);
      setModuleComplete(true);
    } else {
      setCurrentExerciseIndex(nextIndex);
    }
  }

  function handleDismissDifficulty() {
    setAdaptiveState(createAdaptiveState());
    setDifficultyPrompt(null);
    if (!module) return;
    const nextIndex = currentExerciseIndex + 1;
    if (nextIndex >= module.exercises.length) {
      completeModule(pathId, moduleId);
      updateExerciseAccuracy(moduleId, correctCountRef.current / module.exercises.length);
      clearModuleState(pathId, moduleId);
      setModuleComplete(true);
    } else {
      setCurrentExerciseIndex(nextIndex);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16" role="status" aria-live="polite">
        <svg className="h-8 w-8 animate-spin text-lc-accent" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        <span className="ml-3 text-lc-muted">Loading module...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-lc-red/30 bg-lc-red/10 p-6 text-center" role="alert">
        <p className="text-lc-red">{error}</p>
        <button
          type="button"
          onClick={fetchModule}
          className="mt-3 rounded-lg bg-lc-red px-5 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!module) return null;

  const phaseLabel = phase === 'learn' ? 'Learn' : phase === 'engage' ? 'Engage' : 'Practice';

  return (
    <section aria-label={`Module: ${module.title}`}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-lc-text">{module.title}</h1>
          <p className="mt-1 text-sm text-lc-muted">
            {phase === 'learn' && 'Read the concept explanation, then continue to interactive review.'}
            {phase === 'engage' && 'Reinforce your understanding with flashcards, analogies, and key terms.'}
            {phase === 'practice' && 'Test your knowledge with exercises and challenges.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PhaseIndicator current={phaseLabel} />
          {phase === 'practice' && (
            <button
              type="button"
              onClick={() => setTerminalOpen(!terminalOpen)}
              className="rounded-lg border border-lc-border px-3 py-1.5 text-xs font-medium text-lc-muted hover:bg-lc-hover hover:text-lc-text"
            >
              {terminalOpen ? 'Close Terminal' : 'Open Terminal'}
            </button>
          )}
        </div>
      </div>

      {/* XP gain toast */}
      {xpGain && (
        <div className="fixed top-4 right-4 z-50 animate-bounce rounded-lg bg-lc-accent px-4 py-2 text-sm font-bold text-lc-bg shadow-lg">
          +{xpGain} XP
        </div>
      )}

      {/* Phase 1: LEARN */}
      {phase === 'learn' && (
        <>
          <ExplanationPanel
            topic={pathId}
            concept={module.title}
            baseExplanation={module.conceptExplanation}
            skillLevel={skillLevel}
          />
          <div className="mt-6 rounded-xl border border-lc-border bg-lc-surface p-6 text-center">
            <p className="mx-auto max-w-lg text-sm leading-relaxed text-lc-muted">
              Once you have a feel for the concept, continue to interactive flashcards and analogies
              before practicing with exercises.
            </p>
            <button
              type="button"
              onClick={() => setPhase('engage')}
              className="mt-4 inline-flex items-center rounded-lg bg-lc-accent px-6 py-2.5 text-sm font-semibold text-lc-bg transition hover:opacity-90"
            >
              I get it -- show me flashcards
            </button>
          </div>
        </>
      )}

      {/* Phase 2: ENGAGE */}
      {phase === 'engage' && (
        <div className="space-y-8">
          <FlashcardDeck cards={module.flashcards ?? []} />
          <AnalogyCards analogies={module.analogies ?? []} />
          <KeyConcepts terms={module.keyTerms ?? []} />

          <div className="flex items-center justify-between rounded-xl border border-lc-border bg-lc-surface p-5">
            <button
              type="button"
              onClick={() => setPhase('learn')}
              className="text-sm font-medium text-lc-muted hover:text-lc-text"
            >
              &larr; Back to lesson
            </button>
            <button
              type="button"
              onClick={() => setPhase('practice')}
              className="rounded-lg bg-lc-accent px-6 py-2.5 text-sm font-semibold text-lc-bg transition hover:opacity-90"
            >
              Ready to practice
            </button>
          </div>
        </div>
      )}

      {/* Phase 3: PRACTICE */}
      {phase === 'practice' && moduleComplete && (
        <div className="rounded-xl border border-lc-green/30 bg-lc-green/10 p-8 text-center" role="status" aria-live="polite">
          <h2 className="text-2xl font-bold text-lc-green mb-2">Module Complete!</h2>
          <p className="text-lc-green/80">
            You cleared all {module.exercises.length} exercise{module.exercises.length !== 1 ? 's' : ''}.
          </p>
          {isLoggedIn && (
            <p className="mt-2 text-sm text-lc-green/60">+50 XP bonus awarded!</p>
          )}
        </div>
      )}

      {phase === 'practice' && !moduleComplete && difficultyPrompt && (
        <div className="rounded-xl border border-lc-accent/30 bg-lc-accent/10 p-6 text-center" role="dialog" aria-label="Difficulty adjustment">
          <p className="font-medium text-lc-accent mb-4">
            {difficultyPrompt === 'increase'
              ? "You're crushing it! Want to crank up the difficulty?"
              : 'Want to dial it back for more foundational content?'}
          </p>
          <div className="flex justify-center gap-3">
            <button type="button" onClick={handleAcceptDifficulty}
              className="rounded-lg bg-lc-accent px-5 py-2 text-sm font-medium text-lc-bg hover:opacity-90">
              Accept
            </button>
            <button type="button" onClick={handleDismissDifficulty}
              className="rounded-lg border border-lc-border px-5 py-2 text-sm font-medium text-lc-muted hover:bg-lc-hover hover:text-lc-text">
              Keep going
            </button>
          </div>
        </div>
      )}

      {phase === 'practice' && !moduleComplete && !difficultyPrompt && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setPhase('engage')}
              className="text-sm font-medium text-lc-muted hover:text-lc-text"
            >
              &larr; Back to review
            </button>
            <span className="text-sm text-lc-muted">
              Exercise {currentExerciseIndex + 1} of {module.exercises.length}
            </span>
          </div>
          <ExerciseContainer
            key={module.exercises[currentExerciseIndex].id}
            exercise={module.exercises[currentExerciseIndex]}
            skillLevel={skillLevel}
            onComplete={handleExerciseComplete}
          />
        </div>
      )}

      {/* Terminal Panel */}
      {terminalOpen && (
        <div className="mt-6">
          <TerminalPanel onClose={() => setTerminalOpen(false)} />
        </div>
      )}
    </section>
  );
}
