import { formatPHP } from '@/lib/money';
import type { ProPricing } from './data';

const days = (n: number) => `${n}-day`;

/** Wording for the Pro card. Lines that don't apply come back null so the card can leave them out. */
export function pricingCopy(p: ProPricing): {
  monthly: string;
  yearly: string;
  saving: string | null;
  trial: string | null;
  grace: string | null;
} {
  return {
    monthly: formatPHP(p.monthlyCentavos),
    yearly: formatPHP(p.yearlyCentavos),
    saving: p.yearlySavingCentavos ? `Save ${formatPHP(p.yearlySavingCentavos)} a year` : null,
    trial: p.trialDays > 0 ? `Start with a ${days(p.trialDays)} free trial` : null,
    grace: p.graceDays > 0 ? `${p.graceDays} ${p.graceDays === 1 ? 'day' : 'days'} of grace if a payment runs late` : null,
  };
}
