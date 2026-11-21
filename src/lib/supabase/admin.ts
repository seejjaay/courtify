import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { publicEnv, serverEnv } from './env';
import type { Database } from './types';

/** Service-role client: bypasses RLS. Only for audited server actions that genuinely need it. */
export function createAdminSupabase(): SupabaseClient<Database> {
  return createClient<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, serverEnv().SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
