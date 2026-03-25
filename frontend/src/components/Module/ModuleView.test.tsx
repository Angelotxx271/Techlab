import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ModuleView from './ModuleView';
import type { Module } from '../../types';

async function startPracticePhase() {
  await waitFor(() => {
    expect(
      screen.getByRole('button', { name: /Start exercises and coding challenges/i }),
    ).toBeTruthy();
  });
  fireEvent.click(screen.getByRole('button', { name: /Start exercises and coding challenges/i }));
}

vi.mock('../../services/api', () => ({
  getModule: vi.fn(),
}));

vi.mock('../../services/progressStore', () => ({
  setCurrentModule: vi.fn(),
  completeModule: vi.fn(),
  updateExerciseAccuracy: vi.fn(),
  getProgress: vi.fn(() => ({
    completedModules: {},
    currentModule: {},
    exerciseAccuracy: {},
    consecutiveCorrect: 0,
    consecutiveIncorrect: 0,
  })),
  saveProgress: vi.fn(),
}));

// Also mock ExerciseContainer to keep tests focused
vi.mock('../Exercise/ExerciseContainer', () => ({
  default: ({ exercise, onComplete }: { exercise: { question: string }; onComplete: () => void }) => (
    <div data-testid="exercise-container">
      <p>{exercise.question}</p>
      <button onClick={onComplete}>Complete Exercise</button>
    </div>
  ),
}));

// Mock ExplanationPanel to keep ModuleView tests focused
vi.mock('./ExplanationPanel', () => ({
  default: ({ baseExplanation }: { baseExplanation: string }) => (
    <div data-testid="explanation-panel">
      <p>{baseExplanation}</p>
    </div>
  ),
}));

import { getModule } from '../../services/api';
import { setCurrentModule, completeModule, updateExerciseAccuracy, getProgress, saveProgress } from '../../services/progressStore';
const mockGetModule = vi.mocked(getModule);
const mockSetCurrentModule = vi.mocked(setCurrentModule);
const mockCompleteModule = vi.mocked(completeModule);
const mockUpdateExerciseAccuracy = vi.mocked(updateExerciseAccuracy);
const mockGetProgress = vi.mocked(getProgress);
const mockSaveProgress = vi.mocked(saveProgress);

const sampleModule: Module = {
  id: 'mod-01',
  pathId: 'docker',
  title: 'Containers & Docker Fundamentals',
  conceptExplanation: 'Docker is a platform for building and running containers.',
  exercises: [
    {
      id: 'ex-01',
      type: 'multiple_choice',
      question: 'What is Docker?',
      options: ['A container runtime', 'A database'],
      correctAnswer: 'A container runtime',
      difficulty: 'beginner',
    },
    {
      id: 'ex-02',
      type: 'true_false',
      question: 'Docker images are containers.',
      correctAnswer: 'false',
      difficulty: 'beginner',
    },
  ],
};

beforeEach(() => {
  mockGetModule.mockReset();
  mockSetCurrentModule.mockReset();
  mockCompleteModule.mockReset();
  mockUpdateExerciseAccuracy.mockReset();
  mockGetProgress.mockReset();
  mockSaveProgress.mockReset();
  mockGetProgress.mockReturnValue({
    completedModules: {},
    currentModule: {},
    exerciseAccuracy: {},
    consecutiveCorrect: 0,
    consecutiveIncorrect: 0,
  });
  localStorage.clear();
});

