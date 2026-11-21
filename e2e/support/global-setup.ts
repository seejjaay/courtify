import { existsSync } from 'node:fs';

/** Fails the whole run up front when the local Supabase stack isn't reachable. */
export default async function globalSetup(): Promise<void> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL && existsSync('.env.local')) process.loadEnvFile('.env.local');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
  const healthy = await fetch(`${url}/auth/v1/health`, { headers: { apikey: key } })
    .then((res) => res.status === 200)
    .catch(() => false);
  if (!url || !healthy) throw new Error("Local Supabase isn't running — run npm run db:start");
}
