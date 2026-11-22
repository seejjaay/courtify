import { Check } from 'lucide-react';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getProPricing } from './data';
import { pricingCopy } from './pricing-copy';

export { pricingCopy } from './pricing-copy';

const FREE_FEATURES = [
  'Your venue page with photos, rates and location',
  'Call and Messenger buttons for players',
  'Shows up when players search your city',
];

const PRO_FEATURES = [
  'Online booking, with no double bookings',
  'GCash proofs checked in one queue',
  'Front-desk check-in and walk-in bookings',
  'Court blocks, rates by hour, and analytics',
];

function Features({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-base text-ink">
          <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-clay-ink" />
          {item}
        </li>
      ))}
    </ul>
  );
}

/** Free listing next to Pro. Every price and term comes from platform settings. */
export async function Pricing() {
  const copy = pricingCopy(await getProPricing());
  return (
    <section aria-labelledby="pricing-title" className="bg-stucco px-4 py-20 sm:px-6 md:py-32">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12">
        <div className="flex flex-col gap-4">
          <h2 id="pricing-title" className="max-w-2xl font-display text-[clamp(2rem,5vw,3.75rem)] leading-none text-ink">
            Free to list. Pro when you want bookings.
          </h2>
          <p className="max-w-xl text-lg text-ink">Pro is priced per venue. Players never pay Courtify anything.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <article aria-labelledby="free-title" className="flex flex-col gap-6 rounded-card bg-chalk p-6 md:p-8">
            <h3 id="free-title" className="font-display text-3xl leading-none text-ink">
              Free listing
            </h3>
            <p className="text-lg text-ink">
              <span className="font-display text-4xl">₱0</span> forever
            </p>
            <Features items={FREE_FEATURES} />
            <Link href="/owner/new" className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }), 'mt-auto self-start')}>
              List your venue
            </Link>
          </article>
          <article aria-labelledby="pro-title" className="flex flex-col gap-6 rounded-card bg-ink p-6 text-chalk md:p-8">
            <h3 id="pro-title" className="font-display text-3xl leading-none text-chalk">
              Pro
            </h3>
            <div className="flex flex-col gap-1 text-chalk">
              <p className="text-lg">
                <span className="font-display text-4xl">{copy.monthly}</span> a month
              </p>
              <p className="text-base">
                or {copy.yearly} a year{copy.saving ? `. ${copy.saving}.` : '.'}
              </p>
            </div>
            <ul className="flex flex-col gap-3">
              {PRO_FEATURES.map((item) => (
                <li key={item} className="flex gap-3 text-base text-chalk">
                  <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-sand" />
                  {item}
                </li>
              ))}
            </ul>
            {copy.trial || copy.grace ? (
              <p className="text-base text-sand">{[copy.trial, copy.grace].filter(Boolean).join('. ')}.</p>
            ) : null}
            <Link href="/owner/new" className={cn(buttonVariants({ size: 'lg' }), 'mt-auto self-start')}>
              List your venue
            </Link>
          </article>
        </div>
      </div>
    </section>
  );
}
