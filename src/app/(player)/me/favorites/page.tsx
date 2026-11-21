import { Heart } from 'lucide-react';
import type { Metadata } from 'next';
import { PlaceholderPage } from '@/features/placeholder-page';

export const metadata: Metadata = { title: 'Saved venues' };

export default function FavoritesPage() {
  return <PlaceholderPage title="Saved venues" icon={Heart} milestone="M2" description="Venues you save while browsing will gather here." />;
}
