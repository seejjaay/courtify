import { getProPricing } from './data';
import { pricingCopy } from './pricing-copy';

/** How Pro billing works, step by step. Terms (trial, grace) come live from platform settings. */
export async function Billing() {
  const copy = pricingCopy(await getProPricing());
  const steps = [
    copy.trial
      ? { title: 'Trial first', body: `${copy.trial}. It begins once Courtify approves your venue, and nothing is charged.` }
      : { title: 'List first', body: 'Your venue goes live once Courtify approves it.' },
    { title: 'Pay by GCash or bank', body: `When you’re ready for Pro, pay ${copy.monthly} a month or ${copy.yearly} a year per venue, to Courtify’s GCash or bank account, and upload your proof.` },
    { title: 'We verify it', body: 'Courtify checks your proof and Pro runs until its end date. You’ll see that date on your dashboard.' },
    copy.grace
      ? { title: 'A little slack', body: `${copy.grace[0]!.toUpperCase()}${copy.grace.slice(1)}. If it isn’t renewed, your listing stays up on the free tier.` }
      : { title: 'If it lapses', body: 'If Pro isn’t renewed, your listing stays up on the free tier.' },
  ];
  return (
    <section aria-labelledby="billing-title" className="bg-chalk px-4 py-20 sm:px-6 md:py-32">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12">
        <h2 id="billing-title" className="max-w-2xl font-display text-[clamp(2rem,5vw,3.75rem)] leading-none text-ink">
          How billing works
        </h2>
        <ol className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <li key={step.title} className="flex flex-col gap-3">
              <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-full bg-clay font-display text-xl text-ink">
                {i + 1}
              </span>
              <h3 className="font-display text-2xl leading-tight text-ink">{step.title}</h3>
              <p className="text-lg text-ink">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
