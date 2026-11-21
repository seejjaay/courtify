import 'server-only';
import type { Route } from 'next';
import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';
import { roleAtLeast, type VenueRole } from '@/lib/permissions';
import { createServerSupabase } from '@/lib/supabase/server';
import { safeNextPath } from './redirect';

export type Viewer = {
  id: string;
  email: string | null;
  fullName: string;
  isAdmin: boolean;
  venues: { id: string; name: string; slug: string; status: string; role: VenueRole; hasPro: boolean }[];
};

/**
 * The signed-in user, once per request. Identity comes from verified JWT claims; admin status and
 * venue roles come from the database (platform_admins, venue_members), never from user metadata.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getClaims();
  const claims = auth?.claims;
  if (!claims?.sub) return null;

  const [profile, venues, admin] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', claims.sub).maybeSingle(),
    supabase.rpc('my_venues'),
    supabase.rpc('is_platform_admin'),
  ]);
  if (profile.error) throw profile.error;
  if (venues.error) throw venues.error;
  if (admin.error) throw admin.error;

  return {
    id: claims.sub,
    email: typeof claims.email === 'string' ? claims.email : null,
    fullName: profile.data?.full_name ?? '',
    isAdmin: admin.data === true,
    venues: venues.data.map((venue) => ({
      id: venue.id,
      name: venue.name,
      slug: venue.slug,
      status: venue.status,
      role: venue.role,
      hasPro: venue.has_pro,
    })),
  };
});

/** For pages behind sign-in: sends anonymous visitors to /login and back here afterwards. */
export async function requireViewer(nextPath: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(safeNextPath(nextPath))}` as Route);
  return viewer;
}

/** Admin pages answer 404 to everyone else, so their existence isn't advertised. */
export async function requireAdmin(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) notFound();
  return viewer;
}

export async function requireVenueRole(
  venueId: string,
  min: VenueRole,
): Promise<{ viewer: Viewer; venue: Viewer['venues'][number] }> {
  const viewer = await getViewer();
  const venue = viewer?.venues.find((v) => v.id === venueId);
  if (!viewer || !venue || !roleAtLeast(venue.role, min)) notFound();
  return { viewer, venue };
}
