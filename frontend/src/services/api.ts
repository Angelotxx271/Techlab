import type {
  EvaluationResult,
  ChallengeResult,
  InstructorGuidance,
  LearningPath,
  Module,
  SkillLevel,
  Exercise,
  NextStepRecommendation,
} from '../types';

// ---------------------------------------------------------------------------
// Types for request/response payloads
// ---------------------------------------------------------------------------

export interface CatalogCategory {
  id: string;
  name: string;
  description: string;
  paths: string[];
}

export interface CatalogResponse {
  categories: CatalogCategory[];
}

export interface EvaluateRequest {
  exercise_id: string;
  exercise: Exercise;
  user_answer: string;
  skill_level: SkillLevel;
}

export interface ExplainRequest {
  topic: string;
  concept: string;
  skill_level: SkillLevel;
}

export interface HintRequest {
  exercise: Exercise;
  attempt_number: number;
  skill_level: SkillLevel;
}

export interface ChallengeSubmitRequest {
  exercise_id: string;
  code: string;
  language: string;
  test_cases: {
    id: string;
    input: string;
    expected_output: string;
    is_hidden: boolean;
  }[];
}

export interface InstructorGuidanceRequest {
  progress: {
    completed_modules: Record<string, string[]>;
    current_module: Record<string, string>;
    exercise_accuracy: Record<string, number>;
    interests: string[];
    skill_level: SkillLevel;
    last_activity_timestamp?: string;
  };
  goals: string[];
}

