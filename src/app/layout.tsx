import type { Metadata } from 'next';
import { Fugaz_One, Work_Sans } from 'next/font/google';
import './globals.css';

const fugaz = Fugaz_One({ weight: '400', subsets: ['latin'], variable: '--font-fugaz', display: 'swap' });
const workSans = Work_Sans({ subsets: ['latin'], variable: '--font-work-sans', display: 'swap' });

export const metadata: Metadata = {
  title: 'Courtify — Book racket courts near you',
  description: 'Find and book pickleball, badminton, tennis, padel, table tennis and squash courts.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${fugaz.variable} ${workSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
