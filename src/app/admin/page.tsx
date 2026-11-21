import { LayoutDashboard } from 'lucide-react';
import type { Metadata } from 'next';
import { PlaceholderPage } from '@/features/placeholder-page';

export const metadata: Metadata = { title: 'Admin overview' };

export default function AdminOverviewPage() {
  return (
    <PlaceholderPage
      title="Overview"
      icon={LayoutDashboard}
      milestone="M5"
      description="Users, venues by status, Pro and trial counts, estimated MRR and the oldest item in each queue."
    />
  );
}
