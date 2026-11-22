import { getPublicStats } from './data';

/** Real counts of what's on Courtify. Renders nothing until the numbers are worth showing. */
export async function StatsBand() {
  const stats = await getPublicStats();
  if (!stats) return null;
  const items = [
    { value: stats.venues, label: 'venues' },
    { value: stats.cities, label: 'cities' },
    { value: stats.sports, label: 'sports' },
  ];
  return (
    <section aria-label="Courtify in numbers" className="bg-chalk px-4 py-12 sm:px-6 md:py-16">
      <dl className="mx-auto flex w-full max-w-6xl flex-wrap justify-between gap-8">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col-reverse gap-1">
            <dt className="text-lg text-ink">{item.label}</dt>
            <dd className="font-display text-5xl leading-none text-ink tabular-nums">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
