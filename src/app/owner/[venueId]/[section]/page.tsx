import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { findOwnerSection } from '@/features/owner/nav';
import { PlaceholderPage } from '@/features/placeholder-page';
import { requireVenueRole } from '@/lib/auth/session';
import { roleAtLeast } from '@/lib/permissions';

// Blocking re-check of the section and role; src/proxy.ts already answered 404 for these.
export const instant = false;

export async function generateMetadata({ params }: PageProps<'/owner/[venueId]/[section]'>): Promise<Metadata> {
  const { section } = await params;
  return { title: findOwnerSection(section)?.label ?? 'Page not found' };
}

export default async function OwnerSectionPage({ params }: PageProps<'/owner/[venueId]/[section]'>) {
  const { venueId, section: slug } = await params;
  const { venue } = await requireVenueRole(venueId, 'staff');
  const section = findOwnerSection(slug);
  if (!section || !roleAtLeast(venue.role, section.minRole)) notFound();

  return <PlaceholderPage title={section.label} icon={section.icon} milestone="M3" />;
}
