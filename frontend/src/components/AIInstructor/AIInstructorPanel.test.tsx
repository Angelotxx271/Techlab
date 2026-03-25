import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AIInstructorPanel from './AIInstructorPanel';
import * as api from '../../services/api';
import * as progressStore from '../../services/progressStore';
import type { InstructorGuidance, LearnerProgress } from '../../types';

vi.mock('../../services/api');
vi.mock('../../services/progressStore', async () => {
  const actual = await vi.importActual<typeof import('../../services/progressStore')>('../../services/progressStore');
  return { ...actual };
});

const mockProgress: LearnerProgress = {
  completedModules: { fastapi: ['01-intro'] },
  currentModule: { fastapi: '02-routes' },
  exerciseAccuracy: { '01-intro': 0.85, '01-basics': 0.45 },
  consecutiveCorrect: 2,
  consecutiveIncorrect: 0,
  lastActivityTimestamp: new Date().toISOString(),
};

const mockGuidance: InstructorGuidance = {
  progressSummary: 'You have completed 1 module across 1 path.',
  weakAreas: [
    { pathId: 'docker', moduleId: '01-basics', moduleTitle: 'Docker Basics', accuracy: 0.45 },
  ],
  recommendations: [
    { type: 'continue_path', pathId: 'fastapi', moduleId: '02-routes', reason: 'Continue FastAPI.' },
    { type: 'review_module', pathId: 'docker', moduleId: '01-basics', reason: 'Review Docker basics.' },
  ],
  motivationalMessage: 'Great job completing your first module!',
};

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

function renderPanel() {
  return render(
    <MemoryRouter>
      <AIInstructorPanel />
    </MemoryRouter>,
  );
}

describe('AIInstructorPanel', () => {
  it('shows loading state initially', () => {
    vi.spyOn(progressStore, 'getProfile').mockReturnValue({ skillLevel: 'intermediate', interests: [], onboardingComplete: true });
    vi.spyOn(progressStore, 'getProgress').mockReturnValue(mockProgress);
    vi.spyOn(api, 'getInstructorGuidance').mockReturnValue(new Promise(() => {})); // never resolves

    renderPanel();
    expect(screen.getByText(/loading ai instructor/i)).toBeDefined();
  });

  it('renders guidance with progress summary, weak areas, recommendations, and motivational message', async () => {
    vi.spyOn(progressStore, 'getProfile').mockReturnValue({ skillLevel: 'intermediate', interests: ['Web Frameworks'], onboardingComplete: true });
    vi.spyOn(progressStore, 'getProgress').mockReturnValue(mockProgress);
    vi.spyOn(api, 'getInstructorGuidance').mockResolvedValue(mockGuidance);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByText('AI Instructor')).toBeDefined();
    });

    // Progress summary
    expect(screen.getByText(mockGuidance.progressSummary)).toBeDefined();
    // Weak areas
    expect(screen.getByText(/Docker Basics/)).toBeDefined();
    expect(screen.getByText(/45% accuracy/)).toBeDefined();
    // Recommendations
    expect(screen.getByText('Continue FastAPI.')).toBeDefined();
    expect(screen.getByText('Review Docker basics.')).toBeDefined();
    // Motivational message
    expect(screen.getByText(mockGuidance.motivationalMessage)).toBeDefined();
  });

  it('shows re-engagement message when present', async () => {
    const guidanceWithReEngagement: InstructorGuidance = {
      ...mockGuidance,
      reEngagementMessage: 'Welcome back! It has been a while.',
    };
    vi.spyOn(progressStore, 'getProfile').mockReturnValue({ skillLevel: 'beginner', interests: [], onboardingComplete: true });
    vi.spyOn(progressStore, 'getProgress').mockReturnValue(mockProgress);
    vi.spyOn(api, 'getInstructorGuidance').mockResolvedValue(guidanceWithReEngagement);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByText('Welcome back! It has been a while.')).toBeDefined();
    });
  });

  it('shows fallback guidance on API failure', async () => {
    vi.spyOn(progressStore, 'getProfile').mockReturnValue({ skillLevel: 'intermediate', interests: [], onboardingComplete: true });
    vi.spyOn(progressStore, 'getProgress').mockReturnValue(mockProgress);
    vi.spyOn(api, 'getInstructorGuidance').mockRejectedValue(new Error('Network error'));

    renderPanel();

    await waitFor(() => {
      expect(screen.getByText(/ai instructor is currently unavailable/i)).toBeDefined();
    });

    // Fallback guidance should still show
    expect(screen.getByText(/keep going/i)).toBeDefined();
    expect(screen.getByText(/you are making progress/i)).toBeDefined();
  });

  it('passes correct progress data to API', async () => {
    const profile = { skillLevel: 'advanced' as const, interests: ['Docker'], onboardingComplete: true };
    vi.spyOn(progressStore, 'getProfile').mockReturnValue(profile);
    vi.spyOn(progressStore, 'getProgress').mockReturnValue(mockProgress);
    const guidanceSpy = vi.spyOn(api, 'getInstructorGuidance').mockResolvedValue(mockGuidance);

    renderPanel();

    await waitFor(() => {
      expect(guidanceSpy).toHaveBeenCalledWith({
        completed_modules: mockProgress.completedModules,
        current_module: mockProgress.currentModule,
        exercise_accuracy: mockProgress.exerciseAccuracy,
        interests: ['Docker'],
        skill_level: 'advanced',
        last_activity_timestamp: mockProgress.lastActivityTimestamp,
      });
    });
  });

  it('uses defaults when no profile exists', async () => {
    vi.spyOn(progressStore, 'getProfile').mockReturnValue(null);
    vi.spyOn(progressStore, 'getProgress').mockReturnValue(mockProgress);
    const guidanceSpy = vi.spyOn(api, 'getInstructorGuidance').mockResolvedValue(mockGuidance);

    renderPanel();

    await waitFor(() => {
      expect(guidanceSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          interests: [],
          skill_level: 'intermediate',
        }),
      );
    });
  });
});
