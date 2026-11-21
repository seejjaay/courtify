import { expect, it } from 'vitest';
import { roleAtLeast } from './permissions';

it('ranks owner above manager above staff', () => {
  expect(roleAtLeast('owner', 'manager')).toBe(true);
  expect(roleAtLeast('manager', 'manager')).toBe(true);
  expect(roleAtLeast('staff', 'manager')).toBe(false);
});

it('treats no role as below every role', () => {
  expect(roleAtLeast(null, 'staff')).toBe(false);
  expect(roleAtLeast(undefined, 'staff')).toBe(false);
});
