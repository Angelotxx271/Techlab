import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard, { difficultyMatches, interestMatchesCategory } from './Dashboard';
import * as progressStore from '../../services/progressStore';
import * as api from '../../services/api';
import type { LearnerProfile } from '../../types';

vi.mock('../../services/api');
vi.mock('../../services/progressStore', async () => {
  const actual = await vi.importActual<typeof import('../../services/progressStore')>('../../services/progressStore');
  return { ...actual };
});

const mockProfile: LearnerProfile = {
  skillLevel: 'intermediate',
  interests: ['Web Frameworks', 'Containerization'],
  onboardingComplete: true,
};

const mockCatalog: api.CatalogResponse = {
  categories: [
    { id: 'web-frameworks', name: 'Web Frameworks', description: '', paths: ['fastapi', 'django'] },
    { id: 'cloud', name: 'Cloud Platforms', description: '', paths: ['aws'] },
    { id: 'containers', name: 'Containerization & Orchestration', description: '', paths: ['docker'] },
  ],
};

const mockPaths: Record<string, any> = {
  fastapi: { id: 'fastapi', title: 'FastAPI', description: 'Learn FastAPI', category: 'web-frameworks', estimatedDuration: '2h', difficulty: 'intermediate', modules: [{ id: 'm1', title: 'Intro', order: 1 }] },
  django: { id: 'django', title: 'Django', description: 'Learn Django', category: 'web-frameworks', estimatedDuration: '3h', difficulty: 'advanced', modules: [{ id: 'm1', title: 'Intro', order: 1 }] },
  aws: { id: 'aws', title: 'AWS', description: 'Learn AWS', category: 'cloud', estimatedDuration: '4h', difficulty: 'intermediate', modules: [{ id: 'm1', title: 'Intro', order: 1 }] },
  docker: { id: 'docker', title: 'Docker', description: 'Learn Docker', category: 'containers', estimatedDuration: '2.5h', difficulty: 'intermediate', modules: [{ id: 'm1', title: 'Basics', order: 1 }, { id: 'm2', title: 'Compose', order: 2 }] },
};

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  );
}

describe('difficultyMatches', () => {
  it('allows beginners to access beginner and intermediate paths', () => {
    expect(difficultyMatches('beginner', 'beginner')).toBe(true);
    expect(difficultyMatches('intermediate', 'beginner')).toBe(true);
    expect(difficultyMatches('advanced', 'beginner')).toBe(false);
  });

  it('restricts intermediate learners to paths at or below their tier', () => {
    expect(difficultyMatches('advanced', 'intermediate')).toBe(false);
    expect(difficultyMatches('intermediate', 'intermediate')).toBe(true);
  });

  it('allows advanced learners to access all difficulties', () => {
    expect(difficultyMatches('advanced', 'advanced')).toBe(true);
    expect(difficultyMatches('beginner', 'advanced')).toBe(true);
  });
});

describe('interestMatchesCategory', () => {
  it('matches when interest is substring of category name', () => {
    expect(interestMatchesCategory(['Web Frameworks'], 'Web Frameworks')).toBe(true);
  });

  it('matches case-insensitively', () => {
    expect(interestMatchesCategory(['web frameworks'], 'Web Frameworks')).toBe(true);
  });

  it('matches partial interest in category name', () => {
    expect(interestMatchesCategory(['Containerization'], 'Containerization & Orchestration')).toBe(true);
  });

  it('returns false when no interests match', () => {
    expect(interestMatchesCategory(['AI'], 'Web Frameworks')).toBe(false);
  });
});

describe('Dashboard', () => {
  it('shows onboarding message when no profile exists', () => {
    vi.spyOn(progressStore, 'getProfile').mockReturnValue(null);
    renderDashboard();
    expect(screen.getByText(/complete onboarding/i)).toBeDefined();
  });

  it('shows recommended paths based on interests and skill level', async () => {
    vi.spyOn(progressStore, 'getProfile').mockReturnValue(mockProfile);
    vi.spyOn(progressStore, 'getProgress').mockReturnValue({
      completedModules: {},
      currentModule: {},
      exerciseAccuracy: {},
      consecutiveCorrect: 0,
      consecutiveIncorrect: 0,
    });
    vi.spyOn(api, 'getCatalog').mockResolvedValue(mockCatalog);
    vi.spyOn(api, 'getPath').mockImplementation(async (id: string) => mockPaths[id]);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Recommended for you')).toBeDefined();
    });

    // FastAPI (intermediate) should be recommended — matches Web Frameworks + difficulty <= intermediate
    expect(screen.getByText('FastAPI')).toBeDefined();
    // Docker (intermediate) should be recommended — matches Containerization
    expect(screen.getByText('Docker')).toBeDefined();
    // Django (advanced) should NOT appear — difficulty > intermediate
    expect(screen.queryByText('Django')).toBeNull();
    // AWS should NOT appear — Cloud Platforms doesn't match interests
    expect(screen.queryByText('AWS')).toBeNull();
  });

  it('shows Explore topics when interests are empty', async () => {
    vi.spyOn(progressStore, 'getProfile').mockReturnValue({
      skillLevel: 'intermediate',
      interests: [],
      onboardingComplete: true,
    });
    vi.spyOn(progressStore, 'getProgress').mockReturnValue({
      completedModules: {},
      currentModule: {},
      exerciseAccuracy: {},
      consecutiveCorrect: 0,
      consecutiveIncorrect: 0,
    });
    vi.spyOn(api, 'getCatalog').mockResolvedValue(mockCatalog);
    vi.spyOn(api, 'getPath').mockImplementation(async (id: string) => mockPaths[id]);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Explore topics')).toBeDefined();
    });
    expect(screen.getByText('FastAPI')).toBeDefined();
  });

  it('shows in-progress paths with continue link', async () => {
    vi.spyOn(progressStore, 'getProfile').mockReturnValue(mockProfile);
    vi.spyOn(progressStore, 'getProgress').mockReturnValue({
      completedModules: { docker: ['m1'] },
      currentModule: { docker: 'm2' },
      exerciseAccuracy: {},
      consecutiveCorrect: 0,
      consecutiveIncorrect: 0,
    });
    vi.spyOn(progressStore, 'getCompletionPercentage').mockReturnValue(50);
    vi.spyOn(api, 'getCatalog').mockResolvedValue(mockCatalog);
    vi.spyOn(api, 'getPath').mockImplementation(async (id: string) => mockPaths[id]);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('In Progress')).toBeDefined();
    });

    expect(screen.getByText('Docker')).toBeDefined();
    expect(screen.getByText(/continue where you left off/i)).toBeDefined();
    expect(screen.getByText('50%')).toBeDefined();
  });
});
