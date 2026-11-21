import { cn } from '@/lib/utils';

/**
 * Placeholder wordmark: "Courtify" in Fugaz One, with a clay ball standing in for the dot of the i.
 *
 * Fugaz One has no dotless i (U+0131), so the real "i" has its dot clipped off. The font's ascent and
 * descent are 1046/422 per 1000 in hhea, OS/2 win and typo alike, so at line-height 1 the baseline
 * sits 0.812em below the top of the i's box on every platform. The dot spans 0.045–0.240em down and
 * the stem starts at 0.331em, so the clip at 0.286em falls in the gap. The ball is centred where the
 * dot was: 0.21em in, 0.14em down.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span role="img" aria-label="Courtify" className={cn('inline-flex items-baseline font-display text-2xl leading-none text-ink', className)}>
      <span aria-hidden="true">Court</span>
      <span aria-hidden="true" className="relative">
        <span className="block leading-none [clip-path:inset(0.286em_0_0_0)]">i</span>
        <span className="absolute top-[0.023em] left-[0.091em] size-[0.24em] rounded-full bg-clay" />
      </span>
      <span aria-hidden="true">fy</span>
    </span>
  );
}
