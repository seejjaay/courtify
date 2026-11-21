import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import RootError from './error';

// Errors thrown by a group layout land here, inside the root layout, instead of in global-error.
it('shows a retryable error inside the root layout', async () => {
  const retry = vi.fn();
  render(<RootError error={new Error('boom')} retry={retry} />);
  expect(screen.getByRole('alert')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(retry).toHaveBeenCalledOnce();
});
