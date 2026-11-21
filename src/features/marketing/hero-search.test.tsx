import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { HeroSearch, todayInManila } from './hero-search';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

it("knows today's date in Manila", () => {
  expect(todayInManila(new Date('2026-11-21T17:30:00Z'))).toBe('2026-11-22'); // 01:30 the next day in Manila
  expect(todayInManila(new Date('2026-11-22T15:59:00Z'))).toBe('2026-11-22');
});

it('is a search form that works without JavaScript', () => {
  render(<HeroSearch sports={[{ slug: 'pickleball', name: 'Pickleball' }]} />);
  expect(screen.getByRole('combobox', { name: 'Sport' })).toHaveValue('');
  const form = screen.getByRole('search');
  expect(form).toHaveAttribute('action', '/courts');
  expect(form).toHaveAttribute('method', 'get');
});
