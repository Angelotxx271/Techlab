import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getCatalog,
  getPath,
  getModule,
  evaluateExercise,
  getExplanation,
  getHint,
  submitChallenge,
  getInstructorGuidance,
  ApiError,
} from './api';

// ---------------------------------------------------------------------------
// Mock global fetch
// ---------------------------------------------------------------------------

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function jsonResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  });
}

function errorResponse(status: number, body?: unknown) {
  return Promise.resolve({
    ok: false,
    status,
    json: body !== undefined ? () => Promise.resolve(body) : () => Promise.reject(new Error('no body')),
  });
}

beforeEach(() => {
  mockFetch.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// GET endpoints
// ---------------------------------------------------------------------------

describe('getCatalog', () => {
  it('fetches the catalog from /api/catalog', async () => {
    const data = { categories: [{ id: 'web', name: 'Web', description: 'Web stuff', paths: ['django'] }] };
    mockFetch.mockReturnValueOnce(jsonResponse(data));

    const result = await getCatalog();
    expect(result).toEqual(data);
    expect(mockFetch).toHaveBeenCalledWith('/api/catalog', expect.objectContaining({ headers: expect.objectContaining({ 'Content-Type': 'application/json' }) }));
  });
});

describe('getPath', () => {
  it('fetches a learning path by id', async () => {
    const path = { id: 'docker', title: 'Docker', description: 'Learn Docker', category: 'containers', estimatedDuration: '2h', difficulty: 'beginner', modules: [] };
    mockFetch.mockReturnValueOnce(jsonResponse(path));

    const result = await getPath('docker');
    expect(result).toEqual(path);
    expect(mockFetch).toHaveBeenCalledWith('/api/paths/docker', expect.anything());
  });
});

describe('getModule', () => {
  it('fetches a module by path and module id', async () => {
    const mod = { id: '01-intro', pathId: 'docker', title: 'Intro', conceptExplanation: 'Docker is...', exercises: [] };
    mockFetch.mockReturnValueOnce(jsonResponse(mod));

    const result = await getModule('docker', '01-intro');
    expect(result).toEqual(mod);
    expect(mockFetch).toHaveBeenCalledWith('/api/paths/docker/modules/01-intro', expect.anything());
  });
});

// ---------------------------------------------------------------------------
// POST endpoints
// ---------------------------------------------------------------------------

describe('evaluateExercise', () => {
  it('posts an evaluation request and returns the result', async () => {
    const evalResult = { correct: true, feedback: 'Great job!' };
    mockFetch.mockReturnValueOnce(jsonResponse(evalResult));

    const result = await evaluateExercise({
      exercise_id: 'ex-1',
      exercise: { id: 'ex-1', type: 'multiple_choice', question: 'Q?', correctAnswer: 'A', difficulty: 'beginner' },
      user_answer: 'A',
      skill_level: 'beginner',
    });

    expect(result).toEqual(evalResult);
    expect(mockFetch).toHaveBeenCalledWith('/api/exercises/evaluate', expect.objectContaining({ method: 'POST' }));
  });
});

describe('getExplanation', () => {
  it('posts an explain request', async () => {
    const data = { explanation: 'Docker is a containerization tool.', fallback: false };
    mockFetch.mockReturnValueOnce(jsonResponse(data));

    const result = await getExplanation({ topic: 'docker', concept: 'containers', skill_level: 'beginner' });
    expect(result).toEqual(data);
  });
});

describe('getHint', () => {
  it('posts a hint request', async () => {
    const data = { hint: 'Think about isolation.', fallback: false };
    mockFetch.mockReturnValueOnce(jsonResponse(data));

    const result = await getHint({
      exercise: { id: 'ex-1', type: 'multiple_choice', question: 'Q?', correctAnswer: 'A', difficulty: 'beginner' },
      attempt_number: 1,
      skill_level: 'beginner',
    });
    expect(result).toEqual(data);
  });
});

describe('submitChallenge', () => {
  it('posts a challenge submission', async () => {
    const data = { allPassed: true, testCaseResults: [], executionTimeMs: 42 };
    mockFetch.mockReturnValueOnce(jsonResponse(data));

    const result = await submitChallenge({
      exercise_id: 'ch-1',
      code: 'print("hello")',
      language: 'python',
      test_cases: [{ id: 'tc-1', input: '', expected_output: 'hello', is_hidden: false }],
    });
    expect(result).toEqual(data);
    expect(mockFetch).toHaveBeenCalledWith('/api/challenges/submit', expect.objectContaining({ method: 'POST' }));
  });
});

describe('getInstructorGuidance', () => {
  it('posts a guidance request', async () => {
    const data = { progressSummary: 'Good progress', weakAreas: [], recommendations: [], motivationalMessage: 'Keep going!' };
    mockFetch.mockReturnValueOnce(jsonResponse(data));

    const result = await getInstructorGuidance({
      completed_modules: {},
      current_module: {},
      exercise_accuracy: {},
      interests: ['docker'],
      skill_level: 'beginner',
    });
    expect(result).toEqual(data);
  });
});

// ---------------------------------------------------------------------------
// Error handling & retry
// ---------------------------------------------------------------------------

describe('error handling', () => {
  it('throws ApiError with message from server on 4xx', async () => {
    mockFetch.mockReturnValueOnce(errorResponse(404, { message: 'Path not found' }));

    await expect(getCatalog()).rejects.toThrow(ApiError);
    await expect(getCatalog()).rejects.toThrow(); // second call also fails since mock is consumed
  });

  it('does not retry on 4xx client errors', async () => {
    mockFetch.mockReturnValue(errorResponse(422, { message: 'Validation error' }));

    await expect(getCatalog()).rejects.toThrow('Validation error');
    // Only 1 call — no retry for client errors
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('retries once on network/server error then succeeds', async () => {
    const data = { categories: [] };
    mockFetch
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockReturnValueOnce(jsonResponse(data));

    const result = await getCatalog();
    expect(result).toEqual(data);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('throws user-friendly message after retry exhaustion on network error', async () => {
    mockFetch
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(getCatalog()).rejects.toThrow('Unable to reach the server');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('retries once on 500 server error then succeeds', async () => {
    const data = { categories: [] };
    mockFetch
      .mockReturnValueOnce(errorResponse(500))
      .mockReturnValueOnce(jsonResponse(data));

    const result = await getCatalog();
    expect(result).toEqual(data);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
