import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import LearningPathDetail from './LearningPathDetail';
import * as api from '../services/api';

vi.mock('../services/api');

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('LearningPathDetail', () => {
  it('renders path title and module links after load', async () => {
    vi.spyOn(api, 'getPath').mockResolvedValue({
      id: 'fastapi',
      title: 'FastAPI',
      description: 'Build APIs',
      category: 'web-frameworks',
      estimatedDuration: '2 hours',
      difficulty: 'intermediate',
      modules: [
        { id: '01-intro', title: 'Introduction', order: 1 },
        { id: '02-next', title: 'Next', order: 2 },
      ],
    });

    render(
      <MemoryRouter initialEntries={['/paths/fastapi']}>
        <Routes>
          <Route path="/paths/:pathId" element={<LearningPathDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /fastapi/i })).toBeDefined();
    });
    expect(screen.getByText('Introduction')).toBeDefined();
    expect(screen.getByText('Next')).toBeDefined();
    expect(screen.getByRole('link', { name: /introduction/i }).getAttribute('href')).toBe(
      '/paths/fastapi/modules/01-intro',
    );
  });

  it('shows error when path fails to load', async () => {
    vi.spyOn(api, 'getPath').mockRejectedValue(new Error('404'));

    render(
      <MemoryRouter initialEntries={['/paths/missing']}>
        <Routes>
          <Route path="/paths/:pathId" element={<LearningPathDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/could not be loaded/i)).toBeDefined();
    });
  });
});
