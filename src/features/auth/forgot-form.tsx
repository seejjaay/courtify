'use client';

import { Button } from '@/components/ui/button';
import { requestPasswordReset } from './actions';
import { initialFormState } from './form-state';
import { FormAlert, TextField } from './text-field';
import { useActionForm } from './use-action-form';

export function ForgotForm() {
  const { state, formAction, pending, onSubmit } = useActionForm(requestPasswordReset, initialFormState);
  if (state.ok) return <FormAlert message={state.message} tone="success" />;
  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormAlert message={state.message} />
      <TextField label="Email" name="email" type="email" autoComplete="email" error={state.fieldErrors?.email?.[0]} />
      <Button type="submit" size="lg" disabled={pending}>
        Send reset link
      </Button>
    </form>
  );
}