// ---------------------------------------------------------------------------
// API error class
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  status?: number;
  constructor(
    message: string,
    status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// Fetch wrapper with retry logic and error handling
// ---------------------------------------------------------------------------

import { getAuthHeaders, clearToken, isLoggedIn } from './auth';

const BASE_URL = '/api';
const MAX_RETRIES = 1;

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  retries = MAX_RETRIES,
): Promise<T> {
  const url = `${BASE_URL}${path}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
          ...options.headers,
        },
      });

      if (!response.ok) {
        if (response.status === 401 && isLoggedIn()) {
          clearToken();
          window.location.href = '/';
          throw new ApiError('Session expired', 401);
        }
        let message = `Request failed (${response.status})`;
        try {
          const body = await response.json();
          if (body?.message) message = body.message;
        } catch {
          // ignore JSON parse failure on error responses
        }
        throw new ApiError(message, response.status);
      }

      return (await response.json()) as T;
    } catch (error) {
      const isLastAttempt = attempt === retries;

      // Don't retry client errors (4xx)
      if (error instanceof ApiError && error.status && error.status >= 400 && error.status < 500) {
        throw error;
      }

      if (isLastAttempt) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(
          'Unable to reach the server. Please check your connection and try again.',
        );
      }
      // brief pause before retry
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  // Unreachable, but satisfies TypeScript
  throw new ApiError('Unexpected error');
}

// ---------------------------------------------------------------------------
// localStorage cache layer (stale-while-revalidate)
// ---------------------------------------------------------------------------

const CACHE_PREFIX = 'apiCache:';
const DEFAULT_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface CacheEntry<T> {
  data: T;
  ts: number;
}

function cacheGet<T>(key: string, ttlMs = DEFAULT_TTL_MS): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.ts > ttlMs) return null;
    return entry.data;
  } catch { return null; }
}

function cacheSet<T>(key: string, data: T): void {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, ts: Date.now() }));
  } catch { /* storage full — ignore */ }
}

async function cachedFetch<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  ttlMs = DEFAULT_TTL_MS,
): Promise<T> {
  const cached = cacheGet<T>(cacheKey, ttlMs);
  if (cached !== null) {
    fetcher().then((fresh) => cacheSet(cacheKey, fresh)).catch(() => {});
    return cached;
  }
  const data = await fetcher();
  cacheSet(cacheKey, data);
  return data;
}

// ---------------------------------------------------------------------------
// Typed API functions
// ---------------------------------------------------------------------------

/** Fetch the full topic catalog with categories and paths. */
export async function getCatalog(): Promise<CatalogResponse> {
  return cachedFetch('catalog', () => apiFetch<CatalogResponse>('/catalog'));
}

/** Fetch a learning path's metadata and module list. */
export async function getPath(pathId: string): Promise<LearningPath> {
  return cachedFetch(`path:${pathId}`, () =>
    apiFetch<LearningPath>(`/paths/${encodeURIComponent(pathId)}`),
  );
}

/** Fetch a module's content and exercises. */
export async function getModule(pathId: string, moduleId: string): Promise<Module> {
  return cachedFetch(`module:${pathId}:${moduleId}`, () =>
    apiFetch<Module>(
      `/paths/${encodeURIComponent(pathId)}/modules/${encodeURIComponent(moduleId)}`,
    ),
  );
}

/** Submit an exercise answer for evaluation. */
export async function evaluateExercise(req: EvaluateRequest): Promise<EvaluationResult> {
  return apiFetch<EvaluationResult>('/exercises/evaluate', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

/** Request an AI-generated explanation for a concept. */
export async function getExplanation(req: ExplainRequest): Promise<{ explanation: string; fallback?: boolean }> {
  return apiFetch<{ explanation: string; fallback?: boolean }>('/explain', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

/** Request a progressive hint for an exercise. */
export async function getHint(req: HintRequest): Promise<{ hint: string; fallback?: boolean }> {
  return apiFetch<{ hint: string; fallback?: boolean }>('/hint', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

/** Chat with the AI tutor about a concept. */
export async function chatAboutConcept(req: {
  topic: string;
  concept: string;
  skill_level: SkillLevel;
  messages: { role: string; content: string }[];
}): Promise<{ reply: string; fallback?: boolean }> {
  return apiFetch<{ reply: string; fallback?: boolean }>('/chat', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

/** Submit a code challenge solution for execution against test cases. */
export async function submitChallenge(req: ChallengeSubmitRequest): Promise<ChallengeResult> {
  return apiFetch<ChallengeResult>('/challenges/submit', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

/** Map FastAPI snake_case JSON to frontend InstructorGuidance (camelCase). */
function mapInstructorGuidance(raw: Record<string, unknown>): InstructorGuidance {
  const weakRaw = (raw.weak_areas ?? raw.weakAreas) as unknown[] | undefined;
  const recRaw = (raw.recommendations ?? []) as Record<string, unknown>[];

  return {
    progressSummary: String(raw.progress_summary ?? raw.progressSummary ?? ''),
    weakAreas: Array.isArray(weakRaw)
      ? weakRaw.map((w) => {
          const x = w as Record<string, unknown>;
          return {
            pathId: String(x.path_id ?? x.pathId ?? ''),
            moduleId: String(x.module_id ?? x.moduleId ?? ''),
            moduleTitle: String(x.module_title ?? x.moduleTitle ?? ''),
            accuracy: Number(x.accuracy ?? 0),
          };
        })
      : [],
    recommendations: Array.isArray(recRaw)
      ? recRaw.map((r) => {
          const mid = r.module_id ?? r.moduleId;
          return {
            type: r.type as NextStepRecommendation['type'],
            pathId: String(r.path_id ?? r.pathId ?? ''),
            moduleId: mid != null ? String(mid) : undefined,
            reason: String(r.reason ?? ''),
          };
        })
      : [],
    motivationalMessage: String(raw.motivational_message ?? raw.motivationalMessage ?? ''),
    reEngagementMessage:
      raw.re_engagement_message != null
        ? String(raw.re_engagement_message)
        : raw.reEngagementMessage != null
          ? String(raw.reEngagementMessage)
          : undefined,
  };
}

/** Fetch AI Instructor guidance based on learner progress. */
export async function getInstructorGuidance(
  progress: InstructorGuidanceRequest['progress'],
  goals: string[] = [],
): Promise<InstructorGuidance> {
  const raw = await apiFetch<Record<string, unknown>>('/instructor/guidance', {
    method: 'POST',
    body: JSON.stringify({ progress, goals }),
  });
  return mapInstructorGuidance(raw);
}

// ---------------------------------------------------------------------------
// XP
// ---------------------------------------------------------------------------

export interface XPAwardResponse {
  awarded: number;
  duplicate: boolean;
  totalXp: number;
  rank: string;
  rankTitle: string;
  nextRankXp: number;
}

export async function awardXP(req: {
  exercise_id: string;
  difficulty: string;
  exercise_type: string;
  context?: string;
}): Promise<XPAwardResponse> {
  return apiFetch<XPAwardResponse>('/xp/award', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function awardBonusXP(bonusType: string, contextId: string): Promise<XPAwardResponse> {
  return apiFetch<XPAwardResponse>(
    `/xp/award-bonus?bonus_type=${encodeURIComponent(bonusType)}&context_id=${encodeURIComponent(contextId)}`,
    { method: 'POST' },
  );
}

export interface XPSummary {
  totalXp: number;
  rank: string;
  rankTitle: string;
  nextRankXp: number;
  exercisesCompleted: number;
}

export async function getXPSummary(): Promise<XPSummary> {
  return apiFetch<XPSummary>('/xp/summary');
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  totalXp: number;
  rank: string;
  rankTitle: string;
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  return cachedFetch('leaderboard', () => apiFetch<LeaderboardEntry[]>('/xp/leaderboard'), 5 * 60 * 1000);
}

// ---------------------------------------------------------------------------
// Career Recommendation
// ---------------------------------------------------------------------------

export interface CareerRecommendation {
  targetRole: string;
  rationale: string;
  recommendedPaths: string[];
  salaryInsight: string;
}

export async function getCareerRecommendation(req: {
  current_position: string;
  interests?: string[];
  skill_level?: string;
}): Promise<CareerRecommendation> {
  return apiFetch<CareerRecommendation>('/career/recommend', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

// ---------------------------------------------------------------------------
// Marketplace
// ---------------------------------------------------------------------------

export interface DeveloperListItem {
  userId: string;
  displayName: string;
  bio: string;
  currentPosition: string;
  totalXp: number;
  rank: string;
  rankTitle: string;
  skillLevel: string;
  completedPaths: string[];
  exerciseAccuracy: Record<string, number>;
}

export async function getMarketplaceDevelopers(filters?: {
  skill_level?: string;
  path_id?: string;
}): Promise<DeveloperListItem[]> {
  const params = new URLSearchParams();
  if (filters?.skill_level) params.set('skill_level', filters.skill_level);
  if (filters?.path_id) params.set('path_id', filters.path_id);
  const qs = params.toString();
  return apiFetch<DeveloperListItem[]>(`/marketplace/developers${qs ? '?' + qs : ''}`);
}

export interface DeveloperDetail extends DeveloperListItem {
  nextRankXp: number;
  interests: string[];
  completedModules: Record<string, string[]>;
  xpHistory: { amount: number; reason: string; date: string }[];
}

export async function getDeveloperDetail(userId: string): Promise<DeveloperDetail> {
  return apiFetch<DeveloperDetail>(`/marketplace/developers/${encodeURIComponent(userId)}`);
}

// ---------------------------------------------------------------------------
// User Progress Sync
// ---------------------------------------------------------------------------

export async function syncProgressToServer(data: Record<string, unknown>): Promise<void> {
  await apiFetch<{ ok: boolean }>('/users/progress', {
    method: 'PUT',
    body: JSON.stringify({ data }),
  });
}

export async function getServerProgress(): Promise<Record<string, unknown>> {
  return apiFetch<Record<string, unknown>>('/users/progress');
}

export async function syncProfileToServer(profile: {
  skill_level?: string;
  interests?: string[];
  onboarding_complete?: boolean;
  current_position?: string;
}): Promise<void> {
  await apiFetch<Record<string, unknown>>('/users/profile', {
    method: 'PUT',
    body: JSON.stringify(profile),
  });
}

// ---------------------------------------------------------------------------
// Streaks
// ---------------------------------------------------------------------------

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  todayExercises: number;
  dailyGoalMet: boolean;
}

export async function getStreak(): Promise<StreakData> {
  return apiFetch<StreakData>('/streaks');
}

export async function streakCheckin(): Promise<StreakData> {
  return apiFetch<StreakData>('/streaks/checkin', { method: 'POST' });
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

export interface Badge {
  type: string;
  label: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedAt: string | null;
}

export interface BadgesResponse {
  badges: Badge[];
  earnedCount: number;
  totalCount: number;
}

export interface NewBadge {
  type: string;
  label: string;
  description: string;
  icon: string;
}

export async function getBadges(): Promise<BadgesResponse> {
  return apiFetch<BadgesResponse>('/badges');
}

export async function checkBadges(): Promise<{ newBadges: NewBadge[] }> {
  return apiFetch<{ newBadges: NewBadge[] }>('/badges/check', { method: 'POST' });
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export interface AnalyticsData {
  dailyActivity: { date: string; xp: number; exercises: number }[];
  categoryXp: Record<string, number>;
  categoryScores: Record<string, number>;
  strongest: string | null;
  weakest: string | null;
  totalExercises: number;
  totalDaysActive: number;
  currentStreak: number;
  yearHeatmap: Record<string, number>;
  totalContributions: number;
}

export async function getAnalytics(): Promise<AnalyticsData> {
  return apiFetch<AnalyticsData>('/analytics');
}

// ---------------------------------------------------------------------------
// Multiplayer
// ---------------------------------------------------------------------------

export interface MultiplayerRoom {
  roomId: string;
  challenge: string;
  players: number;
}

export async function createMultiplayerRoom(): Promise<{ roomId: string; challenge: Record<string, string> }> {
  return apiFetch('/multiplayer/create', { method: 'POST' });
}

export async function listMultiplayerRooms(): Promise<MultiplayerRoom[]> {
  return apiFetch<MultiplayerRoom[]>('/multiplayer/rooms');
}

// ---------------------------------------------------------------------------
// Certificates
// ---------------------------------------------------------------------------

export interface CertificateData {
  userName: string;
  pathId: string;
  pathTitle: string;
  completionDate: string;
  totalXp: number;
  rank: string;
  rankTitle: string;
  modulesCompleted: number;
}

export async function getCertificate(pathId: string): Promise<CertificateData> {
  return apiFetch<CertificateData>(`/certificates/${encodeURIComponent(pathId)}`);
}

// ---------------------------------------------------------------------------
// Activity Feed
// ---------------------------------------------------------------------------

export interface FeedEvent {
  displayName: string;
  action: string;
  type: string;
  timestamp: string;
}

export async function getActivityFeed(): Promise<FeedEvent[]> {
  return cachedFetch('feed', () => apiFetch<FeedEvent[]>('/feed'), 30_000);
}

// ---------------------------------------------------------------------------
// Full Profile
// ---------------------------------------------------------------------------

export interface FullProfile {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  isPublic: boolean;
  currentPosition: string;
  createdAt: string;
  profile: Record<string, unknown>;
  totalXp: number;
  exercisesCompleted: number;
  badges: { type: string; earnedAt: string }[];
  streak: { current: number; longest: number };
}

export async function getFullProfile(): Promise<FullProfile> {
  return apiFetch<FullProfile>('/users/me/full');
}

export async function updateVisibility(isPublic: boolean, bio: string): Promise<void> {
  await apiFetch('/users/profile/visibility', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_public: isPublic, bio }),
  });
}
