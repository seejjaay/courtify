import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, expect, it } from 'vitest';

// Runs against the local Supabase stack (`npm run db:start`), with keys from .env.local.
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is missing: start the stack with \`npm run db:start\` and fill .env.local from \`npx supabase status -o env\`.`);
  }
  return value;
}

const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
const publishableKey = requireEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
const secretKey = requireEnv('SUPABASE_SECRET_KEY');

const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, secretKey, clientOptions);

const tag = crypto.randomUUID().slice(0, 8);
const password = `race-${crypto.randomUUID()}`;
const userIds: string[] = [];
let venueId: string | undefined;
let courtId: string;
let playerA: SupabaseClient;
let playerB: SupabaseClient;

/** A whole hour in Manila time (10:00 by default), three Manila days from now. */
function slotStartIso(hour = 10): string {
  const manilaToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());
  const start = new Date(`${manilaToday}T${String(hour).padStart(2, '0')}:00:00+08:00`);
  start.setUTCDate(start.getUTCDate() + 3);
  return start.toISOString();
}

async function signedInPlayer(name: string): Promise<SupabaseClient> {
  const email = `race-${name}-${tag}@t.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Racer ${name.toUpperCase()}` },
  });
  if (error) throw error;
  userIds.push(data.user.id);

  const { error: phoneError } = await admin.from('profiles').update({ phone: '+639170000000' }).eq('id', data.user.id);
  if (phoneError) throw phoneError;

  const client = createClient(url, publishableKey, clientOptions);
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return client;
}

beforeAll(async () => {
  const { data: venue, error: venueError } = await admin
    .from('venues')
    .insert({
      slug: `race-${tag}`,
      name: `Race ${tag}`,
      status: 'active',
      payment_mode: 'gcash_proof',
      trial_ends_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    })
    .select('id')
    .single();
  if (venueError) throw venueError;
  venueId = venue.id;

  const { error: hoursError } = await admin
    .from('venue_hours')
    .insert(Array.from({ length: 7 }, (_, weekday) => ({ venue_id: venueId, weekday, opens_at: '00:00', closes_at: '00:00' })));
  if (hoursError) throw hoursError;

  const { data: sport, error: sportError } = await admin.from('sports').select('id').eq('slug', 'pickleball').single();
  if (sportError) throw sportError;

  const { data: court, error: courtError } = await admin
    .from('courts')
    .insert({ venue_id: venueId, sport_id: sport.id, name: 'Race court', base_rate_centavos: 40000 })
    .select('id')
    .single();
  if (courtError) throw courtError;
  courtId = court.id;

  playerA = await signedInPlayer('a');
  playerB = await signedInPlayer('b');
});

// Runs even when setup or the test fails, so no fixtures leak into the local database.
afterAll(async () => {
  if (venueId) {
    await admin.from('bookings').delete().eq('venue_id', venueId);
    await admin.from('venues').delete().eq('id', venueId);
  }
  await Promise.all(userIds.map((id) => admin.auth.admin.deleteUser(id)));
});

it('two players racing for one slot: exactly one wins', async () => {
  const args = { p_court_id: courtId, p_starts_at: slotStartIso(), p_minutes: 60 };
  const [a, b] = await Promise.all([playerA.rpc('create_booking', args), playerB.rpc('create_booking', args)]);
  expect([a, b].filter((r) => !r.error)).toHaveLength(1);
  expect([a, b].filter((r) => r.error?.message === 'slot_taken')).toHaveLength(1);
});

// Review Focus 2 under real concurrency. Two requests often land one after the other, so fire
// several at once: without the per-player lock in create_booking, some of them get slot_taken.
it('a burst of double taps from one player all return the same booking', async () => {
  const args = { p_court_id: courtId, p_starts_at: slotStartIso(11), p_minutes: 60 };
  const results = await Promise.all(Array.from({ length: 8 }, () => playerA.rpc('create_booking', args)));
  expect(results.map((r) => r.error?.message ?? null)).toEqual(Array(8).fill(null));
  expect(new Set(results.map((r) => r.data.id)).size).toBe(1);
});
