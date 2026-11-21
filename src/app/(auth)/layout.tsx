import Link from 'next/link';
import { Logo } from '@/components/brand/logo';

export default function AuthLayout({ children }: LayoutProps<'/'>) {
  return (
    <main id="main" tabIndex={-1} className="flex flex-1 justify-center px-4 py-12 outline-none sm:items-center">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <Link href="/" className="self-start rounded-full">
          <Logo className="text-3xl" />
        </Link>
        <div className="flex flex-col gap-6 rounded-card border border-greige bg-chalk p-6 shadow-sun sm:p-8">{children}</div>
      </div>
    </main>
  );
}
