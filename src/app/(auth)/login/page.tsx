import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { DelayedSkeleton } from '@/components/states/delayed-skeleton';
import { DemoLogins } from '@/features/auth/demo-logins';
import { LoginForm } from '@/features/auth/login-form';

export const metadata: Metadata = { title: 'Sign in' };

const LINK_EXPIRED = 'That link expired or was already used. Try again.';

// searchParams is request data, so the form that needs it streams inside Suspense under Cache Components.
async function LoginFormWithParams({ searchParams }: { searchParams: PageProps<'/login'>['searchParams'] }) {
  const params = await searchParams;
  const next = typeof params.next === 'string' ? params.next : undefined;
  return <LoginForm next={next} notice={params.error === 'link_expired' ? LINK_EXPIRED : undefined} />;
}

export default function LoginPage({ searchParams }: PageProps<'/login'>) {
  return (
    <>
      <h1 className="font-display text-3xl text-ink">Sign in</h1>
      <Suspense fallback={<DelayedSkeleton lines={4} />}>
        <LoginFormWithParams searchParams={searchParams} />
      </Suspense>
      <div className="flex flex-col gap-1 text-sm text-ink-soft">
        <p>
          New here?{' '}
          <Link href="/signup" className="text-clay-ink underline underline-offset-2">
            Create an account
          </Link>
        </p>
        <Link href="/forgot-password" className="self-start text-clay-ink underline underline-offset-2">
          Forgot your password?
        </Link>
      </div>
      <DemoLogins />
    </>
  );
}
