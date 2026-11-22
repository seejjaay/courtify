import { ChevronDown } from 'lucide-react';

export type FaqItem = { q: string; a: string };

/** Native <details>/<summary>, so it works with no JavaScript and with the keyboard. */
export function Faq({ items }: { items: FaqItem[] }) {
  return (
    <div className="flex flex-col divide-y divide-ink/15 border-y border-ink/15">
      {items.map((item) => (
        <details key={item.q} className="group py-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-medium text-ink [&::-webkit-details-marker]:hidden">
            {item.q}
            <ChevronDown aria-hidden="true" className="size-5 shrink-0 transition-transform group-open:rotate-180" />
          </summary>
          <p className="mt-3 max-w-2xl text-lg text-ink">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
