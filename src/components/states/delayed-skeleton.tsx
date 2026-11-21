'use client';

import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type DelayedSkeletonProps = { delayMs?: number; lines?: number; className?: string };

/** Renders nothing for fast loads; shows a skeleton only once loading passes `delayMs`. */
export function DelayedSkeleton({ delayMs = 250, lines = 3, className }: DelayedSkeletonProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  if (!visible) return null;

  return (
    <div data-testid="delayed-skeleton" role="status" aria-label="Loading" className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn('h-4 bg-greige', lines > 1 && i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}
