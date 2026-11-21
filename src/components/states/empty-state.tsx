import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

/** Shown only after data has loaded and is genuinely empty, never while loading or on error. */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-card border border-dashed border-greige bg-chalk/60 px-6 py-12 text-center',
        className,
      )}
    >
      {Icon && <Icon aria-hidden="true" className="size-8 text-clay-ink" />}
      <h2 className="font-display text-2xl text-ink">{title}</h2>
      {description && <p className="max-w-prose text-sm text-ink-soft">{description}</p>}
      {action}
    </div>
  );
}
