// Feature: tech-learning-platform, Property 16: Re-engagement message threshold
//
// For any learner progress state where the lastActivityTimestamp is more than
// 3 days before the current time, shouldShowReEngagement returns true.
// For any progress state where the last activity is within 3 days,
// shouldShowReEngagement returns false.

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { shouldShowReEngagement } from './progressStore';

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

describe('Property 16: Re-engagement message threshold', () => {
  it('returns true when lastActivityTimestamp is more than 3 days before now', () => {
    fc.assert(
      fc.property(
        // Generate a "now" date within a reasonable range
        fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }),
        // Generate an offset in ms strictly greater than 3 days (3 days + 1ms to 30 days)
        fc.integer({ min: 1, max: 27 * 24 * 60 * 60 * 1000 }),
        (now, extraMs) => {
          const lastActivity = new Date(now.getTime() - THREE_DAYS_MS - extraMs);
          const result = shouldShowReEngagement(lastActivity.toISOString(), now);
          expect(result).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('returns false when lastActivityTimestamp is within 3 days of now', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }),
        // Generate an offset from 0 to exactly 3 days (inclusive boundary — still within 3 days)
        fc.integer({ min: 0, max: THREE_DAYS_MS }),
        (now, offsetMs) => {
          const lastActivity = new Date(now.getTime() - offsetMs);
          const result = shouldShowReEngagement(lastActivity.toISOString(), now);
          expect(result).toBe(false);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('returns false when lastActivityTimestamp is undefined', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }),
        (now) => {
          expect(shouldShowReEngagement(undefined, now)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns false when lastActivityTimestamp is in the future', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }),
        fc.integer({ min: 1, max: 30 * 24 * 60 * 60 * 1000 }),
        (now, futureMs) => {
          const futureTimestamp = new Date(now.getTime() + futureMs);
          const result = shouldShowReEngagement(futureTimestamp.toISOString(), now);
          expect(result).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});
