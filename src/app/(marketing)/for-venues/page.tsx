import { CalendarDays, ChartNoAxesColumn, History, LayoutDashboard, QrCode, ReceiptText, Users } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Billing } from '@/features/marketing/billing';
import { Faq, type FaqItem } from '@/features/marketing/faq';
import { MotionBoot } from '@/features/marketing/motion/boot';
import { DashboardPreview } from '@/features/marketing/owners-section';
import { Pricing } from '@/features/marketing/pricing';

export const metadata: Metadata = {
  title: 'For venues',
  description: 'List your court venue for free. Add Pro for online booking, GCash proof checking, front-desk check-in and analytics.',
};

const FEATURES = [
  { icon: LayoutDashboard, title: 'Today board', body: 'Every court and every hour for today, with who’s booked, who’s paid and who’s turned up.' },
  { icon: CalendarDays, title: 'Calendar', body: 'Block a court for maintenance or a league night, add walk-ins, and move a booking without a phone call.' },
  { icon: QrCode, title: 'Check-in', body: 'Players show a booking code. Your front desk finds it in seconds and marks them in.' },
  { icon: ReceiptText, title: 'GCash proofs', body: 'Screenshots land in one queue. Check each against your GCash, then verify or send it back with a reason.' },
  { icon: ChartNoAxesColumn, title: 'Analytics', body: 'See how full each court is by the hour, and which days and sports bring the most play.' },
  { icon: History, title: 'Activity log', body: 'Every change to a booking is recorded with who made it and when, so there’s no “who moved this?”' },
  { icon: Users, title: 'Team roles', body: 'Owner, manager and staff each see what they need, and staff can run the front desk without touching your settings.' },
];

const FAQ: FaqItem[] = [
  { q: 'Is listing free?', a: 'Yes. A free listing gives your venue a page with photos and rates, call and Messenger buttons, and a place in search results. You only pay when you want online booking and the venue tools.' },
  { q: 'What happens if Pro lapses?', a: 'Your listing stays up on the free tier. New online bookings and walk-ins pause, but existing bookings stay valid, players can still see them, and you keep check-in for them.' },
  { q: 'Do players pay through Courtify?', a: 'No. Courtify never handles player payments. You collect at the venue, or by GCash if you turn on proof of payment, and you check each proof yourself.' },
  { q: 'Can my staff use it?', a: 'Yes. Add people as owner, manager or staff. Staff can run check-in and the day’s bookings, and managers can also change courts and rates.' },
  { q: 'How long does setup take?', a: 'About 15 minutes: your venue details, a few photos, your courts and hourly rates. Courtify reviews it before it goes live.' },
];

/** The long owner page: what the dashboard does, what Pro costs, how billing works. */
export default function ForVenuesPage() {
  return (
    <>
      <section aria-labelledby="venues-title" className="bg-stucco px-4 py-16 sm:px-6 md:py-24">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-16">
          <div className="flex flex-col gap-6">
            <h1 id="venues-title" className="font-display text-[clamp(2.5rem,6vw,4.5rem)] leading-none text-ink">
              For venues
            </h1>
            <p className="max-w-lg text-xl text-ink">
              Take bookings online, check GCash proofs in one place and run the front desk from one screen. List your venue for free, and add Pro when you want bookings.
            </p>
            <div>
              <Link href="/owner/new" className={cn(buttonVariants({ size: 'lg' }))}>
                List your venue
              </Link>
            </div>
          </div>
          <DashboardPreview />
        </div>
      </section>

      <section aria-labelledby="features-title" className="bg-chalk px-4 py-20 sm:px-6 md:py-32">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-12">
          <div className="flex flex-col gap-4">
            <h2 id="features-title" className="max-w-2xl font-display text-[clamp(2rem,5vw,3.75rem)] leading-none text-ink">
              What your dashboard does
            </h2>
            <p className="max-w-xl text-lg text-ink-soft">Part of Pro. Shown here as it’s designed, and rolling out as the venue dashboard opens up.</p>
          </div>
          <ul className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex flex-col gap-3">
                <Icon aria-hidden="true" className="size-7 text-clay-ink" />
                <h3 className="font-display text-2xl leading-tight text-ink">{title}</h3>
                <p className="text-lg text-ink">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Pricing />
      <Billing />

      <section aria-labelledby="faq-title" className="bg-stucco px-4 py-20 sm:px-6 md:py-32">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
          <h2 id="faq-title" className="font-display text-[clamp(2rem,5vw,3.75rem)] leading-none text-ink">
            Questions owners ask
          </h2>
          <Faq items={FAQ} />
        </div>
      </section>

      <section aria-labelledby="venues-cta-title" className="bg-clay px-4 py-20 sm:px-6 md:py-28">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-8">
          <h2 id="venues-cta-title" className="max-w-3xl font-display text-[clamp(2.25rem,6vw,4.5rem)] leading-none text-ink">
            Fill your courts. Skip the Messenger threads.
          </h2>
          <Link href="/owner/new" className={cn(buttonVariants({ size: 'lg' }), 'bg-ink text-chalk hover:bg-ink/90')}>
            List your venue
          </Link>
        </div>
      </section>
      <MotionBoot />
    </>
  );
}
