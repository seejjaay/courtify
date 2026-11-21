import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Logo } from './logo';

it('is announced as Courtify', () => {
  render(<Logo />);
  expect(screen.getByRole('img', { name: 'Courtify' })).toBeInTheDocument();
});

// Fugaz One ships only a latin subset with no U+0131 (dotless i); a "ı" would render in the Arial fallback.
it('spells the wordmark with a plain "i" the display font has', () => {
  render(<Logo />);
  expect(screen.getByRole('img', { name: 'Courtify' }).textContent).toBe('Courtify');
});
