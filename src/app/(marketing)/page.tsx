import Link from 'next/link';
import { CourtDiagram } from '@/components/brand/court-diagram';
import { buttonVariants } from '@/components/ui/button';

/** M0 placeholder landing; M1 replaces it with the full motion-led page. */
export default function HomePage() {
  return (
    <section className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-4 py-16 sm:px-6 md:grid-cols-[1.3fr_1fr] md:py-24">
      <div className="flex flex-col items-start gap-6">
        <p className="text-sm font-medium tracking-wide text-clay-ink uppercase">
          Pickleball · Badminton · Tennis · Padel · Table tennis · Squash
        </p>
        <h1 className="font-display text-5xl leading-[0.95] text-ink sm:text-7xl">Book racket courts near you.</h1>
        <p className="max-w-md text-lg text-ink-soft">See open slots at venues around you and lock in a court in a few taps.</p>
        <Link href="/courts" className={buttonVariants({ size: 'lg' })}>
          Find a court
        </Link>
      </div>
      <CourtDiagram
        sport="pickleball"
        className="mx-auto h-72 w-auto -rotate-6 drop-shadow-[10px_14px_16px_rgb(42_29_20_/_0.22)] md:h-96"
      />
    </section>
  );
}
