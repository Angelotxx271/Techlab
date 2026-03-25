import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getProfile,
  saveProfile,
  getProgress,
  saveProgress,
  completeModule,
  setCurrentModule,
  updateExerciseAccuracy,
  getCompletionPercentage,
} from './progressStore';
import type { LearnerProfile, LearnerProgress } from '../types';

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('getProfile / saveProfile', () => {
  it('returns null when no profile is stored', () => {
    expect(getProfile()).toBeNull();
  });

  it('round-trips a profile through localStorage', () => {
    const profile: LearnerProfile = {
      skillLevel: 'beginner',
      interests: ['docker', 'fastapi'],
      onboardingComplete: true,
    };
    saveProfile(profile);
    expect(getProfile()).toEqual(profile);
  });

  it('returns null and warns when localStorage is unavailable', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    expect(getProfile()).toBeNull();
    expect(spy).toHaveBeenCalled();
  });
});

describe('getProgress / saveProgress', () => {
  const defaultProgress: LearnerProgress = {
    completedModules: {},
    currentModule: {},
    exerciseAccuracy: {},
    consecutiveCorrect: 0,
    consecutiveIncorrect: 0,
  };

  it('returns default progress when nothing is stored', () => {
    expect(getProgress()).toEqual(defaultProgress);
  });

  it('sets lastActivityTimestamp on save', () => {
    const now = new Date('2025-01-15T10:00:00.000Z');
    vi.setSystemTime(now);
    saveProgress({ ...defaultProgress });
    const saved = getProgress();
    expect(saved.lastActivityTimestamp).toBe('2025-01-15T10:00:00.000Z');
    vi.useRealTimers();
  });

  it('round-trips progress with completed modules', () => {
    const progress: LearnerProgress = {
      completedModules: { docker: ['01-basics', '02-compose'] },
      currentModule: { docker: '03-networks' },
      exerciseAccuracy: { '01-basics': 0.85 },
      consecutiveCorrect: 2,
      consecutiveIncorrect: 0,
    };
    saveProgress(progress);
    const loaded = getProgress();
    expect(loaded.completedModules).toEqual(progress.completedModules);
    expect(loaded.currentModule).toEqual(progress.currentModule);
    expect(loaded.exerciseAccuracy).toEqual(progress.exerciseAccuracy);
    expect(loaded.consecutiveCorrect).toBe(2);
    expect(loaded.lastActivityTimestamp).toBeDefined();
  });

  it('returns default and warns when localStorage is unavailable for read', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('unavailable');
    });
    expect(getProgress()).toEqual(defaultProgress);
    expect(spy).toHaveBeenCalled();
  });
});

describe('completeModule', () => {
  it('adds a module to completedModules for a path', () => {
    completeModule('docker', '01-basics');
    const progress = getProgress();
    expect(progress.completedModules['docker']).toContain('01-basics');
  });

  it('does not duplicate a module id', () => {
    completeModule('docker', '01-basics');
    completeModule('docker', '01-basics');
    const progress = getProgress();
    expect(progress.completedModules['docker']).toEqual(['01-basics']);
  });
});

describe('setCurrentModule', () => {
  it('sets the current module for a path', () => {
    setCurrentModule('fastapi', '02-routes');
    const progress = getProgress();
    expect(progress.currentModule['fastapi']).toBe('02-routes');
  });
});

describe('updateExerciseAccuracy', () => {
  it('stores accuracy for a module', () => {
    updateExerciseAccuracy('01-basics', 0.75);
    const progress = getProgress();
    expect(progress.exerciseAccuracy['01-basics']).toBe(0.75);
  });
});

describe('getCompletionPercentage', () => {
  it('returns 0 when no modules are completed', () => {
    expect(getCompletionPercentage('fastapi', 5)).toBe(0);
  });

  it('returns 0 when totalModules is 0', () => {
    expect(getCompletionPercentage('fastapi', 0)).toBe(0);
  });

  it('calculates floor percentage correctly', () => {
    completeModule('k8s', 'm1');
    completeModule('k8s', 'm2');
    // 2/3 = 66.66... → floor = 66
    expect(getCompletionPercentage('k8s', 3)).toBe(66);
  });

  it('returns 100 when all modules are completed', () => {
    completeModule('aws', 'a1');
    completeModule('aws', 'a2');
    expect(getCompletionPercentage('aws', 2)).toBe(100);
  });
});
