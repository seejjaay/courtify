'use client';

import { RotateCcw, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
};

export function ErrorState({
  title = 'Something went wrong',
  description = 'Please try again. If it keeps happening, refresh the page.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center gap-3 rounded-card border border-danger/30 bg-chalk px-6 py-12 text-center',
        className,
      )}
    >
      <TriangleAlert aria-hidden="true" className="size-8 text-danger" />
      <h2 className="font-display text-2xl text-ink">{title}</h2>
      <p className="max-w-prose text-sm text-ink-soft">{description}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          <RotateCcw aria-hidden="true" />
          Try again
        </Button>
      )}
    </div>
  );
}
