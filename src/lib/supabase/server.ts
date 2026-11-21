import 'server-only';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { connection } from 'next/server';
import { publicEnv } from './env';
import type { Database } from './types';

/** Per-request client for Server Components, Server Actions and Route Handlers, acting as the signed-in user. */
export async function createServerSupabase(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();
  // Session data is per request. Under Cache Components this keeps every render that uses the
  // client at request time, where supabase-js may read the clock (Date.now()) for token expiry.
  await connection();
  return createServerClient<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Server Components can't set cookies. That's fine: the proxy refreshes the session.
        }
      },
    },
  });
}
