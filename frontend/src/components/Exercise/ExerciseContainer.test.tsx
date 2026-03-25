import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ExerciseContainer from './ExerciseContainer';
import type { Exercise, EvaluationResult } from '../../types';

// Mock the API module
vi.mock('../../services/api', () => ({
  evaluateExercise: vi.fn(),
  getHint: vi.fn(),
}));

import { evaluateExercise, getHint } from '../../services/api';
const mockEvaluate = vi.mocked(evaluateExercise);
const mockGetHint = vi.mocked(getHint);

const mcExercise: Exercise = {
  id: 'ex-mc',
  type: 'multiple_choice',
  question: 'What is Docker?',
  options: ['A container runtime', 'A database', 'A language'],
  correctAnswer: 'A container runtime',
  difficulty: 'beginner',
};

const fibExercise: Exercise = {
  id: 'ex-fib',
  type: 'fill_in_blank',
  question: 'The command to list containers is docker ___',
  correctAnswer: 'ps',
  difficulty: 'beginner',
};

const ccExercise: Exercise = {
  id: 'ex-cc',
  type: 'code_completion',
  question: 'Complete the Dockerfile',
  codeTemplate: 'FROM ___',
  correctAnswer: 'FROM python:3.11',
  difficulty: 'intermediate',
};

const tfExercise: Exercise = {
  id: 'ex-tf',
  type: 'true_false',
  question: 'Docker containers share the host OS kernel.',
  correctAnswer: 'True',
  difficulty: 'beginner',
};

beforeEach(() => {
  mockEvaluate.mockReset();
  mockGetHint.mockReset();
});

