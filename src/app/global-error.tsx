'use client';

import { ErrorState } from '@/components/states/error-state';
import { fontVariables } from './fonts';
import './globals.css';

// Replaces the root layout when it fails, so it brings its own document, styles and fonts.
// Client component: no `metadata` export, so the title is a React <title>.
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en" className={`${fontVariables} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <title>Something went wrong · Courtify</title>
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-16 outline-none sm:px-6"
        >
          <ErrorState onRetry={retry} />
        </main>
      </body>
    </html>
  );
}
