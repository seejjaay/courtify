import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '@/components/brand/logo';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navLink = 'inline-flex h-10 items-center rounded-full px-3 text-sm font-medium text-ink transition-colors hover:bg-chalk';

/** Public top bar. Without an `authSlot` it shows a "Sign in" link; Task 18 passes the real auth slot. */
export function SiteHeader({ authSlot }: { authSlot?: ReactNode }) {
  return (
    <header className="sticky top-0 z-40 border-b-2 border-chalk bg-stucco/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-1 px-4 sm:gap-2 sm:px-6">
        <Link href="/" className="mr-1 inline-flex h-10 items-center rounded-full px-1 sm:mr-4">
          <Logo />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1">
          <Link href="/courts" className={navLink}>
            Find courts
          </Link>
          <Link href="/for-venues" className={cn(navLink, 'hidden sm:inline-flex')}>
            For venues
          </Link>
        </nav>
        <div className="ml-auto flex items-center">
          {authSlot ?? (
            <Link href="/login" className={buttonVariants({ size: 'sm' })}>
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
