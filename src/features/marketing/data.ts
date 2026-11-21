import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { createPublicSupabase } from '@/lib/supabase/public';
import { statsWorthShowing, yearlySavingCentavos, type PublicStats } from './data-rules';

export { STATS_MINIMUM, statsWorthShowing, yearlySavingCentavos, type PublicStats } from './data-rules';

export type ProPricing = {
  monthlyCentavos: number;
  yearlyCentavos: number;
  trialDays: number;
  graceDays: number;
  yearlySavingCentavos: number | null;
};

/** Pro prices and terms as set in platform settings. M5's settings editor revalidates 'platform-settings'. */
export async function getProPricing(): Promise<ProPricing> {
  'use cache';
  cacheTag('platform-settings');
  cacheLife('hours');
  const { data, error } = await createPublicSupabase()
    .from('platform_settings')
    .select('pro_monthly_centavos, pro_yearly_centavos, trial_days, grace_days')
    .single();
  if (error) throw error;
  return {
    monthlyCentavos: data.pro_monthly_centavos,
    yearlyCentavos: data.pro_yearly_centavos,
    trialDays: data.trial_days,
    graceDays: data.grace_days,
    yearlySavingCentavos: yearlySavingCentavos(data.pro_monthly_centavos, data.pro_yearly_centavos),
  };
}

export async function getSportOptions(): Promise<{ slug: string; name: string }[]> {
  'use cache';
  cacheTag('catalog');
  cacheLife('days');
  const { data, error } = await createPublicSupabase().from('sports').select('slug, name').order('sort');
  if (error) throw error;
  return data;
}

/** Real counts of what's listed, or null while they're too small to be worth showing. */
export async function getPublicStats(): Promise<PublicStats | null> {
  'use cache';
  cacheLife('hours');
  const supabase = createPublicSupabase();
  // Anonymous RLS already limits both reads to active venues and their courts.
  const [venues, courts] = await Promise.all([
    supabase.from('venues').select('city').eq('status', 'active'),
    supabase.from('courts').select('sport_id').eq('is_active', true),
  ]);
  if (venues.error) throw venues.error;
  if (courts.error) throw courts.error;
  return statsWorthShowing({
    venues: venues.data.length,
    cities: new Set(venues.data.map((v) => v.city?.trim().toLowerCase()).filter(Boolean)).size,
    sports: new Set(courts.data.map((c) => c.sport_id)).size,
  });
}