describe('ModuleView', () => {
  it('shows loading state initially', () => {
    mockGetModule.mockReturnValue(new Promise(() => {})); // never resolves
    render(<ModuleView pathId="docker" moduleId="mod-01" />);
    expect(screen.getByText('Loading module…')).toBeTruthy();
  });

  it('renders module title and concept explanation after loading', async () => {
    mockGetModule.mockResolvedValueOnce(sampleModule);
    render(<ModuleView pathId="docker" moduleId="mod-01" />);

    await waitFor(() => {
      expect(screen.getByText('Containers & Docker Fundamentals')).toBeTruthy();
    });
    expect(screen.getByText('Docker is a platform for building and running containers.')).toBeTruthy();
  });

  it('renders the first exercise via ExerciseContainer after starting practice', async () => {
    mockGetModule.mockResolvedValueOnce(sampleModule);
    render(<ModuleView pathId="docker" moduleId="mod-01" />);

    await startPracticePhase();

    await waitFor(() => {
      expect(screen.getByTestId('exercise-container')).toBeTruthy();
    });
    expect(screen.getByText('What is Docker?')).toBeTruthy();
    expect(screen.getByText('Exercise 1 of 2')).toBeTruthy();
  });

  it('advances to next exercise on complete', async () => {
    mockGetModule.mockResolvedValueOnce(sampleModule);
    render(<ModuleView pathId="docker" moduleId="mod-01" />);

    await startPracticePhase();

    await waitFor(() => {
      expect(screen.getByText('What is Docker?')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Complete Exercise'));

    await waitFor(() => {
      expect(screen.getByText('Docker images are containers.')).toBeTruthy();
    });
    expect(screen.getByText('Exercise 2 of 2')).toBeTruthy();
  });

  it('shows module complete message after all exercises', async () => {
    mockGetModule.mockResolvedValueOnce(sampleModule);
    render(<ModuleView pathId="docker" moduleId="mod-01" />);

    await startPracticePhase();

    await waitFor(() => {
      expect(screen.getByText('What is Docker?')).toBeTruthy();
    });

    // Complete first exercise
    fireEvent.click(screen.getByText('Complete Exercise'));
    await waitFor(() => {
      expect(screen.getByText('Docker images are containers.')).toBeTruthy();
    });

    // Complete second exercise
    fireEvent.click(screen.getByText('Complete Exercise'));
    await waitFor(() => {
      expect(screen.getByText(/Module Complete!/)).toBeTruthy();
    });
  });

  it('shows error state and retry button on API failure', async () => {
    mockGetModule.mockRejectedValueOnce(new Error('Network error'));
    render(<ModuleView pathId="docker" moduleId="mod-01" />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load module content. Please try again.')).toBeTruthy();
    });
    expect(screen.getByText('Retry')).toBeTruthy();
  });

  it('retries fetching on retry button click', async () => {
    mockGetModule.mockRejectedValueOnce(new Error('fail'));
    render(<ModuleView pathId="docker" moduleId="mod-01" />);

    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeTruthy();
    });

    mockGetModule.mockResolvedValueOnce(sampleModule);
    fireEvent.click(screen.getByText('Retry'));

    await waitFor(() => {
      expect(screen.getByText('Containers & Docker Fundamentals')).toBeTruthy();
    });
  });

  it('reads skill level from localStorage', async () => {
    localStorage.setItem('learnerProfile', JSON.stringify({ skillLevel: 'advanced' }));
    mockGetModule.mockResolvedValueOnce(sampleModule);
    render(<ModuleView pathId="docker" moduleId="mod-01" />);

    await startPracticePhase();

    await waitFor(() => {
      expect(screen.getByTestId('exercise-container')).toBeTruthy();
    });
    // Component renders — skill level is read without error
  });

  it('defaults to intermediate when localStorage has no profile', async () => {
    mockGetModule.mockResolvedValueOnce(sampleModule);
    render(<ModuleView pathId="docker" moduleId="mod-01" />);

    await startPracticePhase();

    await waitFor(() => {
      expect(screen.getByTestId('exercise-container')).toBeTruthy();
    });
    // No error — defaults gracefully
  });

  it('calls getModule with correct pathId and moduleId', async () => {
    mockGetModule.mockResolvedValueOnce(sampleModule);
    render(<ModuleView pathId="fastapi" moduleId="01-intro" />);

    await waitFor(() => {
      expect(mockGetModule).toHaveBeenCalledWith('fastapi', '01-intro');
    });
  });

  it('calls setCurrentModule when module loads', async () => {
    mockGetModule.mockResolvedValueOnce(sampleModule);
    render(<ModuleView pathId="docker" moduleId="mod-01" />);

    await waitFor(() => {
      expect(mockSetCurrentModule).toHaveBeenCalledWith('docker', 'mod-01');
    });
  });

  it('calls completeModule and updateExerciseAccuracy on module completion', async () => {
    mockGetModule.mockResolvedValueOnce(sampleModule);
    render(<ModuleView pathId="docker" moduleId="mod-01" />);

    await startPracticePhase();

    await waitFor(() => {
      expect(screen.getByText('What is Docker?')).toBeTruthy();
    });

    // Complete first exercise
    fireEvent.click(screen.getByText('Complete Exercise'));
    await waitFor(() => {
      expect(screen.getByText('Docker images are containers.')).toBeTruthy();
    });

    // Complete second exercise
    fireEvent.click(screen.getByText('Complete Exercise'));
    await waitFor(() => {
      expect(screen.getByText(/Module Complete!/)).toBeTruthy();
    });

    expect(mockCompleteModule).toHaveBeenCalledWith('docker', 'mod-01');
    // 2 correct out of 2 exercises = accuracy 1.0
    expect(mockUpdateExerciseAccuracy).toHaveBeenCalledWith('mod-01', 1);
  });

  it('does not call completeModule before all exercises are done', async () => {
    mockGetModule.mockResolvedValueOnce(sampleModule);
    render(<ModuleView pathId="docker" moduleId="mod-01" />);

    await startPracticePhase();

    await waitFor(() => {
      expect(screen.getByText('What is Docker?')).toBeTruthy();
    });

    // Complete only first exercise
    fireEvent.click(screen.getByText('Complete Exercise'));
    await waitFor(() => {
      expect(screen.getByText('Docker images are containers.')).toBeTruthy();
    });

    expect(mockCompleteModule).not.toHaveBeenCalled();
    expect(mockUpdateExerciseAccuracy).not.toHaveBeenCalled();
  });
});

