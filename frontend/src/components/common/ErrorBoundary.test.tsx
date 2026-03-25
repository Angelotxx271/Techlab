import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

// A component that throws on render
function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>Child content</div>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suppress React error boundary console output during tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Child content')).toBeDefined();
  });

  it('renders error page when a child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('Something went wrong')).toBeDefined();
    expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeDefined();
  });

  it('renders a retry button on error', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    );
    const retryButton = screen.getByRole('button', { name: 'Retry' });
    expect(retryButton).toBeDefined();
  });

  it('calls window.location.reload when retry is clicked', () => {
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock },
      writable: true,
    });

    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it('does not show error UI when children render successfully', () => {
    render(
      <ErrorBoundary>
        <div>Safe content</div>
      </ErrorBoundary>
    );
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('Safe content')).toBeDefined();
  });
});
