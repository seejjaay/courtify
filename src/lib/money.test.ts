import { describe, expect, it } from 'vitest';
import { formatPHP, pesosToCentavos } from './money';

describe('formatPHP', () => {
  it('drops centavos for whole pesos', () => {
    expect(formatPHP(125000)).toBe('₱1,250');
    expect(formatPHP(0)).toBe('₱0');
  });
  it('shows two decimals when there are centavos', () => {
    expect(formatPHP(125050)).toBe('₱1,250.50');
  });
});

describe('pesosToCentavos', () => {
  it('converts and rounds away float noise', () => {
    expect(pesosToCentavos(450.5)).toBe(45050);
    expect(pesosToCentavos(0.1 + 0.2)).toBe(30);
  });
});
