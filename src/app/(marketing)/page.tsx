import { HeroCourt } from '@/features/marketing/hero-court';
import { MotionBoot } from '@/features/marketing/motion/boot';

/** The landing: one platform, two sides of the net. Sections are added task by task (M1 plan). */
export default function HomePage() {
  return (
    <>
      <HeroCourt />
      <MotionBoot />
    </>
  );
}
