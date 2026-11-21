import { LayoutDashboard } from 'lucide-react';
import { AppSidebar, type SidebarGroup } from '@/components/shell/app-sidebar';
import { HeaderAuth } from '@/components/shell/header-auth';
import { SiteHeader } from '@/components/shell/site-header';
import { ADMIN_SECTIONS } from '@/features/admin/nav';
import { requireAdmin } from '@/lib/auth/session';
import { createServerSupabase } from '@/lib/supabase/server';

// Blocking re-check; src/proxy.ts already gave non-admins a real 404 before rendering.
export const instant = false;

async function queueCounts(): Promise<{ approvals: number; subscriptions: number }> {
  const supabase = await createServerSupabase();
  const [venues, payments] = await Promise.all([
    supabase.from('venues').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
    supabase.from('subscription_payments').select('id', { count: 'exact', head: true }).eq('status', 'submitted'),
  ]);
  if (venues.error) throw venues.error;
  if (payments.error) throw payments.error;
  return { approvals: venues.count ?? 0, subscriptions: payments.count ?? 0 };
}

export default async function AdminLayout({ children }: LayoutProps<'/admin'>) {
  await requireAdmin();
  const counts = await queueCounts();
  const badges: Partial<Record<string, number>> = { approvals: counts.approvals, subscriptions: counts.subscriptions };

  const groups: SidebarGroup[] = [
    {
      title: 'Platform',
      items: [
        { href: '/admin', label: 'Overview', icon: <LayoutDashboard aria-hidden="true" /> },
        ...ADMIN_SECTIONS.map((section) => ({
          href: `/admin/${section.slug}`,
          label: section.label,
          icon: <section.icon aria-hidden="true" />,
          badge: badges[section.slug],
        })),
      ],
    },
  ];

  return (
    <>
      <SiteHeader authSlot={<HeaderAuth />} />
      <main id="main" tabIndex={-1} className="flex flex-1 flex-col outline-none md:flex-row">
        <AppSidebar label="Admin" shell="admin" groups={groups} />
        <div className="flex flex-1 flex-col">{children}</div>
      </main>
    </>
  );
}
