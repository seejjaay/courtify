import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { BOOKING_STATUSES } from '@/lib/booking/status';
import { StatusChip } from './status-chip';

const WORDS = {
  held: 'Held',
  pending_verification: 'Verifying',
  confirmed: 'Confirmed',
  checked_in: 'Checked in',
  completed: 'Completed',
  cancelled: 'Cancelled',
  expired: 'Expired',
  no_show: 'No-show',
} as const;

it.each(BOOKING_STATUSES)('%s prints its word and an icon', (status) => {
  const { container } = render(<StatusChip status={status} />);
  expect(screen.getByText(WORDS[status])).toBeInTheDocument();
  expect(container.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
});

it('every status has a distinct variant', () => {
  const variants = BOOKING_STATUSES.map((status) =>
    render(<StatusChip status={status} />).container.firstElementChild!.getAttribute('data-variant'),
  );
  expect(new Set(variants).size).toBe(BOOKING_STATUSES.length);
});
