'use client';

import { ErrorState } from '@/components/states/error-state';

// Catches errors thrown by a group layout (which its own error.tsx can't), so the root layout,
// fonts and toasts survive instead of falling through to global-error.
export default function RootError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main id="main" tabIndex={-1} className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-16 outline-none sm:px-6">
      <ErrorState onRetry={retry} />
    </main>
  );
}