describe('ExerciseContainer', () => {
  it('renders MultipleChoice for multiple_choice type', () => {
    render(<ExerciseContainer exercise={mcExercise} skillLevel="beginner" onComplete={vi.fn()} />);
    expect(screen.getByText('What is Docker?')).toBeTruthy();
    expect(screen.getByText('A container runtime')).toBeTruthy();
    expect(screen.getByText('A database')).toBeTruthy();
  });

  it('renders FillInBlank for fill_in_blank type', () => {
    render(<ExerciseContainer exercise={fibExercise} skillLevel="beginner" onComplete={vi.fn()} />);
    expect(screen.getByText(/docker ___/)).toBeTruthy();
    expect(screen.getByPlaceholderText('Type your answer…')).toBeTruthy();
  });

  it('renders CodeCompletion for code_completion type', () => {
    render(<ExerciseContainer exercise={ccExercise} skillLevel="intermediate" onComplete={vi.fn()} />);
    expect(screen.getByText('Complete the Dockerfile')).toBeTruthy();
    expect(screen.getByDisplayValue('FROM ___')).toBeTruthy();
  });

  it('renders TrueFalse for true_false type', () => {
    render(<ExerciseContainer exercise={tfExercise} skillLevel="beginner" onComplete={vi.fn()} />);
    expect(screen.getByText('Docker containers share the host OS kernel.')).toBeTruthy();
    expect(screen.getByText('True')).toBeTruthy();
    expect(screen.getByText('False')).toBeTruthy();
  });

  it('shows correct result and Continue button on correct answer', async () => {
    const correctResult: EvaluationResult = { correct: true, feedback: 'Great job!' };
    mockEvaluate.mockResolvedValueOnce(correctResult);
    const onComplete = vi.fn();

    render(<ExerciseContainer exercise={mcExercise} skillLevel="beginner" onComplete={onComplete} />);

    fireEvent.click(screen.getByText('A container runtime'));
    fireEvent.click(screen.getByLabelText('Submit answer'));

    await waitFor(() => {
      expect(screen.getByText('✓ Correct!')).toBeTruthy();
    });
    expect(screen.getByText('Great job!')).toBeTruthy();

    fireEvent.click(screen.getByText('Continue'));
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('shows incorrect result with AI Feedback and Try Again button on wrong answer', async () => {
    const wrongResult: EvaluationResult = { correct: false, feedback: 'Not quite.', hint: 'Think about containers.' };
    mockEvaluate.mockResolvedValueOnce(wrongResult);

    render(<ExerciseContainer exercise={mcExercise} skillLevel="beginner" onComplete={vi.fn()} />);

    fireEvent.click(screen.getByText('A database'));
    fireEvent.click(screen.getByLabelText('Submit answer'));

    await waitFor(() => {
      expect(screen.getByText('✗ Incorrect')).toBeTruthy();
    });
    expect(screen.getByText('AI Feedback')).toBeTruthy();
    expect(screen.getByText('Not quite.')).toBeTruthy();
    expect(screen.getByText(/Think about containers/)).toBeTruthy();
    expect(screen.getByText('Try Again')).toBeTruthy();
  });

  it('shows error message on API failure', async () => {
    mockEvaluate.mockRejectedValueOnce(new Error('Network error'));

    render(<ExerciseContainer exercise={tfExercise} skillLevel="beginner" onComplete={vi.fn()} />);

    fireEvent.click(screen.getByText('True'));
    fireEvent.click(screen.getByLabelText('Submit answer'));

    await waitFor(() => {
      expect(screen.getByText(/Failed to evaluate/)).toBeTruthy();
    });
  });

  it('disables submit button when no answer is selected (multiple choice)', () => {
    render(<ExerciseContainer exercise={mcExercise} skillLevel="beginner" onComplete={vi.fn()} />);
    const submitBtn = screen.getByLabelText('Submit answer') as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
  });

  it('disables submit button when input is empty (fill in blank)', () => {
    render(<ExerciseContainer exercise={fibExercise} skillLevel="beginner" onComplete={vi.fn()} />);
    const submitBtn = screen.getByLabelText('Submit answer') as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
  });

  it('shows Get a hint button before submission', () => {
    render(<ExerciseContainer exercise={mcExercise} skillLevel="beginner" onComplete={vi.fn()} />);
    expect(screen.getByLabelText('Get a hint')).toBeTruthy();
  });

  it('calls getHint API and displays hint text', async () => {
    mockGetHint.mockResolvedValueOnce({ hint: 'Think about containerization technology.' });

    render(<ExerciseContainer exercise={mcExercise} skillLevel="beginner" onComplete={vi.fn()} />);

    fireEvent.click(screen.getByLabelText('Get a hint'));

    await waitFor(() => {
      expect(screen.getByText('Think about containerization technology.')).toBeTruthy();
    });
    expect(mockGetHint).toHaveBeenCalledWith({
      exercise: mcExercise,
      attempt_number: 1,
      skill_level: 'beginner',
    });
  });

  it('increments attempt number on each hint request', async () => {
    mockGetHint
      .mockResolvedValueOnce({ hint: 'First hint.' })
      .mockResolvedValueOnce({ hint: 'Second hint.' });

    render(<ExerciseContainer exercise={mcExercise} skillLevel="beginner" onComplete={vi.fn()} />);

    fireEvent.click(screen.getByLabelText('Get a hint'));
    await waitFor(() => {
      expect(screen.getByText('First hint.')).toBeTruthy();
    });
    expect(mockGetHint).toHaveBeenLastCalledWith(expect.objectContaining({ attempt_number: 1 }));

    fireEvent.click(screen.getByLabelText('Get a hint'));
    await waitFor(() => {
      expect(screen.getByText('Second hint.')).toBeTruthy();
    });
    expect(mockGetHint).toHaveBeenLastCalledWith(expect.objectContaining({ attempt_number: 2 }));
  });

  it('shows hint error on API failure', async () => {
    mockGetHint.mockRejectedValueOnce(new Error('Network error'));

    render(<ExerciseContainer exercise={mcExercise} skillLevel="beginner" onComplete={vi.fn()} />);

    fireEvent.click(screen.getByLabelText('Get a hint'));

    await waitFor(() => {
      expect(screen.getByText(/Failed to load hint/)).toBeTruthy();
    });
  });

  it('shows Get a hint button after incorrect answer', async () => {
    const wrongResult: EvaluationResult = { correct: false, feedback: 'Wrong.' };
    mockEvaluate.mockResolvedValueOnce(wrongResult);

    render(<ExerciseContainer exercise={mcExercise} skillLevel="beginner" onComplete={vi.fn()} />);

    fireEvent.click(screen.getByText('A database'));
    fireEvent.click(screen.getByLabelText('Submit answer'));

    await waitFor(() => {
      expect(screen.getByText('✗ Incorrect')).toBeTruthy();
    });
    expect(screen.getByLabelText('Get a hint')).toBeTruthy();
  });

  it('hides Get a hint button after correct answer', async () => {
    const correctResult: EvaluationResult = { correct: true, feedback: 'Great!' };
    mockEvaluate.mockResolvedValueOnce(correctResult);

    render(<ExerciseContainer exercise={mcExercise} skillLevel="beginner" onComplete={vi.fn()} />);

    fireEvent.click(screen.getByText('A container runtime'));
    fireEvent.click(screen.getByLabelText('Submit answer'));

    await waitFor(() => {
      expect(screen.getByText('✓ Correct!')).toBeTruthy();
    });
    expect(screen.queryByLabelText('Get a hint')).toBeNull();
  });
});
