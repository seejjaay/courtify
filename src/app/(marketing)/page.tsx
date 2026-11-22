import type { Metadata } from 'next';
import { FinalCta } from '@/features/marketing/final-cta';
import { HeroCourt } from '@/features/marketing/hero-court';
import { HowItWorks } from '@/features/marketing/how-it-works';
import { MotionBoot } from '@/features/marketing/motion/boot';
import { OwnersSection } from '@/features/marketing/owners-section';
import { Pricing } from '@/features/marketing/pricing';
import { SportsSwitcher } from '@/features/marketing/sports-switcher';
import { StatsBand } from '@/features/marketing/stats-band';

export const metadata: Metadata = {
  description: 'Find and book pickleball, badminton, tennis, padel, table tennis and squash courts near you. Venue owners: take bookings online and run the front desk from one screen.',
};

/** The landing: one platform, two sides of the net. Sections are added task by task (M1 plan). */
export default function HomePage() {
  return (
    <>
      <HeroCourt />
      <section aria-labelledby="sports-title" className="px-4 py-20 sm:px-6 md:py-32">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
          <h2 id="sports-title" className="max-w-xl font-display text-[clamp(2rem,5vw,3.75rem)] leading-none text-ink">
            Six sports. One place to book.
          </h2>
          <SportsSwitcher />
        </div>
      </section>
      <HowItWorks />
      <OwnersSection />
      <Pricing />
      <StatsBand />
      <FinalCta />
      <MotionBoot />
    </>
  );
}
