import { Store } from 'lucide-react';
import type { Metadata } from 'next';
import { PlaceholderPage } from '@/features/placeholder-page';

export const metadata: Metadata = { title: 'List your venue' };

// Signed-in only (the proxy guards /owner). The onboarding wizard arrives in M3.
export default function NewVenuePage() {
  return (
    <PlaceholderPage
      title="List your venue"
      icon={Store}
      milestone="M3"
      description="A short wizard: basics, location, courts, hours and prices, photos, then review."
    />
  );
}
