'use client';

import { startTransition, useActionState, type FormEvent } from 'react';
import type { FormState } from './form-state';

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

/**
 * useActionState, submitted from onSubmit instead of the form action. React resets a form after
 * its action runs, which would wipe every field when the server only reports a validation error.
 * The form keeps `action` too, so it still works before JavaScript loads.
 */
export function useActionForm(action: Action, initial: FormState) {
  const [state, formAction, pending] = useActionState(action, initial);
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  };
  return { state, formAction, pending, onSubmit };
}
