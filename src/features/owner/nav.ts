import {
  CalendarDays,
  ChartColumn,
  ClipboardList,
  Clock,
  Grid2x2,
  History,
  LayoutDashboard,
  type LucideIcon,
  QrCode,
  ReceiptText,
  Settings,
  Store,
  Tag,
  Users,
  Wallet,
} from 'lucide-react';
import { roleAtLeast, type VenueRole } from '@/lib/permissions';
import { OWNER_SECTION_RULES, type OwnerSectionRule, type OwnerSectionSlug } from './access';

export type { OwnerSectionSlug } from './access';
export type OwnerSection = OwnerSectionRule & { icon: LucideIcon };

const ICONS: Record<OwnerSectionSlug, LucideIcon> = {
  today: LayoutDashboard,
  calendar: CalendarDays,
  bookings: ClipboardList,
  'check-in': QrCode,
  payments: ReceiptText,
  courts: Grid2x2,
  pricing: Tag,
  hours: Clock,
  profile: Store,
  analytics: ChartColumn,
  activity: History,
  team: Users,
  billing: Wallet,
  settings: Settings,
};

/**
 * The venue dashboard, in sidebar order. Locked Pro sections stay visible with a "Pro" mark;
 * operational screens stay open and gate creation inside.
 */
export const OWNER_SECTIONS: readonly OwnerSection[] = OWNER_SECTION_RULES.map((rule) => ({ ...rule, icon: ICONS[rule.slug] }));

export const OWNER_GROUPS = ['Operate', 'Setup', 'Insights', 'Account'] as const;

/** The sections a role may open, each marked locked when it needs Pro the venue doesn't have. */
export function ownerNavFor(role: VenueRole, hasPro: boolean): { section: OwnerSection; locked: boolean }[] {
  return OWNER_SECTIONS.filter((section) => roleAtLeast(role, section.minRole)).map((section) => ({
    section,
    locked: section.proOnly && !hasPro,
  }));
}

export function findOwnerSection(slug: string): OwnerSection | undefined {
  return OWNER_SECTIONS.find((section) => section.slug === slug);
}
