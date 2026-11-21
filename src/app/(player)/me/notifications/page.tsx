import { Bell } from 'lucide-react';
import type { Metadata } from 'next';
import { PlaceholderPage } from '@/features/placeholder-page';

export const metadata: Metadata = { title: 'Notifications' };

export default function NotificationsPage() {
  return <PlaceholderPage title="Notifications" icon={Bell} milestone="M4" description="Booking confirmations, reminders and venue updates." />;
}
