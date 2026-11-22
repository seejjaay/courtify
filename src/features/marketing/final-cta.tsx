import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** The closing call to action: both doors again. Scene "cta-roll" rolls the ball into the player button. */
export function FinalCta() {
  return (
    <section data-scene="cta-roll" aria-labelledby="closing-title" className="bg-clay px-4 py-20 sm:px-6 md:py-32">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <h2 id="closing-title" className="max-w-3xl font-display text-[clamp(2.25rem,6vw,4.5rem)] leading-none text-ink">
          Your court. Your time. Your game.
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex items-center">
            <span aria-hidden="true" data-roll-ball className="mr-3 size-5 shrink-0 rounded-full bg-ink" />
            <Link href="/courts" className={cn(buttonVariants({ size: 'lg' }), 'bg-ink text-chalk hover:bg-ink/90')}>
              Find a court
            </Link>
          </div>
          <Link href="/owner/new" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'border-ink text-ink hover:bg-ink/10')}>
            List your venue
          </Link>
        </div>
      </div>
    </section>
  );
}
