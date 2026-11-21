'use client';

import { Button } from '@/components/ui/button';
import { resetPassword } from './actions';
import { PasswordField } from './password-field';
import { initialFormState } from './schemas';
import { FormAlert } from './text-field';
import { useActionForm } from './use-action-form';

export function ResetForm() {
  const { state, formAction, pending, onSubmit } = useActionForm(resetPassword, initialFormState);
  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormAlert message={state.message} />
      <PasswordField label="New password" name="password" autoComplete="new-password" error={state.fieldErrors?.password?.[0]} />
      <PasswordField label="Confirm new password" name="confirm" autoComplete="new-password" error={state.fieldErrors?.confirm?.[0]} />
      <Button type="submit" size="lg" disabled={pending}>
        Update password
      </Button>
    </form>
  );
}
