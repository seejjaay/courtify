import { describe, expect, it } from 'vitest';
import { pricingCopy } from './pricing-copy';

describe('pricingCopy', () => {
  it('words the plan from platform settings', () => {
    expect(
      pricingCopy({ monthlyCentavos: 99900, yearlyCentavos: 999000, trialDays: 30, graceDays: 7, yearlySavingCentavos: 199800 }),
    ).toEqual({
      monthly: '₱999',
      yearly: '₱9,990',
      saving: 'Save ₱1,998 a year',
      trial: 'Start with a 30-day free trial',
      grace: '7 days of grace if a payment runs late',
    });
  });

  it('drops the saving, trial and grace lines when they do not apply', () => {
    expect(
      pricingCopy({ monthlyCentavos: 99900, yearlyCentavos: 1198800, trialDays: 0, graceDays: 0, yearlySavingCentavos: null }),
    ).toMatchObject({ saving: null, trial: null, grace: null });
  });

  it('says "1 day" in the singular', () => {
    expect(
      pricingCopy({ monthlyCentavos: 99900, yearlyCentavos: 999000, trialDays: 1, graceDays: 1, yearlySavingCentavos: null }),
    ).toMatchObject({ trial: 'Start with a 1-day free trial', grace: '1 day of grace if a payment runs late' });
  });
});
