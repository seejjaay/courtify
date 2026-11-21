import { expect, it } from 'vitest';
import type { VenueRole } from '@/lib/permissions';
import { OWNER_SECTIONS, ownerNavFor } from './nav';

const slugs = (role: VenueRole, pro: boolean) => ownerNavFor(role, pro).map((item) => item.section.slug);

it('staff get operate and setup screens only', () => {
  expect(slugs('staff', true)).toEqual(expect.not.arrayContaining(['payments', 'analytics', 'activity', 'team', 'billing', 'settings']));
});

it('managers add payments and insights, not account screens', () => {
  expect(slugs('manager', true)).toEqual(expect.not.arrayContaining(['team', 'billing', 'settings']));
  expect(slugs('manager', true)).toEqual(expect.arrayContaining(['payments', 'analytics', 'activity']));
});

it('owners see all fourteen sections', () => {
  expect(slugs('owner', true)).toHaveLength(14);
});

it('without Pro, analytics, activity and team are locked', () => {
  expect(ownerNavFor('owner', false).filter((item) => item.locked).map((item) => item.section.slug)).toEqual(['analytics', 'activity', 'team']);
});

it('the mobile bar puts Check-in in the centre for staff and managers alike', () => {
  const primary = (role: VenueRole) => ownerNavFor(role, true).filter((i) => i.section.mobilePrimary).map((i) => i.section.slug);
  expect(primary('staff')[2]).toBe('check-in');
  expect(primary('manager')[2]).toBe('check-in');
  expect(OWNER_SECTIONS.filter((s) => s.mobilePrimary).map((s) => s.slug)).toEqual(['today', 'calendar', 'check-in', 'payments']);
});
