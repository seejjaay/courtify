import { MapPin } from 'lucide-react';
import type { Metadata } from 'next';
import { EmptyState } from '@/components/states/empty-state';

export const metadata: Metadata = { title: 'Find courts' };

/** M0 placeholder; M2 brings search with filters, list and map. */
export default function CourtsPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-16 sm:px-6">
      <h1 className="font-display text-4xl text-ink sm:text-5xl">Find courts</h1>
      <EmptyState
        icon={MapPin}
        title="Court search is coming soon"
        description="Search by sport, city and time is being built. Venues will show up here once they go live."
      />
    </div>
  );
}
