import type { Metadata } from 'next';
import Link from 'next/link';
import { CourtDiagram } from '@/components/brand/court-diagram';
import { SiteFooter } from '@/components/shell/site-footer';
import { HeaderAuth } from '@/components/shell/header-auth';
import { SiteHeader } from '@/components/shell/site-header';
import { buttonVariants } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Page not found' };

/** Group layouts don't wrap the root not-found, so it brings its own header and footer. */
export default function NotFound() {
  return (
    <>
      <SiteHeader authSlot={<HeaderAuth />} />
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center outline-none sm:px-6"
      >
        <CourtDiagram sport="tennis" className="h-48 w-auto rotate-12 drop-shadow-[10px_14px_16px_rgb(42_29_20_/_0.22)]" />
        <h1 className="font-display text-4xl text-ink sm:text-5xl">That page is out of bounds.</h1>
        <p className="max-w-md text-ink-soft">The link may be old, or the page has moved. Head back and try another shot.</p>
        <Link href="/" className={buttonVariants({ variant: 'secondary' })}>
          Back to home
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
