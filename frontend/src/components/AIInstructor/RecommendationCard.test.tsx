import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RecommendationCard from './RecommendationCard';
import type { NextStepRecommendation } from '../../types';

function renderCard(rec: NextStepRecommendation) {
  return render(
    <MemoryRouter>
      <RecommendationCard recommendation={rec} />
    </MemoryRouter>,
  );
}

describe('RecommendationCard', () => {
  const continueRec: NextStepRecommendation = {
    type: 'continue_path',
    pathId: 'fastapi',
    moduleId: '02-routes',
    reason: 'You were making great progress on FastAPI.',
  };

  const reviewRec: NextStepRecommendation = {
    type: 'review_module',
    pathId: 'docker',
    moduleId: '01-basics',
    reason: 'Your accuracy on Docker basics is below 60%.',
  };

  const newPathRec: NextStepRecommendation = {
    type: 'start_new_path',
    pathId: 'kubernetes',
    reason: 'Based on your Docker skills, Kubernetes is a great next step.',
  };

  it('renders continue_path type with correct label and navigates to module', () => {
    renderCard(continueRec);
    expect(screen.getByText('Continue Path')).toBeDefined();
    expect(screen.getByText('▶')).toBeDefined();
    expect(screen.getByText(continueRec.reason)).toBeDefined();
    const link = screen.getByRole('link', { name: /Continue Path/i });
    expect(link.getAttribute('href')).toBe('/paths/fastapi/modules/02-routes');
  });

  it('renders review_module type with correct label', () => {
    renderCard(reviewRec);
    expect(screen.getByText('Review Module')).toBeDefined();
    expect(screen.getByText(reviewRec.reason)).toBeDefined();
  });

  it('renders start_new_path type with path-only href', () => {
    renderCard(newPathRec);
    expect(screen.getByText('Start New Path')).toBeDefined();
    expect(screen.getByText(newPathRec.reason)).toBeDefined();
    const link = screen.getByRole('link', { name: /Start New Path/i });
    expect(link.getAttribute('href')).toBe('/paths/kubernetes');
  });

  it('shows module id in secondary line when present', () => {
    renderCard(continueRec);
    expect(screen.getByText(/fastapi/)).toBeDefined();
    expect(screen.getByText(/02-routes/)).toBeDefined();
  });

  it('has accessible link name including reason', () => {
    renderCard(continueRec);
    expect(
      screen.getByRole('link', {
        name: 'Continue Path: You were making great progress on FastAPI.',
      }),
    ).toBeDefined();
  });
});
