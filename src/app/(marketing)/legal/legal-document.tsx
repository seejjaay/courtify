import { FileText } from 'lucide-react';
import { EmptyState } from '@/components/states/empty-state';

/**
 * The legal pages are two static routes rather than /legal/[doc]: any other /legal/x then never
 * matches a route, so it gets a real 404 status even though the layout streams a session-aware header.
 */
export function LegalDocument({ title }: { title: string }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-16 sm:px-6">
      <h1 className="font-display text-4xl text-ink sm:text-5xl">{title}</h1>
      <EmptyState
        icon={FileText}
        title="Draft — not legal advice"
        description="This document is still being written and reviewed. It is a placeholder, not a binding agreement."
      />
    </div>
  );
}
