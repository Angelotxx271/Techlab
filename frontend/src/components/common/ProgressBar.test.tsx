import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProgressBar from './ProgressBar';

describe('ProgressBar', () => {
  it('renders the percentage text', () => {
    render(<ProgressBar percentage={42} />);
    expect(screen.getByText('42%')).toBeDefined();
  });

  it('renders with a label', () => {
    render(<ProgressBar percentage={75} label="Docker progress" />);
    expect(screen.getByText('Docker progress')).toBeDefined();
    expect(screen.getByText('75%')).toBeDefined();
  });

  it('has correct ARIA attributes', () => {
    render(<ProgressBar percentage={60} label="Test" />);
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('60');
    expect(bar.getAttribute('aria-valuemin')).toBe('0');
    expect(bar.getAttribute('aria-valuemax')).toBe('100');
  });

  it('clamps percentage below 0 to 0', () => {
    render(<ProgressBar percentage={-10} />);
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('0');
    expect(screen.getByText('0%')).toBeDefined();
  });

  it('clamps percentage above 100 to 100', () => {
    render(<ProgressBar percentage={150} />);
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('100');
    expect(screen.getByText('100%')).toBeDefined();
  });
});