const fourExerciseModule: Module = {
  id: 'mod-02',
  pathId: 'docker',
  title: 'Advanced Docker',
  conceptExplanation: 'Advanced Docker concepts.',
  exercises: [
    { id: 'ex-a', type: 'true_false', question: 'Q1', correctAnswer: 'true', difficulty: 'beginner' },
    { id: 'ex-b', type: 'true_false', question: 'Q2', correctAnswer: 'true', difficulty: 'beginner' },
    { id: 'ex-c', type: 'true_false', question: 'Q3', correctAnswer: 'true', difficulty: 'beginner' },
    { id: 'ex-d', type: 'true_false', question: 'Q4', correctAnswer: 'true', difficulty: 'beginner' },
  ],
};

describe('ModuleView adaptive difficulty', () => {
  it('shows increase difficulty prompt after 3 consecutive correct answers', async () => {
    mockGetModule.mockResolvedValueOnce(fourExerciseModule);
    render(<ModuleView pathId="docker" moduleId="mod-02" />);

    await startPracticePhase();

    await waitFor(() => {
      expect(screen.getByText('Q1')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Complete Exercise'));
    await waitFor(() => { expect(screen.getByText('Q2')).toBeTruthy(); });

    fireEvent.click(screen.getByText('Complete Exercise'));
    await waitFor(() => { expect(screen.getByText('Q3')).toBeTruthy(); });

    // 3rd consecutive correct triggers the prompt
    fireEvent.click(screen.getByText('Complete Exercise'));
    await waitFor(() => {
      expect(screen.getByText("You're doing great! Would you like to increase the difficulty?")).toBeTruthy();
    });
    expect(screen.getByText('Accept')).toBeTruthy();
    expect(screen.getByText('Dismiss')).toBeTruthy();
  });

  it('advances to next exercise after dismissing difficulty prompt', async () => {
    mockGetModule.mockResolvedValueOnce(fourExerciseModule);
    render(<ModuleView pathId="docker" moduleId="mod-02" />);

    await startPracticePhase();

    await waitFor(() => { expect(screen.getByText('Q1')).toBeTruthy(); });

    fireEvent.click(screen.getByText('Complete Exercise'));
    await waitFor(() => { expect(screen.getByText('Q2')).toBeTruthy(); });

    fireEvent.click(screen.getByText('Complete Exercise'));
    await waitFor(() => { expect(screen.getByText('Q3')).toBeTruthy(); });

    fireEvent.click(screen.getByText('Complete Exercise'));
    await waitFor(() => { expect(screen.getByText('Dismiss')).toBeTruthy(); });

    fireEvent.click(screen.getByText('Dismiss'));
    await waitFor(() => {
      expect(screen.getByText('Q4')).toBeTruthy();
    });
  });

  it('updates difficultyOverride in progress store on accept', async () => {
    mockGetModule.mockResolvedValueOnce(fourExerciseModule);
    render(<ModuleView pathId="docker" moduleId="mod-02" />);

    await startPracticePhase();

    await waitFor(() => { expect(screen.getByText('Q1')).toBeTruthy(); });

    fireEvent.click(screen.getByText('Complete Exercise'));
    await waitFor(() => { expect(screen.getByText('Q2')).toBeTruthy(); });

    fireEvent.click(screen.getByText('Complete Exercise'));
    await waitFor(() => { expect(screen.getByText('Q3')).toBeTruthy(); });

    fireEvent.click(screen.getByText('Complete Exercise'));
    await waitFor(() => { expect(screen.getByText('Accept')).toBeTruthy(); });

    fireEvent.click(screen.getByText('Accept'));

    await waitFor(() => {
      expect(screen.getByText('Q4')).toBeTruthy();
    });
    expect(mockSaveProgress).toHaveBeenCalledWith(
      expect.objectContaining({ difficultyOverride: 'advanced' })
    );
  });

  it('does not save progress on dismiss', async () => {
    mockGetModule.mockResolvedValueOnce(fourExerciseModule);
    render(<ModuleView pathId="docker" moduleId="mod-02" />);

    await startPracticePhase();

    await waitFor(() => { expect(screen.getByText('Q1')).toBeTruthy(); });

    fireEvent.click(screen.getByText('Complete Exercise'));
    await waitFor(() => { expect(screen.getByText('Q2')).toBeTruthy(); });

    fireEvent.click(screen.getByText('Complete Exercise'));
    await waitFor(() => { expect(screen.getByText('Q3')).toBeTruthy(); });

    fireEvent.click(screen.getByText('Complete Exercise'));
    await waitFor(() => { expect(screen.getByText('Dismiss')).toBeTruthy(); });

    // Reset to track only dismiss-related calls
    mockSaveProgress.mockClear();
    fireEvent.click(screen.getByText('Dismiss'));

    await waitFor(() => {
      expect(screen.getByText('Q4')).toBeTruthy();
    });
    expect(mockSaveProgress).not.toHaveBeenCalled();
  });
});
