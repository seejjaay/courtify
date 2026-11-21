import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { publicEnv } from './env';
import type { Database } from './types';

/**
 * An anonymous client with no cookies and no session: what any visitor can see, through RLS.
 * Safe inside `'use cache'` functions, unlike createServerSupabase (cookies + connection()).
 */
export function createPublicSupabase(): SupabaseClient<Database> {
  return createClient<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
