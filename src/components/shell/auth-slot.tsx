import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { getViewer, type Viewer } from '@/lib/auth/session';
import { UserMenu } from './user-menu';

/**
 * The header's right side: Sign in, or the account menu. Reads the session, so render it inside
 * Suspense. A failed lookup degrades to the Sign in link rather than taking the page down.
 */
export async function AuthSlot() {
  let viewer: Viewer | null = null;
  try {
    viewer = await getViewer();
  } catch {
    viewer = null;
  }

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
