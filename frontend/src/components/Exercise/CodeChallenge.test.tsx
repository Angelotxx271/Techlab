import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CodeChallenge from './CodeChallenge';
import type { CodeChallengeExercise, ChallengeResult } from '../../types';

vi.mock('../../services/api', () => ({
  submitChallenge: vi.fn(),
  getHint: vi.fn(),
}));

import { submitChallenge, getHint } from '../../services/api';
const mockSubmit = vi.mocked(submitChallenge);
const mockGetHint = vi.mocked(getHint);

const exercise: CodeChallengeExercise = {
  id: 'cc-1',
  type: 'code_challenge',
  question: 'Write a function to add two numbers',
  correctAnswer: '',
  difficulty: 'advanced',
  problemStatement: 'Given two integers a and b, return their sum.',
  inputOutputSpec: 'Input: two integers a, b\nOutput: integer a + b',
  starterTemplate: {
    python: 'def add(a, b):\n    pass',
    javascript: 'function add(a, b) {\n  // your code\n}',
  },
  testCases: [
    { id: 'tc-1', input: '1 2', expectedOutput: '3', isHidden: false },
    { id: 'tc-2', input: '0 0', expectedOutput: '0', isHidden: false },
    { id: 'tc-3', input: '-1 1', expectedOutput: '0', isHidden: true },
  ],
  supportedLanguages: ['python', 'javascript'],
};

beforeEach(() => {
  mockSubmit.mockReset();
  mockGetHint.mockReset();
});

describe('CodeChallenge', () => {
  it('renders problem statement and input/output spec', () => {
    render(<CodeChallenge exercise={exercise} skillLevel="advanced" onComplete={vi.fn()} />);
    expect(screen.getByText('Given two integers a and b, return their sum.')).toBeTruthy();
    expect(screen.getByText(/Input: two integers a, b/)).toBeTruthy();
  });

  it('renders visible test cases but not hidden ones', () => {
    render(<CodeChallenge exercise={exercise} skillLevel="advanced" onComplete={vi.fn()} />);
    // 2 visible test cases show expected output, hidden tc-3 is not shown
    expect(screen.getAllByText(/Expected:/).length).toBe(2);
    // hidden test case input should not appear
    expect(screen.queryByText('-1 1')).toBeNull();
  });

  it('renders starter template in code editor', () => {
    render(<CodeChallenge exercise={exercise} skillLevel="advanced" onComplete={vi.fn()} />);
    const editor = screen.getByLabelText('Code editor') as HTMLTextAreaElement;
    expect(editor.value).toBe('def add(a, b):\n    pass');
  });

  it('switches language and updates code template', () => {
    render(<CodeChallenge exercise={exercise} skillLevel="advanced" onComplete={vi.fn()} />);
    const select = screen.getByLabelText('Select programming language') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'javascript' } });
    const editor = screen.getByLabelText('Code editor') as HTMLTextAreaElement;
    expect(editor.value).toBe('function add(a, b) {\n  // your code\n}');
  });

  it('renders language selector with supported languages', () => {
    render(<CodeChallenge exercise={exercise} skillLevel="advanced" onComplete={vi.fn()} />);
    expect(screen.getByText('Python')).toBeTruthy();
    expect(screen.getByText('JavaScript')).toBeTruthy();
  });

  it('submits code and displays all-passed result with execution time', async () => {
    const successResult: ChallengeResult = {
      allPassed: true,
      testCaseResults: [
        { testCaseId: 'tc-1', passed: true, expectedOutput: '3', actualOutput: '3' },
        { testCaseId: 'tc-2', passed: true, expectedOutput: '0', actualOutput: '0' },
      ],
      executionTimeMs: 42.5,
    };
    mockSubmit.mockResolvedValueOnce(successResult);
    const onComplete = vi.fn();

    render(<CodeChallenge exercise={exercise} skillLevel="advanced" onComplete={onComplete} />);
    fireEvent.click(screen.getByLabelText('Submit solution'));

    await waitFor(() => {
      expect(screen.getByText('✓ All tests passed!')).toBeTruthy();
    });
    expect(screen.getByText('Execution time: 42.5 ms')).toBeTruthy();

    fireEvent.click(screen.getByText('Continue'));
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('displays per-test-case pass/fail results on partial failure', async () => {
    const failResult: ChallengeResult = {
      allPassed: false,
      testCaseResults: [
        { testCaseId: 'tc-1', passed: true, expectedOutput: '3', actualOutput: '3' },
        { testCaseId: 'tc-2', passed: false, expectedOutput: '0', actualOutput: 'None' },
      ],
    };
    mockSubmit.mockResolvedValueOnce(failResult);

    render(<CodeChallenge exercise={exercise} skillLevel="advanced" onComplete={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Submit solution'));

    await waitFor(() => {
      expect(screen.getByText('Test Results')).toBeTruthy();
    });
    expect(screen.getByText('✓ tc-1')).toBeTruthy();
    expect(screen.getByText('✗ tc-2')).toBeTruthy();
    expect(screen.getByText('Expected: 0')).toBeTruthy();
    expect(screen.getByText('Actual: None')).toBeTruthy();
  });

  it('displays runtime error from result', async () => {
    const errorResult: ChallengeResult = {
      allPassed: false,
      testCaseResults: [],
      error: 'SyntaxError: unexpected EOF',
    };
    mockSubmit.mockResolvedValueOnce(errorResult);

    render(<CodeChallenge exercise={exercise} skillLevel="advanced" onComplete={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Submit solution'));

    await waitFor(() => {
      expect(screen.getByText('Runtime Error')).toBeTruthy();
    });
    expect(screen.getByText('SyntaxError: unexpected EOF')).toBeTruthy();
  });

  it('displays error message on submission API failure', async () => {
    mockSubmit.mockRejectedValueOnce(new Error('Network error'));

    render(<CodeChallenge exercise={exercise} skillLevel="advanced" onComplete={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Submit solution'));

    await waitFor(() => {
      expect(screen.getByText(/Failed to submit/)).toBeTruthy();
    });
  });

  it('calls getHint and displays hint text', async () => {
    mockGetHint.mockResolvedValueOnce({ hint: 'Think about the + operator.' });

    render(<CodeChallenge exercise={exercise} skillLevel="advanced" onComplete={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Get a hint'));

    await waitFor(() => {
      expect(screen.getByText('Think about the + operator.')).toBeTruthy();
    });
    expect(mockGetHint).toHaveBeenCalledWith({
      exercise,
      attempt_number: 1,
      skill_level: 'advanced',
    });
  });

  it('displays hint error on API failure', async () => {
    mockGetHint.mockRejectedValueOnce(new Error('fail'));

    render(<CodeChallenge exercise={exercise} skillLevel="advanced" onComplete={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Get a hint'));

    await waitFor(() => {
      expect(screen.getByText(/Failed to load hint/)).toBeTruthy();
    });
  });

  it('disables submit when code is empty', () => {
    render(<CodeChallenge exercise={exercise} skillLevel="advanced" onComplete={vi.fn()} />);
    const editor = screen.getByLabelText('Code editor') as HTMLTextAreaElement;
    fireEvent.change(editor, { target: { value: '' } });
    const submitBtn = screen.getByLabelText('Submit solution') as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);
  });
});
