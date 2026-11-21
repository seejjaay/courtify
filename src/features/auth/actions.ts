'use server';

import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { safeNextPath } from '@/lib/auth/redirect';
import { setFlash } from '@/lib/flash';
import { createServerSupabase } from '@/lib/supabase/server';
import type { FormState } from './form-state';
import { fieldErrors, forgotSchema, resetSchema, signInSchema, signUpSchema } from './schemas';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
const TRY_AGAIN = 'Something went wrong. Please try again.';

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse({ email: formData.get('email'), password: formData.get('password') });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === 'email_not_confirmed') return { ok: false, message: 'Confirm your email first — we sent you a link.' };
    if (error.code === 'invalid_credentials') return { ok: false, message: 'Email or password is incorrect.' };
    return { ok: false, message: TRY_AGAIN };
  }

  await setFlash('Signed in');
  // An explicit `next` that isn't a safe local path sends you home; no `next` means your bookings.
  const next = formData.get('next');
  redirect((typeof next === 'string' && next ? safeNextPath(next) : '/me/bookings') as Route);
}

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signUpSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    password: formData.get('password'),
    consent: formData.get('consent') === 'on',
  });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${SITE_URL}/auth/callback?next=/me/bookings`,
    },
  });
  if (error) {
    if (error.code === 'weak_password') return { ok: false, fieldErrors: { password: ['Choose a stronger password.'] } };
    return { ok: false, message: TRY_AGAIN };
  }
  // The same answer whether or not the email already had an account, so it can't be probed.
  return { ok: true, message: 'Check your email to confirm your account.' };
}

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = forgotSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createServerSupabase();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${SITE_URL}/auth/callback?next=/reset-password`,
  });
  return { ok: true, message: 'If that email has an account, a reset link is on its way.' };
}

export async function resetPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect('/forgot-password');

  const parsed = resetSchema.safeParse({ password: formData.get('password'), confirm: formData.get('confirm') });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === 'same_password') return { ok: false, fieldErrors: { password: ['Choose a password you haven’t used here.'] } };
    if (error.code === 'weak_password') return { ok: false, fieldErrors: { password: ['Choose a stronger password.'] } };
    return { ok: false, message: TRY_AGAIN };
  }

  await setFlash('Password updated');
  redirect('/me/bookings');
}

export async function signOut(_prev: FormState, _formData: FormData): Promise<FormState> {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  await setFlash('Signed out');
  redirect('/');
}
