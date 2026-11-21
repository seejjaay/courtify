/**
 * Booking codes: 6 characters with no look-alikes (no I, L, O, 0, 1).
 * Must match `public.gen_booking_code()` in the database.
 */
export const BOOKING_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

/** Normalises what someone typed at the front desk; null if it can't be a code. */
export function normalizeBookingCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[\s-]/g, '');
  if (code.length !== CODE_LENGTH) return null;
  return [...code].every((char) => BOOKING_CODE_ALPHABET.includes(char)) ? code : null;
}

export function formatBookingCode(code: string): string {
  return `${code.slice(0, 3)}-${code.slice(3)}`;
}
