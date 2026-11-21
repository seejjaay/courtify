const STEPS = [
  { title: 'Search', body: 'Choose a sport, a city and a time, and see which courts are open.' },
  { title: 'Pick a slot', body: 'Tap a free slot. Pay at the venue, or send GCash if the venue asks for it.' },
  { title: 'Play', body: 'Show your booking code at the front desk. You’re on court.' },
];

/**
 * How booking works, as a serve: on scroll the ball (scene "serve") bounces from step to step.
 * Finished state, without JS or with reduced motion: the ball rests by the first step.
 */
export function HowItWorks() {
  return (
    <section data-scene="serve" aria-labelledby="how-title" className="bg-chalk px-4 py-20 sm:px-6 md:py-32">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 md:gap-20">
        <h2 id="how-title" className="max-w-xl font-display text-[clamp(2rem,5vw,3.75rem)] leading-[1] text-ink">
          From search to serve.
        </h2>
        <div data-serve-row className="relative pl-10 md:pt-16 md:pl-0">
          <span aria-hidden="true" data-serve-shadow className="absolute top-2 left-0 h-2 w-4 rounded-full bg-ink/25 md:top-12" />
          <span aria-hidden="true" data-serve-ball className="absolute top-0 left-0 size-4 rounded-full bg-clay md:top-10" />
          <ol className="grid gap-10 md:grid-cols-3 md:gap-12">
            {STEPS.map((step) => (
              <li key={step.title} className="flex flex-col gap-3">
                <h3 className="font-display text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.02] text-ink">{step.title}</h3>
                <p className="max-w-xs text-lg text-ink">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
