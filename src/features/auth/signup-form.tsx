'use client';

import Link from 'next/link';
import { useId } from 'react';
import { Button } from '@/components/ui/button';
import { signUp } from './actions';
import { PasswordField } from './password-field';
import { initialFormState } from './form-state';
import { FormAlert, TextField } from './text-field';
import { useActionForm } from './use-action-form';

export function SignupForm() {
  const { state, formAction, pending, onSubmit } = useActionForm(signUp, initialFormState);
  const consentId = useId();
  const consentError = state.fieldErrors?.consent?.[0];

  if (state.ok) return <FormAlert message={state.message} tone="success" />;

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormAlert message={state.message} />
      <TextField label="Full name" name="fullName" autoComplete="name" error={state.fieldErrors?.fullName?.[0]} />
      <TextField label="Email" name="email" type="email" autoComplete="email" error={state.fieldErrors?.email?.[0]} />
      <PasswordField label="Password" name="password" autoComplete="new-password" error={state.fieldErrors?.password?.[0]} />
      <div className="flex flex-col gap-1.5">
        <div className="flex items-start gap-2.5">
          <input
            id={consentId}
            name="consent"
            type="checkbox"
            aria-invalid={consentError ? true : undefined}
            aria-describedby={consentError ? `${consentId}-error` : undefined}
            className="mt-0.5 size-4 shrink-0 accent-clay-ink"
          />
          <label htmlFor={consentId} className="text-sm text-ink-soft">
            I agree to the{' '}
            <Link href="/legal/terms" className="text-clay-ink underline underline-offset-2">
              Terms
            </Link>{' '}
            and{' '}
            <Link href="/legal/privacy" className="text-clay-ink underline underline-offset-2">
              Privacy Policy
            </Link>
            , and to Courtify processing my details under the Data Privacy Act (RA 10173).
          </label>
        </div>
        {consentError && (
          <p id={`${consentId}-error`} className="text-sm text-danger">
            {consentError}
          </p>
        )}
      </div>
      <Button type="submit" size="lg" disabled={pending}>
        Create account
      </Button>
    </form>
  );
}
