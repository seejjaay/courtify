import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { publicEnv } from './env';
import type { Database } from './types';

/** Browser client (a singleton per tab). Reads and writes the session cookies the proxy refreshes. */
export function createBrowserSupabase(): SupabaseClient<Database> {
  return createBrowserClient<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}
