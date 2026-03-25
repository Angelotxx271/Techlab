import type { LearnerProfile, LearnerProgress, SkillLevel } from '../types';
import { isLoggedIn } from './auth';
import { syncProgressToServer } from './api';

const PROFILE_KEY = 'learnerProfile';
const PROGRESS_KEY = 'learnerProgress';
const MODULE_STATES_KEY = 'moduleStates';

const DEFAULT_PROGRESS: LearnerProgress = {
  completedModules: {},
  currentModule: {},
  exerciseAccuracy: {},
  consecutiveCorrect: 0,
  consecutiveIncorrect: 0,
};

function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__ls_test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

// --- Profile ---

export function getProfile(): LearnerProfile | null {
  if (!isLocalStorageAvailable()) return null;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LearnerProfile;
  } catch {
    return null;
  }
}

export function saveProfile(profile: LearnerProfile): void {
  if (!isLocalStorageAvailable()) return;
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch { /* ignore */ }
}

// --- Progress ---

export function getProgress(): LearnerProgress {
  if (!isLocalStorageAvailable()) return { ...DEFAULT_PROGRESS };
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS };
    return JSON.parse(raw) as LearnerProgress;
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

let _syncTimer: ReturnType<typeof setTimeout> | null = null;

function debouncedServerSync(progress: LearnerProgress): void {
  if (!isLoggedIn()) return;
  if (_syncTimer) clearTimeout(_syncTimer);
  _syncTimer = setTimeout(() => {
    syncProgressToServer(progress as unknown as Record<string, unknown>).catch(() => {});
  }, 2000);
}

export function saveProgress(progress: LearnerProgress): void {
  if (!isLocalStorageAvailable()) return;
  try {
    const updated: LearnerProgress = {
      ...progress,
      lastActivityTimestamp: new Date().toISOString(),
    };
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(updated));
    debouncedServerSync(updated);
  } catch { /* ignore */ }
}

// --- Convenience helpers ---

export function completeModule(pathId: string, moduleId: string): void {
  const progress = getProgress();
  const completed = progress.completedModules[pathId] ?? [];
  if (!completed.includes(moduleId)) {
    completed.push(moduleId);
  }
  progress.completedModules[pathId] = completed;
  saveProgress(progress);
}

export function setCurrentModule(pathId: string, moduleId: string): void {
  const progress = getProgress();
  progress.currentModule[pathId] = moduleId;
  saveProgress(progress);
}

export function updateExerciseAccuracy(moduleId: string, accuracy: number): void {
  const progress = getProgress();
  progress.exerciseAccuracy[moduleId] = accuracy;
  saveProgress(progress);
}

export function getCompletionPercentage(pathId: string, totalModules: number): number {
  if (totalModules <= 0) return 0;
  const progress = getProgress();
  const completed = progress.completedModules[pathId] ?? [];
  return Math.floor((completed.length / totalModules) * 100);
}

const RE_ENGAGEMENT_DAYS = 3;

export function shouldShowReEngagement(
  lastActivityTimestamp: string | undefined,
  now: Date = new Date(),
): boolean {
  if (!lastActivityTimestamp) return false;
  try {
    const last = new Date(lastActivityTimestamp);
    if (isNaN(last.getTime())) return false;
    const diffMs = now.getTime() - last.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays > RE_ENGAGEMENT_DAYS;
  } catch {
    return false;
  }
}

// --- Module State Caching (Phase 3) ---

export interface ModuleState {
  phase: 'learn' | 'engage' | 'practice';
  exerciseIndex: number;
  scrollY: number;
  correctCount: number;
  consecutiveCorrect: number;
  consecutiveIncorrect: number;
  difficultyOverride?: SkillLevel;
  timestamp: string;
}

const MODULE_STATE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getModuleStates(): Record<string, ModuleState> {
  if (!isLocalStorageAvailable()) return {};
  try {
    const raw = localStorage.getItem(MODULE_STATES_KEY);
    if (!raw) return {};
    const states = JSON.parse(raw) as Record<string, ModuleState>;
    const now = Date.now();
    const cleaned: Record<string, ModuleState> = {};
    for (const [key, state] of Object.entries(states)) {
      if (now - new Date(state.timestamp).getTime() < MODULE_STATE_TTL_MS) {
        cleaned[key] = state;
      }
    }
    return cleaned;
  } catch {
    return {};
  }
}

function setModuleStates(states: Record<string, ModuleState>): void {
  if (!isLocalStorageAvailable()) return;
  try {
    localStorage.setItem(MODULE_STATES_KEY, JSON.stringify(states));
  } catch { /* ignore */ }
}

export function saveModuleState(pathId: string, moduleId: string, state: Omit<ModuleState, 'timestamp'>): void {
  const key = `${pathId}/${moduleId}`;
  const states = getModuleStates();
  states[key] = { ...state, timestamp: new Date().toISOString() };
  setModuleStates(states);
}

export function getModuleState(pathId: string, moduleId: string): ModuleState | null {
  const key = `${pathId}/${moduleId}`;
  const states = getModuleStates();
  return states[key] ?? null;
}

export function clearModuleState(pathId: string, moduleId: string): void {
  const key = `${pathId}/${moduleId}`;
  const states = getModuleStates();
  delete states[key];
  setModuleStates(states);
}
