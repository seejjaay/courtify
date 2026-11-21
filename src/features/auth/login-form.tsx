'use client';

import { Button } from '@/components/ui/button';
import { signIn } from './actions';
import { PasswordField } from './password-field';
import { initialFormState } from './schemas';
import { FormAlert, TextField } from './text-field';
import { useActionForm } from './use-action-form';

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const { state, formAction, pending, onSubmit } = useActionForm(signIn, initialFormState);
  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormAlert message={notice} tone="info" />
      <FormAlert message={state.ok ? undefined : state.message} />
      <input type="hidden" name="next" value={next ?? ''} />
      <TextField label="Email" name="email" type="email" autoComplete="email" error={state.fieldErrors?.email?.[0]} />
      <PasswordField label="Password" name="password" autoComplete="current-password" error={state.fieldErrors?.password?.[0]} />
      <Button type="submit" size="lg" disabled={pending}>
        Sign in
      </Button>
    </form>
  );
}
