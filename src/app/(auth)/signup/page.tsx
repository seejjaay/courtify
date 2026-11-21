import type { Metadata } from 'next';
import Link from 'next/link';
import { SignupForm } from '@/features/auth/signup-form';

export const metadata: Metadata = { title: 'Create account' };

export default function SignupPage() {
  return (
    <>
      <h1 className="font-display text-3xl text-ink">Create account</h1>
      <SignupForm />
      <p className="text-sm text-ink-soft">
        Already have one?{' '}
        <Link href="/login" className="text-clay-ink underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </>
  );
}
