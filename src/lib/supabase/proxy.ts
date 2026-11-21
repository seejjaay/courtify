import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { publicEnv } from './env';
import type { Database } from './types';

/**
 * Refreshes the Supabase session on every matched request and returns the response that
 * carries the refreshed cookies, plus the signed-in user's id (from verified JWT claims).
 */
export async function updateSession(
  request: NextRequest,
): Promise<{ response: NextResponse; userId: string | null; supabase: SupabaseClient<Database> }> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        // Responses that set auth cookies must never be cached by a CDN.
        for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
      },
    },
  });

  // Nothing may run between creating the client and getClaims(): it's what refreshes the session.
  const { data } = await supabase.auth.getClaims();
  return { response, userId: data?.claims?.sub ?? null, supabase };
}
