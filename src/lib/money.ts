/** All money is stored as integer centavos (₱1 = 100). */

export function formatPHP(centavos: number): string {
  const whole = centavos % 100 === 0;
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(centavos / 100);
}

export function pesosToCentavos(pesos: number): number {
  return Math.round(pesos * 100);
}
