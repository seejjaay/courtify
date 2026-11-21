import { CalendarDays, Compass, Heart, UserRound } from 'lucide-react';
import { Suspense, type ReactNode } from 'react';
import { HeaderAuth } from '@/components/shell/header-auth';
import { MobileTabBar } from '@/components/shell/mobile-tab-bar';
import { SiteFooter } from '@/components/shell/site-footer';
import { SiteHeader } from '@/components/shell/site-header';
import { DelayedSkeleton } from '@/components/states/delayed-skeleton';
import { requireViewer } from '@/lib/auth/session';

const PLAYER_TABS = [
  { href: '/courts', label: 'Explore', icon: <Compass aria-hidden="true" /> },
  { href: '/me/bookings', label: 'Bookings', icon: <CalendarDays aria-hidden="true" /> },
  { href: '/me/favorites', label: 'Saved', icon: <Heart aria-hidden="true" /> },
  { href: '/me/profile', label: 'Profile', icon: <UserRound aria-hidden="true" /> },
];

// The proxy already sends signed-out visitors to /login; this re-checks on the server.
async function SignedIn({ children }: { children: ReactNode }) {
  await requireViewer('/me/bookings');
  return children;
}

export default function PlayerLayout({ children }: LayoutProps<'/'>) {
  return (
    <>
      <SiteHeader authSlot={<HeaderAuth />} />
      <main id="main" tabIndex={-1} className="flex flex-1 flex-col pb-20 outline-none md:pb-0">
        <Suspense fallback={<DelayedSkeleton className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6" />}>
          <SignedIn>{children}</SignedIn>
        </Suspense>
      </main>
      <SiteFooter />
      <MobileTabBar label="Player" items={PLAYER_TABS} />
    </>
  );
}
