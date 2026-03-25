export type DifficultySignal = 'increase' | 'decrease' | null;

export interface AdaptiveState {
  consecutiveCorrect: number;
  consecutiveIncorrect: number;
  totalCorrect: number;
  totalAnswered: number;
}

export function createAdaptiveState(): AdaptiveState {
  return {
    consecutiveCorrect: 0,
    consecutiveIncorrect: 0,
    totalCorrect: 0,
    totalAnswered: 0,
  };
}

export function recordResult(state: AdaptiveState, correct: boolean): AdaptiveState {
  return {
    consecutiveCorrect: correct ? state.consecutiveCorrect + 1 : 0,
    consecutiveIncorrect: correct ? 0 : state.consecutiveIncorrect + 1,
    totalCorrect: state.totalCorrect + (correct ? 1 : 0),
    totalAnswered: state.totalAnswered + 1,
  };
}

export function getDifficultySignal(state: AdaptiveState): DifficultySignal {
  if (state.consecutiveCorrect >= 3) return 'increase';
  if (state.consecutiveIncorrect >= 3) return 'decrease';
  return null;
}

export function getAccuracyRate(state: AdaptiveState): number {
  if (state.totalAnswered === 0) return 0;
  return state.totalCorrect / state.totalAnswered;
}
