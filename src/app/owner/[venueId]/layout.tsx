import { AppSidebar, type SidebarGroup } from '@/components/shell/app-sidebar';
import { MobileTabBar, MoreSheet, type TabItem } from '@/components/shell/mobile-tab-bar';
import { OWNER_GROUPS, ownerNavFor } from '@/features/owner/nav';
import { VenueSwitcher } from '@/features/owner/venue-switcher';
import { requireVenueRole } from '@/lib/auth/session';

// Blocking re-check (defence in depth). The real 404 status comes from src/proxy.ts: with Cache
// Components the status is fixed once the shell streams, so only the proxy can still set it.
export const instant = false;

export default async function VenueLayout({ children, params }: LayoutProps<'/owner/[venueId]'>) {
  const { venueId } = await params;
  const { viewer, venue } = await requireVenueRole(venueId, 'staff');
  const nav = ownerNavFor(venue.role, venue.hasPro);
  const href = (slug: string) => `/owner/${venue.id}/${slug}`;

  const groups: SidebarGroup[] = OWNER_GROUPS.map((title) => ({
    title,
    items: nav
      .filter(({ section }) => section.group === title)
      .map(({ section, locked }) => ({
        href: href(section.slug),
        label: section.label,
        icon: <section.icon aria-hidden="true" />,
        locked,
      })),
  })).filter((group) => group.items.length > 0);

  const tabs: TabItem[] = nav
    .filter(({ section }) => section.mobilePrimary)
    .map(({ section }) => ({
      href: href(section.slug),
      label: section.label,
      icon: <section.icon aria-hidden="true" />,
      emphasis: section.slug === 'check-in',
    }));

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <AppSidebar
        label="Venue"
        shell="owner"
        header={<VenueSwitcher current={venue} venues={viewer.venues} />}
        groups={groups}
      />
      <div className="flex flex-1 flex-col pb-24 md:pb-0">{children}</div>
      <MobileTabBar label="Venue tabs" items={tabs} more={<MoreSheet groups={groups} />} />
    </div>
  );
}
