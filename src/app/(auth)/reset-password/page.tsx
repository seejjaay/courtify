import type { Metadata } from 'next';
import { ResetForm } from '@/features/auth/reset-form';

export const metadata: Metadata = { title: 'Choose a new password' };

// Reached from the reset email via /auth/callback, which has already signed the user in.
export default function ResetPasswordPage() {
  return (
    <>
      <h1 className="font-display text-3xl text-ink">Choose a new password</h1>
      <ResetForm />
    </>
  );
}
