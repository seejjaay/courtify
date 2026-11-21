/** Mirrors the `booking_status` enum in SQL, in lifecycle order. */
export const BOOKING_STATUSES = [
  'held',
  'pending_verification',
  'confirmed',
  'checked_in',
  'completed',
  'cancelled',
  'expired',
  'no_show',
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** States that occupy a court (the overlap exclusion constraint's WHERE clause). */
export const BLOCKING_STATUSES: readonly BookingStatus[] = ['held', 'pending_verification', 'confirmed', 'checked_in'];
