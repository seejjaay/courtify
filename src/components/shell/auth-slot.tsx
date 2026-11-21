import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { getViewer } from '@/lib/auth/session';
import { UserMenu } from './user-menu';

/** The header's right side: Sign in, or the account menu. Reads the session, so render it inside Suspense. */
export async function AuthSlot() {
  const viewer = await getViewer();
  if (!viewer) {
    return (
      <Link href="/login" className={buttonVariants({ size: 'sm' })}>
        Sign in
      </Link>
    );
  }
  return (
    <UserMenu
      viewer={{ fullName: viewer.fullName, email: viewer.email, isAdmin: viewer.isAdmin, hasVenues: viewer.venues.length > 0 }}
    />
  );
}
