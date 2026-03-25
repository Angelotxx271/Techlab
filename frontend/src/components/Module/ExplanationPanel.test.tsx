import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import ExplanationPanel from './ExplanationPanel';

vi.mock('../../services/api', () => ({
  getExplanation: vi.fn(),
}));

import { getExplanation } from '../../services/api';
const mockGetExplanation = vi.mocked(getExplanation);

const baseProps = {
  topic: 'docker',
  concept: 'Containers Basics',
  baseExplanation: 'Docker is a platform for containers.',
  skillLevel: 'beginner' as const,
};

beforeEach(() => {
  mockGetExplanation.mockReset();
});

describe('ExplanationPanel', () => {
  it('shows loading spinner while fetching', () => {
    mockGetExplanation.mockReturnValue(new Promise(() => {}));
    render(<ExplanationPanel {...baseProps} />);
    expect(screen.getByText('Tailoring explanation for this level…')).toBeTruthy();
  });

  it('displays AI explanation on success', async () => {
    mockGetExplanation.mockResolvedValueOnce({
      explanation: 'AI-generated explanation about containers.',
    });
    render(<ExplanationPanel {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByText('AI-generated explanation about containers.')).toBeTruthy();
    });
    expect(screen.queryByText(/Retry AI explanation/)).toBeNull();
  });

  it('calls getExplanation with correct params for default tab', async () => {
    mockGetExplanation.mockResolvedValueOnce({ explanation: 'test' });
    render(<ExplanationPanel {...baseProps} />);

    await waitFor(() => {
      expect(mockGetExplanation).toHaveBeenCalledWith({
        topic: 'docker',
        concept: 'Containers Basics',
        skill_level: 'beginner',
      });
    });
  });

  it('fetches again when switching to intermediate tab', async () => {
    mockGetExplanation
      .mockResolvedValueOnce({ explanation: 'Beginner version' })
      .mockResolvedValueOnce({ explanation: 'Intermediate version' });

    render(<ExplanationPanel {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByText('Beginner version')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('tab', { name: /Intermediate/i }));

    await waitFor(() => {
      expect(mockGetExplanation).toHaveBeenCalledTimes(2);
      expect(mockGetExplanation).toHaveBeenLastCalledWith({
        topic: 'docker',
        concept: 'Containers Basics',
        skill_level: 'intermediate',
      });
    });
    await waitFor(() => {
      expect(screen.getByText('Intermediate version')).toBeTruthy();
    });
  });

  it('falls back to base explanation on API error with retry button', async () => {
    mockGetExplanation.mockRejectedValueOnce(new Error('Network error'));
    render(<ExplanationPanel {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByText('Docker is a platform for containers.')).toBeTruthy();
    });
    expect(screen.getByText(/Retry AI explanation for Beginner/)).toBeTruthy();
  });

  it('shows AI-enhanced fallback note when fallback flag is true', async () => {
    mockGetExplanation.mockResolvedValueOnce({
      explanation: 'Fallback explanation from server.',
      fallback: true,
    });
    render(<ExplanationPanel {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByText('Fallback explanation from server.')).toBeTruthy();
    });
    expect(screen.getByText(/curated fallback text/i)).toBeTruthy();
    expect(screen.queryByText(/Retry AI explanation/)).toBeNull();
  });

  it('retries active tab when retry button is clicked', async () => {
    mockGetExplanation.mockRejectedValueOnce(new Error('fail'));
    render(<ExplanationPanel {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Retry AI explanation for Beginner/)).toBeTruthy();
    });

    mockGetExplanation.mockResolvedValueOnce({
      explanation: 'AI explanation after retry.',
    });
    fireEvent.click(screen.getByText(/Retry AI explanation for Beginner/));

    await waitFor(() => {
      expect(screen.getByText('AI explanation after retry.')).toBeTruthy();
    });
  });

  it('falls back to base explanation on timeout', async () => {
    mockGetExplanation.mockReturnValue(new Promise(() => {}));
    render(<ExplanationPanel {...baseProps} timeoutMs={50} />);

    expect(screen.getByText('Tailoring explanation for this level…')).toBeTruthy();

    await waitFor(
      () => {
        expect(screen.getByText(/Retry AI explanation for Beginner/)).toBeTruthy();
      },
      { timeout: 4000 },
    );
    expect(
      within(screen.getByRole('tabpanel')).getByText('Docker is a platform for containers.'),
    ).toBeTruthy();
  });

  it('shows bundled course notes in details', async () => {
    mockGetExplanation.mockResolvedValueOnce({ explanation: 'AI text' });
    render(<ExplanationPanel {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByText('AI text')).toBeTruthy();
    });
    expect(screen.getByText('Course notes & examples (from this path)')).toBeTruthy();
    expect(screen.getByText('Docker is a platform for containers.')).toBeTruthy();
  });
});
