import { expect, it } from 'vitest';
import { statsWorthShowing, yearlySavingCentavos } from './data-rules';

it('yearly saving is twelve monthly payments minus the yearly price, when positive', () => {
  expect(yearlySavingCentavos(99900, 999000)).toBe(199800);
  expect(yearlySavingCentavos(99900, 1198800)).toBeNull(); // exactly 12×: no saving
  expect(yearlySavingCentavos(99900, 1500000)).toBeNull();
});

it('stats show only once they clear the minimum', () => {
  expect(statsWorthShowing({ venues: 10, cities: 3, sports: 6 })).toEqual({ venues: 10, cities: 3, sports: 6 });
  expect(statsWorthShowing({ venues: 9, cities: 5, sports: 6 })).toBeNull();
  expect(statsWorthShowing({ venues: 40, cities: 2, sports: 6 })).toBeNull();
});
