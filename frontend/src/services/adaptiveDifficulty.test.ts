import { describe, it, expect } from 'vitest';
import {
  createAdaptiveState,
  recordResult,
  getDifficultySignal,
  getAccuracyRate,
} from './adaptiveDifficulty';

describe('createAdaptiveState', () => {
  it('returns a fresh state with all zeros', () => {
    const state = createAdaptiveState();
    expect(state).toEqual({
      consecutiveCorrect: 0,
      consecutiveIncorrect: 0,
      totalCorrect: 0,
      totalAnswered: 0,
    });
  });
});

describe('recordResult', () => {
  it('increments consecutiveCorrect on correct answer', () => {
    const state = recordResult(createAdaptiveState(), true);
    expect(state.consecutiveCorrect).toBe(1);
    expect(state.consecutiveIncorrect).toBe(0);
    expect(state.totalCorrect).toBe(1);
    expect(state.totalAnswered).toBe(1);
  });

  it('resets consecutiveCorrect on incorrect answer', () => {
    let state = createAdaptiveState();
    state = recordResult(state, true);
    state = recordResult(state, true);
    state = recordResult(state, false);
    expect(state.consecutiveCorrect).toBe(0);
    expect(state.consecutiveIncorrect).toBe(1);
  });

  it('increments consecutiveIncorrect on incorrect answer', () => {
    const state = recordResult(createAdaptiveState(), false);
    expect(state.consecutiveIncorrect).toBe(1);
    expect(state.consecutiveCorrect).toBe(0);
    expect(state.totalCorrect).toBe(0);
    expect(state.totalAnswered).toBe(1);
  });

  it('resets consecutiveIncorrect on correct answer', () => {
    let state = createAdaptiveState();
    state = recordResult(state, false);
    state = recordResult(state, false);
    state = recordResult(state, true);
    expect(state.consecutiveIncorrect).toBe(0);
    expect(state.consecutiveCorrect).toBe(1);
  });

  it('does not mutate the original state', () => {
    const original = createAdaptiveState();
    recordResult(original, true);
    expect(original.totalAnswered).toBe(0);
  });
});

describe('getDifficultySignal', () => {
  it('returns null for a fresh state', () => {
    expect(getDifficultySignal(createAdaptiveState())).toBeNull();
  });

  it('returns "increase" after 3 consecutive correct', () => {
    let state = createAdaptiveState();
    state = recordResult(state, true);
    state = recordResult(state, true);
    state = recordResult(state, true);
    expect(getDifficultySignal(state)).toBe('increase');
  });

  it('returns "decrease" after 3 consecutive incorrect', () => {
    let state = createAdaptiveState();
    state = recordResult(state, false);
    state = recordResult(state, false);
    state = recordResult(state, false);
    expect(getDifficultySignal(state)).toBe('decrease');
  });

  it('returns null when streak is broken before 3', () => {
    let state = createAdaptiveState();
    state = recordResult(state, true);
    state = recordResult(state, true);
    state = recordResult(state, false);
    expect(getDifficultySignal(state)).toBeNull();
  });

  it('returns "increase" for streaks longer than 3', () => {
    let state = createAdaptiveState();
    for (let i = 0; i < 5; i++) state = recordResult(state, true);
    expect(getDifficultySignal(state)).toBe('increase');
  });
});

describe('getAccuracyRate', () => {
  it('returns 0 when no answers recorded', () => {
    expect(getAccuracyRate(createAdaptiveState())).toBe(0);
  });

  it('returns 1 when all answers are correct', () => {
    let state = createAdaptiveState();
    state = recordResult(state, true);
    state = recordResult(state, true);
    expect(getAccuracyRate(state)).toBe(1);
  });

  it('returns 0 when all answers are incorrect', () => {
    let state = createAdaptiveState();
    state = recordResult(state, false);
    state = recordResult(state, false);
    expect(getAccuracyRate(state)).toBe(0);
  });

  it('returns correct ratio for mixed results', () => {
    let state = createAdaptiveState();
    state = recordResult(state, true);
    state = recordResult(state, false);
    state = recordResult(state, true);
    state = recordResult(state, false);
    expect(getAccuracyRate(state)).toBeCloseTo(0.5);
  });
});
