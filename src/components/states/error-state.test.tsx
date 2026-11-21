import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { ErrorState } from './error-state';

it('announces itself and retries', async () => {
  const onRetry = vi.fn();
  render(<ErrorState onRetry={onRetry} />);
  expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(onRetry).toHaveBeenCalledOnce();
});

it('has no retry button without a handler', () => {
  render(<ErrorState />);
  expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
});
