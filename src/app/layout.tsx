import type { Metadata } from 'next';
import { FlashToast } from '@/components/shell/flash-toast';
import { SkipLink } from '@/components/shell/skip-link';
import { Toaster } from '@/components/ui/sonner';
import { fontVariables } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  // Resolves relative social-image URLs. Set NEXT_PUBLIC_SITE_URL in production.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: { default: 'Courtify — Book racket courts near you', template: '%s · Courtify' },
  description: 'Find and book pickleball, badminton, tennis, padel, table tennis and squash courts.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${fontVariables} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SkipLink />
        {children}
        <Toaster position="top-center" />
        <FlashToast />
      </body>
    </html>
  );
}
