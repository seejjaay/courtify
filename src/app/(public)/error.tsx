'use client';

import { ErrorState } from '@/components/states/error-state';

// Next 16.3+: `retry` re-fetches and re-renders the segment; `reset` only re-renders.
export default function PublicError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
      <ErrorState onRetry={retry} />
    </div>
  );
}
