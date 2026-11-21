import { Suspense, type ReactNode } from 'react';
import { SiteFooter } from '@/components/shell/site-footer';
import { SiteHeader } from '@/components/shell/site-header';
import { DelayedSkeleton } from '@/components/states/delayed-skeleton';
import { requireViewer } from '@/lib/auth/session';

// The proxy already sends signed-out visitors to /login; this re-checks on the server.
async function SignedIn({ children }: { children: ReactNode }) {
  await requireViewer('/me/bookings');
  return children;
}

export default function PlayerLayout({ children }: LayoutProps<'/'>) {
  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="flex flex-1 flex-col outline-none">
        <Suspense fallback={<DelayedSkeleton className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6" />}>
          <SignedIn>{children}</SignedIn>
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
