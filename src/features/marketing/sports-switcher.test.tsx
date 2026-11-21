import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { SportsSwitcher } from './sports-switcher';

// Review Focus 5: the switcher is a keyboard-friendly set of tabs, and choosing stops auto-advance.
it('works as tabs from the keyboard and stops advancing once chosen', async () => {
  render(<SportsSwitcher />);
  const tabs = screen.getAllByRole('tab');
  expect(tabs).toHaveLength(6);
  expect(screen.getByRole('tab', { name: 'Pickleball' })).toHaveAttribute('aria-selected', 'true');

  tabs[0]!.focus();
  await userEvent.keyboard('{ArrowLeft}');
  expect(screen.getByRole('tab', { name: 'Squash' })).toHaveFocus(); // wraps
  await userEvent.keyboard('{Home}');
  expect(screen.getByRole('tab', { name: 'Pickleball' })).toHaveFocus();
  await userEvent.keyboard('{End}');
  expect(screen.getByRole('tab', { name: 'Squash' })).toHaveFocus();

  await userEvent.click(screen.getByRole('tab', { name: 'Tennis' }));
  expect(screen.getByRole('tab', { name: 'Tennis' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('tabpanel')).toHaveAccessibleName(/Tennis/);

  vi.useFakeTimers();
  act(() => {
    vi.advanceTimersByTime(8000);
  });
  expect(screen.getByRole('tab', { name: 'Tennis' })).toHaveAttribute('aria-selected', 'true');
  vi.useRealTimers();
});

it('draws the chosen court', () => {
  render(<SportsSwitcher />);
  expect(screen.getByRole('img', { name: 'Pickleball court' })).toBeInTheDocument();
});
