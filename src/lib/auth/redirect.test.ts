import { expect, it } from 'vitest';
import { safeNextPath } from './redirect';

it.each([
  ['/me/bookings?tab=past', '/me/bookings?tab=past'],
  ['//evil.example', '/'],
  ['https://evil.example', '/'],
  ['/\\evil.example', '/'],
  ['javascript:alert(1)', '/'],
  ['me', '/'],
  ['', '/'],
  [null, '/'],
  // URL parsers drop tabs and newlines, which turns this into //evil.example.
  ['/\t/evil.example', '/'],
])('safeNextPath(%s) → %s', (input, expected) => expect(safeNextPath(input)).toBe(expected));

it('uses the given fallback', () => {
  expect(safeNextPath('https://evil.example', '/owner')).toBe('/owner');
});
