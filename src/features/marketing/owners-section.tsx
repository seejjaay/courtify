import { CircleCheck, QrCode, ReceiptText } from 'lucide-react';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const CHANGES = [
  'Players book online, and two people can never book the same slot.',
  'GCash proofs land in one queue, ready to check.',
  'The front desk checks players in with their booking code.',
  'See how full every court is, hour by hour.',
];

// A day at a three-court venue, 6 AM to 10 PM. 1 = booked, 0 = open. Illustrative only.
const HOURS = ['6', '7', '8', '9', '10', '11', '12', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const GRID = [
  [1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0],
  [0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 1, 0, 1, 1, 1],
];
// Light across the day: morning (6–11), afternoon into golden hour (12–5), floodlights (6–9 PM).
const LIGHT = ['morning', 'morning', 'morning', 'morning', 'morning', 'morning', 'day', 'day', 'day', 'golden', 'golden', 'golden', 'flood', 'flood', 'flood', 'flood'] as const;
const LIGHT_BG: Record<(typeof LIGHT)[number], string> = {
  morning: 'bg-chalk/10',
  day: 'bg-chalk/5',
  golden: 'bg-sand/25',
  flood: 'bg-chalk/15',
};

function DayStrip() {
  return (
    <figure data-scene="daylight" data-ui className="flex flex-col gap-3">
      <div className="grid grid-cols-[3.5rem_repeat(16,minmax(0,1fr))] gap-1 overflow-hidden text-xs text-chalk/80">
        <span />
        {HOURS.map((hour, i) => (
          <span key={i} data-light={LIGHT[i]} className={cn('invisible rounded-t-md py-1 text-center tabular-nums sm:visible', LIGHT_BG[LIGHT[i]])}>
            {hour}
          </span>
        ))}
        {GRID.map((row, r) => (
          <div key={r} className="contents">
            <span className="self-center text-sm text-chalk">Court {r + 1}</span>
            {row.map((booked, c) => (
              <span
                key={c}
                data-light={LIGHT[c]}
                className={cn('h-8 rounded-sm', booked ? 'bg-clay' : LIGHT_BG[LIGHT[c]])}
              />
            ))}
          </div>
        ))}
      </div>
      <figcaption className="text-sm text-chalk/80">Morning sets, a quiet afternoon, then every court full under the floodlights.</figcaption>
    </figure>
  );
}

/** The venue dashboard as a product preview: today's board, a GCash proof to verify, a check-in. */
export function DashboardPreview() {
  return (
    <figure data-scene="dashboard" data-ui aria-label="Product preview of the venue dashboard" className="flex flex-col gap-4 rounded-card bg-chalk p-5 text-ink md:p-6">
      <figcaption className="flex items-baseline justify-between gap-4">
        <span className="font-medium">Today at your venue</span>
        <span className="rounded-full bg-stucco px-3 py-1 text-xs text-ink-soft">Product preview</span>
      </figcaption>

      {/* Phones: label and value on one row (Fugaz can't shrink below 20px to fit three across). */}
      <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
        {[
          { label: 'Booked today', value: '31' },
          { label: 'Courts in use', value: '3 / 3' },
          { label: 'Paid', value: '₱14,200' },
        ].map((stat) => (
          <div key={stat.label} data-flip className="flex flex-row-reverse items-baseline justify-between rounded-lg bg-stucco p-3 sm:flex-col sm:items-start">
            <p className="font-display text-[1.75rem] leading-none tabular-nums">{stat.value}</p>
            <p className="text-sm text-ink-soft sm:mt-1 sm:text-xs">{stat.label}</p>
          </div>
        ))}
      </div>

      <ul className="flex flex-col gap-2">
        <li data-drop className="flex items-center gap-3 rounded-lg bg-stucco p-3">
          <ReceiptText aria-hidden="true" className="size-5 shrink-0 text-clay-ink" />
          <span className="min-w-0 flex-1 text-sm">
            GCash proof · ₱600 · Court 2, 7–8 PM
          </span>
          <span data-verify className="flex items-center gap-1 rounded-full bg-ink px-3 py-1 text-xs font-medium text-chalk">
            <CircleCheck aria-hidden="true" className="size-3.5" />
            Verified
          </span>
        </li>
        <li data-drop className="flex items-center gap-3 rounded-lg bg-stucco p-3">
          <QrCode aria-hidden="true" className="size-5 shrink-0 text-clay-ink" />
          <span className="min-w-0 flex-1 text-sm">Booking 7QF-2KD · Court 1, 6–7 PM</span>
          <span className="rounded-full bg-sand px-3 py-1 text-xs font-medium text-ink">Checked in</span>
        </li>
        <li data-drop className="flex items-center gap-3 rounded-lg bg-stucco p-3">
          <span aria-hidden="true" className="size-5 shrink-0 rounded-full bg-clay" />
          <span className="min-w-0 flex-1 text-sm">New booking · Court 3, 8–10 PM</span>
          <span className="text-xs text-ink-soft">just now</span>
        </li>
      </ul>
    </figure>
  );
}

/** The longest landing section: what Courtify does for a venue, under the floodlights. */
export function OwnersSection() {
  return (
    <section id="for-venues" aria-labelledby="owners-title" className="bg-ink px-4 py-20 text-chalk sm:px-6 md:py-32">
      <div className="mx-auto grid w-full max-w-6xl gap-14 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:gap-16">
        <div className="flex flex-col gap-8">
          <h2 id="owners-title" className="font-display text-[clamp(2rem,5vw,3.75rem)] leading-none text-chalk">
            Run your day from one screen.
          </h2>
          <p className="max-w-md text-lg text-chalk">
            No more Messenger threads, missed calls and a notebook at the desk, or two groups turning up for the same court.
          </p>
          <ul className="flex flex-col gap-4">
            {CHANGES.map((change) => (
              <li key={change} className="flex gap-3 text-lg text-chalk">
                <span aria-hidden="true" className="mt-2 size-2.5 shrink-0 rounded-full bg-clay" />
                {change}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/owner/new" className={cn(buttonVariants({ size: 'lg' }))}>
              List your venue
            </Link>
            <Link href="/for-venues" className="text-sand underline underline-offset-4 hover:text-chalk">
              See how it works for venues
            </Link>
          </div>
        </div>
        <div className="flex flex-col gap-10">
          <DashboardPreview />
          <DayStrip />
        </div>
      </div>
    </section>
  );
}
