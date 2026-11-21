import { z } from 'zod';

// NEXT_PUBLIC_* must be read with literal property access so Next can inline them in the browser bundle.
export const publicEnv = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  })
  .parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });

/** Server only: the secret key bypasses RLS. Read lazily so client bundles never touch it. */
export function serverEnv(): { SUPABASE_SECRET_KEY: string } {
  return z.object({ SUPABASE_SECRET_KEY: z.string().min(1) }).parse({ SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY });
}
