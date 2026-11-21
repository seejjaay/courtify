'use client';

import { ErrorState } from '@/components/states/error-state';

export default function AdminError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
      <ErrorState onRetry={retry} />
    </div>
  );
}
