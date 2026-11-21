import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

// The session lookup failing (a database blip) must not take the page down with it.
vi.mock('@/lib/auth/session', () => ({ getViewer: vi.fn().mockRejectedValue(new Error('database unavailable')) }));
vi.mock('./user-menu', () => ({ UserMenu: () => null }));

it('falls back to a Sign in link when the session lookup fails', async () => {
  const { AuthSlot } = await import('./auth-slot');
  render(await AuthSlot());
  expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
});
