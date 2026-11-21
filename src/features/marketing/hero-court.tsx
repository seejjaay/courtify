import Link from 'next/link';
import type { CSSProperties } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getSportOptions } from './data';
import { HeroSearch } from './hero-search';
import './marketing.css';

/**
 * A court seen from above, in court coordinates: u runs along the length (0 → 1, net at 0.5),
 * v across the width. Desktop lays the court flat (u = x); phones stand it upright (u = y).
 * "along" lines run lengthwise, "across" lines run widthwise.
 */
type CourtLine = { kind: 'along'; v: number; u1: number; u2: number; delay: number } | { kind: 'across'; u: number; v1: number; v2: number; delay: number };

const LINES: CourtLine[] = [
  { kind: 'along', v: 0.04, u1: 0.02, u2: 0.98, delay: 0 },
  { kind: 'along', v: 0.96, u1: 0.02, u2: 0.98, delay: 60 },
  { kind: 'across', u: 0.02, v1: 0.04, v2: 0.96, delay: 120 },
  { kind: 'across', u: 0.98, v1: 0.04, v2: 0.96, delay: 180 },
  { kind: 'along', v: 0.13, u1: 0.02, u2: 0.98, delay: 260 },
  { kind: 'along', v: 0.87, u1: 0.02, u2: 0.98, delay: 320 },
  // Centre marks on each baseline. Service lines are left out: they'd run through the text.
  { kind: 'along', v: 0.5, u1: 0.02, u2: 0.045, delay: 420 },
  { kind: 'along', v: 0.5, u1: 0.955, u2: 0.98, delay: 460 },
];

const pct = (n: number) => `${(n * 100).toFixed(2)}%`;

function lineStyle(line: CourtLine): CSSProperties {
  const thick = '3px';
  // Desktop (u = x, v = y) and phone (u = y, v = x) geometry, switched by a media query in CSS.
  const vars =
    line.kind === 'along'
      ? {
          '--d-l': pct(line.u1), '--d-t': `calc(${pct(line.v)} - 1.5px)`, '--d-w': pct(line.u2 - line.u1), '--d-h': thick,
          '--m-l': `calc(${pct(line.v)} - 1.5px)`, '--m-t': pct(line.u1), '--m-w': thick, '--m-h': pct(line.u2 - line.u1),
        }
      : {
          '--d-l': `calc(${pct(line.u)} - 1.5px)`, '--d-t': pct(line.v1), '--d-w': thick, '--d-h': pct(line.v2 - line.v1),
          '--m-l': pct(line.v1), '--m-t': `calc(${pct(line.u)} - 1.5px)`, '--m-w': pct(line.v2 - line.v1), '--m-h': thick,
        };
  return { ...vars, '--chalk-delay': `${line.delay}ms` } as CSSProperties;
}

const HEADLINE = ['Book', 'courts.', 'Run', 'courts.'];
const inkButton = 'bg-ink text-chalk hover:bg-ink/90';

/** The landing's first screen: one court, players on one side of the net, venues on the other. */
export async function HeroCourt() {
  const sports = await getSportOptions();
  return (
    <section aria-labelledby="hero-title" className="px-4 pt-6 pb-12 sm:px-6 md:pt-10 md:pb-20">
      <div className="mx-auto w-full max-w-6xl">
        <h1 id="hero-title" className="font-display text-[clamp(2.5rem,7vw,5.5rem)] leading-[0.95] tracking-[-0.02em] text-ink">
          {HEADLINE.map((word, i) => (
            <span key={i}>
              <span className="bounce-word" style={{ '--word-delay': `${i * 90}ms` } as CSSProperties}>
                {word}
              </span>{' '}
            </span>
          ))}
        </h1>

        <div className="hero-court relative mt-5 overflow-hidden rounded-card bg-clay md:mt-8">
          <div aria-hidden="true">
            {LINES.map((line, i) => (
              <span key={i} className={cn('court-line chalk-line', line.kind)} style={lineStyle(line)} />
            ))}
            <span className="court-net" />
            <div className="rally-lane">
              <div className="rally-shadow">
                <span />
              </div>
              <div className="rally-track">
                <span className="rally-ball" />
              </div>
            </div>
          </div>

          <div className="relative grid md:grid-cols-2">
            <div className="flex flex-col gap-3 py-6 pr-14 pl-6 md:gap-4 md:py-14 md:pr-12 md:pl-12">
              <h2 className="font-display text-[clamp(1.75rem,3.4vw,2.75rem)] leading-[1.02] text-ink">Find a court tonight.</h2>
              <p className="hidden max-w-sm text-lg text-ink sm:block">
                Pickleball, badminton, tennis, padel, table tennis and squash, near you.
              </p>
              <HeroSearch sports={sports} />
            </div>
            <div className="flex flex-col items-start gap-3 py-6 pr-14 pl-6 md:gap-4 md:py-14 md:pr-12 md:pl-14">
              <h2 className="font-display text-[clamp(1.75rem,3.4vw,2.75rem)] leading-[1.02] text-ink">Fill your courts.</h2>
              <p className="max-w-sm text-base text-ink sm:text-lg">
                Online bookings with no double booking, GCash checks and check-ins in one place.
              </p>
              <Link href="/owner/new" className={cn(buttonVariants({ size: 'lg' }), inkButton)}>
                List your venue
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
