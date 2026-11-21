import { CalendarDays } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState } from '@/components/states/empty-state';
import { buttonVariants } from '@/components/ui/button';

export const metadata: Metadata = { title: 'My bookings' };

/** M0 landing for signed-in players; M3 lists upcoming and past bookings here. */
export default function MyBookingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-16 sm:px-6">
      <h1 className="font-display text-4xl text-ink sm:text-5xl">My bookings</h1>
      <EmptyState
        icon={CalendarDays}
        title="Your bookings will show up here"
        description="Upcoming and past games, with your pass for each one."
        action={
          <Link href="/courts" className={buttonVariants()}>
            Find a court
          </Link>
        }
      />
    </div>
  );
}
