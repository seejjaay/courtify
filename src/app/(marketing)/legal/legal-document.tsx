import type { ReactNode } from 'react';

/** Bump this whenever either document changes in substance. */
export const LEGAL_LAST_UPDATED = '2026-11-22';

export type LegalSection = { heading: string; body: ReactNode };

const slug = (heading: string) =>
  heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T00:00:00Z`));

/**
 * The legal pages are two static routes rather than /legal/[doc]: any other /legal/x then never
 * matches a route, so it gets a real 404 status even though the layout streams a session-aware header.
 */
export function LegalDocument({ title, sections }: { title: string; sections: LegalSection[] }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-16 sm:px-6">
      <header className="flex flex-col gap-4">
        <h1 className="font-display text-4xl text-ink sm:text-5xl">{title}</h1>
        <p className="w-fit rounded-full bg-sand px-3 py-1 text-sm font-medium text-ink">Draft — not legal advice</p>
        <p className="text-base text-ink-soft">
          Last updated <time dateTime={LEGAL_LAST_UPDATED}>{formatDate(LEGAL_LAST_UPDATED)}</time>
        </p>
      </header>

      <nav aria-label="On this page" className="rounded-card bg-stucco p-5">
        <ol className="flex flex-col gap-2 text-base text-ink">
          {sections.map((section, i) => (
            <li key={section.heading}>
              <a href={`#${slug(section.heading)}`} className="underline underline-offset-4 hover:text-clay-ink">
                {i + 1}. {section.heading}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {sections.map((section) => (
        <section key={section.heading} aria-labelledby={slug(section.heading)} className="flex flex-col gap-4">
          <h2 id={slug(section.heading)} className="scroll-mt-24 font-display text-3xl leading-tight text-ink">
            {section.heading}
          </h2>
          <div className="flex flex-col gap-4 text-lg text-ink [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-6">
            {section.body}
          </div>
        </section>
      ))}
    </div>
  );
}
