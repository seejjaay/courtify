import { UserRound } from 'lucide-react';
import type { Metadata } from 'next';
import { PlaceholderPage } from '@/features/placeholder-page';

export const metadata: Metadata = { title: 'Profile' };

export default function ProfilePage() {
  return <PlaceholderPage title="Profile" icon={UserRound} milestone="M4" description="Your name, contact number and account settings." />;
}
