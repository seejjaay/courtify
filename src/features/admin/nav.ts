import { BadgeCheck, Building2, CalendarDays, CreditCard, type LucideIcon, ScrollText, Settings, Shapes, Users } from 'lucide-react';

export type AdminSectionSlug = 'approvals' | 'subscriptions' | 'venues' | 'users' | 'bookings' | 'catalog' | 'audit' | 'settings';
export type AdminSection = { slug: AdminSectionSlug; label: string; icon: LucideIcon };

/** The admin sidebar after the overview, which lives at /admin. */
export const ADMIN_SECTIONS: readonly AdminSection[] = [
  { slug: 'approvals', label: 'Venue approvals', icon: BadgeCheck },
  { slug: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
  { slug: 'venues', label: 'Venues', icon: Building2 },
  { slug: 'users', label: 'Users', icon: Users },
  { slug: 'bookings', label: 'Bookings', icon: CalendarDays },
  { slug: 'catalog', label: 'Catalog', icon: Shapes },
  { slug: 'audit', label: 'Audit log', icon: ScrollText },
  { slug: 'settings', label: 'Platform settings', icon: Settings },
];

export function findAdminSection(slug: string): AdminSection | undefined {
  return ADMIN_SECTIONS.find((section) => section.slug === slug);
}
