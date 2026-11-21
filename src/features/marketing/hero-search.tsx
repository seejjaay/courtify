'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, type FormEvent } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Today's date in Manila as YYYY-MM-DD, whatever timezone the device is set to. */
export function todayInManila(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(now);
}

const field =
  'h-11 w-full min-w-0 rounded-full bg-chalk px-4 text-base text-ink outline-offset-2 placeholder:text-ink-soft';

/**
 * The players' door: a plain GET form to /courts, so it works before (or without) JavaScript.
 * With JavaScript, empty fields are left out of the URL and the date starts at today in Manila.
 */
export function HeroSearch({ sports }: { sports: { slug: string; name: string }[] }) {
  const router = useRouter();
  const dateRef = useRef<HTMLInputElement>(null);

  // Filled after mount: a server-rendered "today" would be frozen into the static page.
  useEffect(() => {
    if (dateRef.current && !dateRef.current.value) dateRef.current.value = todayInManila();
  }, []);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(event.currentTarget)) {
      if (typeof value === 'string' && value.trim()) params.set(key, value.trim());
    }
    const query = params.toString();
    router.push((query ? `/courts?${query}` : '/courts') as Route);
  }

  return (
    <form role="search" action="/courts" method="get" onSubmit={onSubmit} className="grid w-full max-w-md grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr]">
      <label className="sr-only" htmlFor="hero-sport">
        Sport
      </label>
      <select id="hero-sport" name="sport" defaultValue="" className={field}>
        <option value="">Any sport</option>
        {sports.map((sport) => (
          <option key={sport.slug} value={sport.slug}>
            {sport.name}
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor="hero-city">
        City
      </label>
      <input id="hero-city" name="city" type="text" placeholder="City" autoComplete="address-level2" className={field} />
      <label className="sr-only" htmlFor="hero-date">
        Date
      </label>
      <input id="hero-date" ref={dateRef} name="date" type="date" className={field} />
      <button type="submit" className={cn(buttonVariants({ size: 'lg' }), 'h-11 bg-ink text-chalk hover:bg-ink/90')}>
        Search courts
      </button>
    </form>
  );
}
