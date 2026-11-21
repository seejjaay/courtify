import type { Metadata } from 'next';
import Link from 'next/link';
import { ForgotForm } from '@/features/auth/forgot-form';

export const metadata: Metadata = { title: 'Forgot password' };

export default function ForgotPasswordPage() {
  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl text-ink">Forgot password</h1>
        <p className="text-sm text-ink-soft">We’ll email you a link to choose a new one.</p>
      </div>
      <ForgotForm />
      <Link href="/login" className="self-start text-sm text-clay-ink underline underline-offset-2">
        Back to sign in
      </Link>
    </>
  );
}
