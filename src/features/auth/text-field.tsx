'use client';

import { useId, type ComponentProps } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type TextFieldProps = { label: string; name: string; error?: string } & Omit<ComponentProps<typeof Input>, 'id' | 'name'>;

/** A labelled input with its error announced and tied to it via aria-describedby. */
export function TextField({ label, name, error, ...props }: TextFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} aria-invalid={error ? true : undefined} aria-describedby={error ? errorId : undefined} {...props} />
      {error && (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function FormAlert({ message, tone = 'error' }: { message?: string; tone?: 'error' | 'success' | 'info' }) {
  if (!message) return null;
  const styles = {
    error: 'border-danger/30 bg-danger/5 text-danger',
    success: 'border-success/30 bg-success/5 text-success',
    info: 'border-greige bg-stucco text-ink',
  }[tone];
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={`rounded-lg border px-3 py-2 text-sm ${styles}`}>
      {message}
    </p>
  );
}
