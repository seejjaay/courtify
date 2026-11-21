import { roleAtLeast, type VenueRole } from '@/lib/permissions';

export type OwnerSectionSlug =
  | 'today' | 'calendar' | 'bookings' | 'check-in' | 'payments'
  | 'courts' | 'pricing' | 'hours' | 'profile'
  | 'analytics' | 'activity'
  | 'team' | 'billing' | 'settings';

export type OwnerSectionRule = {
  slug: OwnerSectionSlug;
  label: string;
  group: 'Operate' | 'Setup' | 'Insights' | 'Account';
  minRole: VenueRole;
  proOnly: boolean;
  mobilePrimary?: boolean;
};

/**
 * Who may open each venue-dashboard section. Plain data with no UI imports, so the proxy can use
 * it to answer a real 404 before rendering. Staff see Setup read-only (built in M3).
 */
export const OWNER_SECTION_RULES: readonly OwnerSectionRule[] = [
  { slug: 'today', label: 'Today', group: 'Operate', minRole: 'staff', proOnly: false, mobilePrimary: true },
  { slug: 'calendar', label: 'Calendar', group: 'Operate', minRole: 'staff', proOnly: false, mobilePrimary: true },
  { slug: 'bookings', label: 'Bookings', group: 'Operate', minRole: 'staff', proOnly: false },
  { slug: 'check-in', label: 'Check-in', group: 'Operate', minRole: 'staff', proOnly: false, mobilePrimary: true },
  { slug: 'payments', label: 'Payments', group: 'Operate', minRole: 'manager', proOnly: false, mobilePrimary: true },
  { slug: 'courts', label: 'Courts', group: 'Setup', minRole: 'staff', proOnly: false },
  { slug: 'pricing', label: 'Pricing', group: 'Setup', minRole: 'staff', proOnly: false },
  { slug: 'hours', label: 'Hours & policies', group: 'Setup', minRole: 'staff', proOnly: false },
  { slug: 'profile', label: 'Venue profile', group: 'Setup', minRole: 'staff', proOnly: false },
  { slug: 'analytics', label: 'Analytics', group: 'Insights', minRole: 'manager', proOnly: true },
  { slug: 'activity', label: 'Activity log', group: 'Insights', minRole: 'manager', proOnly: true },
  { slug: 'team', label: 'Team', group: 'Account', minRole: 'owner', proOnly: true },
  { slug: 'billing', label: 'Billing', group: 'Account', minRole: 'owner', proOnly: false },
  { slug: 'settings', label: 'Settings', group: 'Account', minRole: 'owner', proOnly: false },
];

export function canOpenOwnerSection(role: VenueRole | null | undefined, slug: string): boolean {
  const rule = OWNER_SECTION_RULES.find((r) => r.slug === slug);
  return !!rule && roleAtLeast(role, rule.minRole);
}
