import { Store } from 'lucide-react';
import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { DelayedSkeleton } from '@/components/states/delayed-skeleton';
import { EmptyState } from '@/components/states/empty-state';
import { buttonVariants } from '@/components/ui/button';
import { requireViewer } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Your venues' };

const STATUS_WORD: Record<string, string> = {
  draft: 'Draft',
  pending_review: 'In review',
  active: 'Listed',
  rejected: 'Needs changes',
  suspended: 'Suspended',
};

// No venues: invite to list one. One venue: straight to its dashboard. Several: pick one.
async function VenueChooser() {
  const viewer = await requireViewer('/owner');
  if (viewer.venues.length === 1) redirect(`/owner/${viewer.venues[0]!.id}/today` as Route);

  if (viewer.venues.length === 0) {
    return (
      <EmptyState
        icon={Store}
        title="List your venue"
        description="Put your courts in front of players and take bookings online."
        action={
          <Link href="/owner/new" className={buttonVariants()}>
            List your venue
          </Link>
        }
      />
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {viewer.venues.map((venue) => (
        <li key={venue.id}>
          <Link
            href={`/owner/${venue.id}/today` as Route}
            className="flex h-full flex-col gap-2 rounded-card border border-greige bg-chalk p-5 transition-shadow hover:shadow-sun"
          >
            <span className="font-medium text-ink">{venue.name}</span>
            <span className="text-sm text-ink-soft">
              {STATUS_WORD[venue.status] ?? venue.status} · {venue.hasPro ? 'Pro' : 'Free plan'} · <span className="capitalize">{venue.role}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function OwnerHomePage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10 sm:px-6 md:py-14">
      <h1 className="font-display text-4xl text-ink">Your venues</h1>
      <Suspense fallback={<DelayedSkeleton lines={4} />}>
        <VenueChooser />
      </Suspense>
    </div>
  );
}
