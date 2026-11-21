import { Store } from 'lucide-react';
import type { Metadata } from 'next';
import { EmptyState } from '@/components/states/empty-state';

export const metadata: Metadata = { title: 'For venues' };

/** M0 placeholder; M2 brings the owner pitch and pricing. */
export default function ForVenuesPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-16 sm:px-6">
      <h1 className="font-display text-4xl text-ink sm:text-5xl">For venues</h1>
      <EmptyState
        icon={Store}
        title="Owner tools are on the way"
        description="Courtify for venue owners is being built. The full pitch and pricing will live here."
      />
    </div>
  );
}
