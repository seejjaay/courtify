import { expect, it } from 'vitest';
import { BLOCKING_STATUSES, BOOKING_STATUSES } from './status';

it('lists the eight booking states in lifecycle order', () => {
  expect(BOOKING_STATUSES).toEqual([
    'held', 'pending_verification', 'confirmed', 'checked_in', 'completed', 'cancelled', 'expired', 'no_show',
  ]);
});

it('only live states hold a court', () => {
  expect(BLOCKING_STATUSES).toEqual(['held', 'pending_verification', 'confirmed', 'checked_in']);
});
