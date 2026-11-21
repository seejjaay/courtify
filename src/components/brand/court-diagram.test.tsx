import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { CourtDiagram } from './court-diagram';
import { COURT_LINE_COUNT, COURT_SPECS, type SportSlug } from './court-specs';

const SPORTS = Object.keys(COURT_SPECS) as SportSlug[];

it('covers all six racket sports', () => {
  expect(SPORTS.sort()).toEqual(['badminton', 'padel', 'pickleball', 'squash', 'table-tennis', 'tennis']);
});

it.each(SPORTS)('%s renders an accessible 16-line diagram', (sport) => {
  render(<CourtDiagram sport={sport} />);
  expect(screen.getByRole('img', { name: `${COURT_SPECS[sport].label} court diagram` })).toBeInTheDocument();
  expect(COURT_SPECS[sport].lines).toHaveLength(COURT_LINE_COUNT);
});

it.each(SPORTS)('%s lines stay inside the court', (sport) => {
  const { width, length, lines } = COURT_SPECS[sport];
  for (const [x1, y1, x2, y2] of lines) {
    for (const x of [x1, x2]) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(width);
    }
    for (const y of [y1, y2]) {
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(length);
    }
  }
});
