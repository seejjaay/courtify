import type { LucideIcon } from 'lucide-react';
import { EmptyState } from '@/components/states/empty-state';

/** An M0 stand-in for a screen a later milestone builds: the real title, and when it lands. */
export function PlaceholderPage({ title, icon, milestone, description }: { title: string; icon: LucideIcon; milestone: string; description?: string }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6 md:py-14">
      <h1 className="font-display text-4xl text-ink">{title}</h1>
      <EmptyState icon={icon} title={`${title} arrives in ${milestone}`} description={description} />
    </div>
  );
}
