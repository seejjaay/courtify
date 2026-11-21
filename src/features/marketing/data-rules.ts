/** Pure rules behind the marketing data readers (kept free of server-only imports so they're unit-testable). */

/** What a yearly Pro plan saves over twelve monthly payments, or null when it saves nothing. */
export function yearlySavingCentavos(monthly: number, yearly: number): number | null {
  const saving = 12 * monthly - yearly;
  return saving > 0 ? saving : null;
}

export type PublicStats = { venues: number; cities: number; sports: number };

/** Below these, counts would undersell the platform, so the stats band stays hidden. */
export const STATS_MINIMUM = { venues: 10, cities: 3 } as const;

export function statsWorthShowing(counts: PublicStats, min: { venues: number; cities: number } = STATS_MINIMUM): PublicStats | null {
  return counts.venues >= min.venues && counts.cities >= min.cities ? counts : null;
}
