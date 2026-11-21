import { describe, expect, it } from 'vitest';
import { BOOKING_CODE_ALPHABET, formatBookingCode, normalizeBookingCode } from './codes';

describe('normalizeBookingCode', () => {
  it('uppercases and strips separators and spaces', () => {
    expect(normalizeBookingCode(' k7q-2f9 ')).toBe('K7Q2F9');
  });
  it('rejects codes of the wrong length', () => {
    expect(normalizeBookingCode('K7Q2F')).toBeNull();
  });
  it('rejects characters outside the unambiguous alphabet', () => {
    expect(normalizeBookingCode('K7Q2F0')).toBeNull();
    expect(normalizeBookingCode('K7Q2FI')).toBeNull();
  });
});

describe('formatBookingCode', () => {
  it('groups as XXX-XXX', () => {
    expect(formatBookingCode('K7Q2F9')).toBe('K7Q-2F9');
  });
});

it('alphabet leaves out look-alike characters', () => {
  expect(BOOKING_CODE_ALPHABET).toBe('ABCDEFGHJKMNPQRSTUVWXYZ23456789');
});
