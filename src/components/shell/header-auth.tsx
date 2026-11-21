import { Suspense } from 'react';
import { DelayedSkeleton } from '@/components/states/delayed-skeleton';
import { AuthSlot } from './auth-slot';

/** The auth slot every SiteHeader gets: the session streams in without holding up the static shell. */
export function HeaderAuth() {
  return (
    <Suspense fallback={<DelayedSkeleton lines={1} className="w-24" />}>
      <AuthSlot />
    </Suspense>
  );
}
