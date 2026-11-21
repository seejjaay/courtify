import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Arch top = semicircle: the horizontal radius is 50% of the width, the vertical radius
// is width/2 expressed as a share of the height for each aspect ratio.
const RATIOS = {
  '4/5': { aspect: 'aspect-[4/5]', archY: '40%' },
  '1/1': { aspect: 'aspect-square', archY: '50%' },
  '3/4': { aspect: 'aspect-[3/4]', archY: '37.5%' },
} as const;

type ArchFrameProps = { ratio?: keyof typeof RATIOS; className?: string; children?: ReactNode };

/** Media frame with an arched top, taken from the reference photo's doorways. */
export function ArchFrame({ ratio = '4/5', className, children }: ArchFrameProps) {
  const { aspect, archY } = RATIOS[ratio];
  return (
    <div
      className={cn('relative overflow-hidden shadow-sun', aspect, className)}
      style={{
        borderRadius: `50% 50% var(--radius-card) var(--radius-card) / ${archY} ${archY} var(--radius-card) var(--radius-card)`,
      }}
    >
      {children}
    </div>
  );
}
