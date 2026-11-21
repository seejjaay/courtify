import { act, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { DelayedSkeleton } from './delayed-skeleton';

afterEach(() => vi.useRealTimers());

it('shows nothing for fast loads and the skeleton after 250ms', () => {
  vi.useFakeTimers();
  render(<DelayedSkeleton />);
  act(() => { vi.advanceTimersByTime(249); });
  expect(screen.queryByTestId('delayed-skeleton')).toBeNull();
  act(() => { vi.advanceTimersByTime(1); });
  expect(screen.getByTestId('delayed-skeleton')).toBeInTheDocument();
});
