-- Courtify local seed: fictional venues, demo accounts and 60 days of booking history.
-- Every id is fixed (literal, or md5 of a stable key), so e2e/support/seed-ids.ts can name them.
-- Demo accounts (local only), all with password courtify-demo:
--   admin@, owner@, manager@, staff@, player@courtify.test, plus player01..player40@courtify.test

-- Audit triggers skip seeded rows; availability broadcasts are switched off below.
select set_config('courtify.seeding', 'on', false);

-- ---------------------------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------------------------
create temp table seed_people as
select * from (
  values
    ('a0000000-0000-4000-8000-000000000001'::uuid, 'admin@courtify.test', 'Andrea Villanueva', '+639170000001'),
    ('a0000000-0000-4000-8000-000000000002'::uuid, 'owner@courtify.test', 'Olivia Reyes', '+639170000002'),
    ('a0000000-0000-4000-8000-000000000003'::uuid, 'manager@courtify.test', 'Marco Santos', '+639170000003'),
    ('a0000000-0000-4000-8000-000000000004'::uuid, 'staff@courtify.test', 'Sam Dela Cruz', '+639170000004'),
    ('a0000000-0000-4000-8000-000000000005'::uuid, 'player@courtify.test', 'Pia Mendoza', '+639170000005')
) as demo (id, email, full_name, phone)
union all
select
  ('a0000000-0000-4000-8000-0000000010' || lpad(n::text, 2, '0'))::uuid,
  'player' || lpad(n::text, 2, '0') || '@courtify.test',
  (array['Andrei', 'Bea', 'Carlo', 'Dana', 'Enzo', 'Fritz', 'Gela', 'Hans', 'Isa', 'Jomar'])[1 + (n - 1) % 10] || ' ' ||
  (array['Aquino', 'Bautista', 'Castro', 'Domingo', 'Estrada', 'Flores', 'Garcia', 'Hernandez'])[1 + (n - 1) % 8],
  '+63917' || lpad((1000000 + n)::text, 7, '0')
from generate_series(1, 40) as n;

-- GoTrue reads these token columns as strings and fails on NULL, so they are ''.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change_token_current,
  email_change, phone_change, phone_change_token, reauthentication_token
)
select
  '00000000-0000-0000-0000-000000000000', p.id, 'authenticated', 'authenticated', p.email, pw.hash, now(),
  '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', p.full_name),
  now() - interval '200 days', now(),
  '', '', '', '', '', '', '', ''
from seed_people p
cross join (select extensions.crypt('courtify-demo', extensions.gen_salt('bf')) as hash) as pw;

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select md5('identity:' || p.id)::uuid, p.id, p.id::text, 'email',
       jsonb_build_object('sub', p.id::text, 'email', p.email, 'email_verified', true),
       now(), now(), now()
from seed_people p;

-- on_auth_user_created built the profiles; add the phones.
update public.profiles pr set phone = p.phone from seed_people p where pr.id = p.id;

insert into public.platform_admins (user_id) values ('a0000000-0000-4000-8000-000000000001');

-- ---------------------------------------------------------------------------------------------
-- Venues (all fictional). Offsets are relative to now(): trial_ends_at = now() + trial_offset,
-- pro_until = now() + pro_offset.
-- ---------------------------------------------------------------------------------------------
create temp table seed_venues as
select
  v.*,
  ('b0000000-0000-4000-8000-0000000000' || lpad(v.n::text, 2, '0'))::uuid as id,
  case v.owner_key
    when 'owner' then 'a0000000-0000-4000-8000-000000000002'::uuid
    else ('a0000000-0000-4000-8000-0000000010' || substr(v.owner_key, 2))::uuid
  end as owner_id
from (
  values
    (1, 'terracotta-rally-club', 'Terracotta Rally Club', 'Makati', 'Metro Manila', 14.5547, 121.0244, array['tennis', 'padel'], 'pro', 'gcash_proof', 'owner', '06:00'::time, '23:00'::time, 4, interval '-120 days', interval '5 months'),
    (2, 'chalkline-pickle-yard', 'Chalkline Pickle Yard', 'Taguig', 'Metro Manila', 14.5509, 121.0503, array['pickleball'], 'trial', 'at_venue', 'p01', '06:00', '22:00', 4, interval '18 days', null),
    (3, 'shuttle-and-sol', 'Shuttle & Sol', 'Quezon City', 'Metro Manila', 14.6349, 121.0337, array['badminton'], 'pro', 'gcash_proof', 'p02', '07:00', '23:00', 6, interval '-150 days', interval '20 days'),
    (4, 'kanto-baseline-courts', 'Kanto Baseline Courts', 'Pasig', 'Metro Manila', 14.5764, 121.0851, array['badminton', 'pickleball'], 'free', 'at_venue', 'owner', '06:00', '22:00', 3, interval '-90 days', null),
    (5, 'arco-padel-terraza', 'Arco Padel Terraza', 'Muntinlupa', 'Metro Manila', 14.4081, 121.0415, array['padel'], 'pro', 'at_venue', 'p03', '06:00', '23:00', 3, interval '-200 days', interval '3 months'),
    (6, 'loma-clayhouse', 'Loma Clayhouse', 'Parañaque', 'Metro Manila', 14.4793, 121.0198, array['tennis', 'squash'], 'free', 'at_venue', 'p04', '06:00', '21:00', 4, interval '-300 days', null),
    (7, 'sugbo-smash-house', 'Sugbo Smash House', 'Cebu City', 'Cebu', 10.3157, 123.8854, array['pickleball', 'badminton'], 'pro', 'gcash_proof', 'p05', '07:00', '23:00', 5, interval '-100 days', interval '2 months'),
    (8, 'mactan-breeze-courts', 'Mactan Breeze Courts', 'Lapu-Lapu', 'Cebu', 10.3103, 123.9494, array['tennis'], 'lapsed', 'at_venue', 'p06', '06:00', '21:00', 2, interval '-170 days', interval '-20 days'),
    (9, 'ermita-ping-pong-plaza', 'Ermita Ping Pong Plaza', 'Manila', 'Metro Manila', 14.5832, 120.9850, array['table-tennis'], 'free', 'at_venue', 'p07', '09:00', '21:00', 6, interval '-60 days', null),
    (10, 'dink-district-mandaluyong', 'Dink District Mandaluyong', 'Mandaluyong', 'Metro Manila', 14.5794, 121.0359, array['pickleball'], 'pro', 'gcash_proof', 'p08', '07:00', '02:00', 4, interval '-80 days', interval '40 days'),
    (11, 'ortigas-squash-box', 'Ortigas Squash Box', 'Pasig', 'Metro Manila', 14.5869, 121.0614, array['squash'], 'pending', 'at_venue', 'p01', '07:00', '22:00', 2, null, null),
    (12, 'patio-padel-tagaytay', 'Patio Padel Tagaytay', 'Tagaytay', 'Cavite', 14.1153, 120.9621, array['padel'], 'draft', 'at_venue', 'owner', '07:00', '21:00', 0, null, null)
) as v (n, slug, name, city, province, lat, lng, sports, tier, payment_mode, owner_key, opens, closes, courts, trial_offset, pro_offset);

insert into public.venues (
  id, slug, name, description, address_line, city, province, location, phone, messenger_url,
  status, payment_mode, trial_ends_at, pro_until, submitted_at, approved_at, created_by, created_at
)
select
  sv.id, sv.slug, sv.name,
  format('%s is a fictional %s venue in %s with %s courts. Demo data for local development.',
         sv.name, array_to_string(sv.sports, ' and '), sv.city, greatest(sv.courts, 1)),
  format('%s %s St.', 10 + sv.n * 7, (array['Mabini', 'Rizal', 'Bonifacio', 'Luna', 'Del Pilar', 'Burgos'])[1 + sv.n % 6]),
  sv.city, sv.province,
  extensions.st_setsrid(extensions.st_makepoint(sv.lng, sv.lat), 4326)::extensions.geography,
  '+63917' || lpad((2000000 + sv.n)::text, 7, '0'),
  'https://m.me/' || replace(sv.slug, '-', ''),
  case sv.tier when 'pending' then 'pending_review' when 'draft' then 'draft' else 'active' end::public.venue_status,
  sv.payment_mode::public.payment_mode,
  now() + sv.trial_offset,
  now() + sv.pro_offset,
  case when sv.tier = 'pending' then now() - interval '2 days'
       when sv.tier <> 'draft' then now() + sv.trial_offset - interval '32 days' end,
  case when sv.tier not in ('pending', 'draft') then now() + sv.trial_offset - interval '30 days' end,
  sv.owner_id,
  now() - interval '210 days'
from seed_venues sv;

-- The demo owner's flagship also has the demo manager and staff.
insert into public.venue_members (venue_id, user_id, role) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003', 'manager'),
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000004', 'staff');

-- ---------------------------------------------------------------------------------------------
-- Courts, hours, rates, amenities, photos, payment details
-- ---------------------------------------------------------------------------------------------
insert into public.courts (id, venue_id, sport_id, name, surface, is_indoor, has_lights, base_rate_centavos, sort)
select
  md5('court:' || sv.n || ':' || k)::uuid,
  sv.id,
  s.id,
  'Court ' || k,
  case sport.slug
    when 'tennis' then case when sv.slug = 'loma-clayhouse' then 'clay' else 'hard' end
    when 'padel' then 'synthetic-grass'
    when 'pickleball' then case when sv.slug = 'kanto-baseline-courts' then 'concrete' else 'hard' end
    else 'wood'
  end,
  sport.slug in ('badminton', 'table-tennis', 'squash') or (sport.slug = 'padel' and k % 2 = 0),
  not (sport.slug in ('badminton', 'table-tennis', 'squash') or (sport.slug = 'padel' and k % 2 = 0)),
  case sport.slug
    when 'tennis' then 90000 when 'padel' then 120000 when 'pickleball' then 50000
    when 'badminton' then 35000 when 'table-tennis' then 25000 else 60000
  end + (sv.n % 4) * 5000,
  k - 1
from seed_venues sv
cross join lateral generate_series(1, sv.courts) as k
cross join lateral (select sv.sports[1 + (k - 1) % cardinality(sv.sports)] as slug) as sport
join public.sports s on s.slug = sport.slug;

insert into public.venue_hours (venue_id, weekday, opens_at, closes_at)
select sv.id, d, sv.opens, sv.closes
from seed_venues sv
cross join generate_series(0, 6) as d
where sv.tier <> 'draft';

-- Weekday evening peak, 17:00-22:00, at +20/30/40% (rounded to ₱5).
insert into public.court_rates (id, court_id, weekdays, starts_at, ends_at, rate_centavos)
select md5('rate:' || c.id)::uuid, c.id, '{1,2,3,4,5}', '17:00', '22:00',
       (round(c.base_rate_centavos * (1.2 + ((sv.n + c.sort) % 3) * 0.1) / 500.0) * 500)::int
from public.courts c
join seed_venues sv on sv.id = c.venue_id;

insert into public.venue_amenities (venue_id, amenity_id)
select sv.id, a.id
from seed_venues sv
cross join lateral generate_series(0, 2 + sv.n % 4) as i
join public.amenities a on a.sort = 1 + (sv.n + i * 5) % 12
where sv.tier <> 'draft';

-- 3-5 photos for every listed or submitted venue; scripts/seed-photos.ts renders the files.
insert into public.venue_photos (id, venue_id, path, width, height, sort, alt)
select photo.id, sv.id, sv.id::text || '/' || photo.id::text, 1600, 1067, k - 1,
       format('%s, %s court %s', sv.name, replace(sv.sports[1], '-', ' '), k)
from seed_venues sv
cross join lateral generate_series(1, 3 + sv.n % 3) as k
cross join lateral (select md5('photo:' || sv.n || ':' || k)::uuid as id) as photo
where sv.tier <> 'draft';

update public.venue_payment_details d
set gcash_name = pe.full_name,
    gcash_number = '0917' || lpad((3000000 + sv.n)::text, 7, '0')
from seed_venues sv
join seed_people pe on pe.id = sv.owner_id
where d.venue_id = sv.id and sv.payment_mode = 'gcash_proof';

-- ---------------------------------------------------------------------------------------------
-- Pro billing: one verified payment for every venue that has had Pro, plus one awaiting review.
-- ---------------------------------------------------------------------------------------------
insert into public.subscription_payments (
  id, venue_id, period, amount_centavos, reference_no, proof_path, status,
  submitted_by, submitted_at, reviewed_by, reviewed_at, period_start, period_end
)
select
  md5('subscription:' || sv.n || ':1')::uuid,
  sv.id,
  term.period,
  case term.period when 'monthly' then s.pro_monthly_centavos else s.pro_yearly_centavos end,
  'GC-' || lpad(sv.n::text, 4, '0') || '-01',
  sv.id::text || '/receipt-1.webp',
  'verified',
  sv.owner_id,
  now() + sv.pro_offset - term.length - interval '1 day',
  'a0000000-0000-4000-8000-000000000001',
  now() + sv.pro_offset - term.length,
  now() + sv.pro_offset - term.length,
  now() + sv.pro_offset
from seed_venues sv
cross join public.platform_settings s
cross join lateral (
  select case when sv.pro_offset > interval '1 month' then 'yearly' else 'monthly' end::public.billing_period as period,
         case when sv.pro_offset > interval '1 month' then interval '1 year' else interval '1 month' end as length
) as term
where sv.tier in ('pro', 'lapsed');

insert into public.subscription_payments (id, venue_id, period, amount_centavos, reference_no, proof_path, status, submitted_by, submitted_at)
select md5('subscription:3:2')::uuid, sv.id, 'monthly', s.pro_monthly_centavos, 'GC-0003-02',
       sv.id::text || '/receipt-2.webp', 'submitted', sv.owner_id, now() - interval '3 hours'
from seed_venues sv
cross join public.platform_settings s
where sv.n = 3;

-- ---------------------------------------------------------------------------------------------
-- Bookings, for venues that have (or had) Pro. Hand-placed rows first, then generated history.
-- ---------------------------------------------------------------------------------------------
alter table public.bookings disable trigger bookings_broadcast_availability;

-- One block per bookable venue: the first court, three days out, the first two hours.
insert into public.bookings (id, venue_id, court_id, kind, during, status, price_total_centavos, payment_mode, payment_status, notes, created_at)
select md5('block:' || sv.n)::uuid, sv.id, first_court.id, 'block',
       tstzrange(lower(session.bounds), lower(session.bounds) + interval '2 hours'),
       'confirmed', 0, 'at_venue', 'waived', 'Court resurfacing', now() - interval '2 days'
from seed_venues sv
cross join lateral (
  select c.id from public.courts c where c.venue_id = sv.id order by c.sort limit 1
) as first_court
cross join lateral (
  select public.session_bounds(sv.id, (now() at time zone 'Asia/Manila')::date + 3) as bounds
) as session
where sv.tier in ('pro', 'trial', 'lapsed');

-- The demo player at Terracotta Rally Club: two proofs waiting for the venue, and a live hold.
insert into public.bookings (
  id, venue_id, court_id, player_id, kind, during, status, hold_expires_at,
  price_total_centavos, payment_mode, payment_status, created_by, created_at
)
select md5('demo:' || x.key)::uuid, 'b0000000-0000-4000-8000-000000000001', md5('court:1:' || x.court)::uuid,
       'a0000000-0000-4000-8000-000000000005', 'online',
       tstzrange(x.starts_at, x.starts_at + interval '1 hour'),
       x.status::public.booking_status, x.hold_expires_at,
       public.compute_price(md5('court:1:' || x.court)::uuid, x.starts_at, x.starts_at + interval '1 hour'),
       'gcash_proof', x.payment_status::public.payment_status,
       'a0000000-0000-4000-8000-000000000005', now() - interval '3 hours'
from (
  values
    ('pending-1', 1, ((now() at time zone 'Asia/Manila')::date + 2 + time '18:00') at time zone 'Asia/Manila', 'pending_verification', null::timestamptz, 'proof_submitted'),
    ('pending-2', 2, ((now() at time zone 'Asia/Manila')::date + 3 + time '18:00') at time zone 'Asia/Manila', 'pending_verification', null, 'proof_submitted'),
    ('held', 1, ((now() at time zone 'Asia/Manila')::date + 4 + time '19:00') at time zone 'Asia/Manila', 'held', now() + interval '25 minutes', 'unpaid')
) as x (key, court, starts_at, status, hold_expires_at, payment_status);

insert into public.booking_payments (id, booking_id, amount_centavos, reference_no, proof_path, status, submitted_by, submitted_at)
select md5('payment:' || b.id)::uuid, b.id, b.price_total_centavos,
       'GC-' || upper(substr(md5(b.id::text), 1, 8)),
       b.player_id::text || '/' || b.id::text || '/proof.webp',
       'submitted', b.player_id, now() - interval '20 minutes'
from public.bookings b
where b.id in (md5('demo:pending-1')::uuid, md5('demo:pending-2')::uuid);

-- 60 days back and 14 ahead, hour by hour: busier on weekday evenings and weekend days, thinner
-- the further ahead. Past: 85% completed, 10% cancelled, 5% no-show. About 15% are walk-ins.
do $$
declare
  v_today date := (now() at time zone 'Asia/Manila')::date;
  v_players uuid[];
  v_names text[] := array['Ana Lim', 'Ben Tan', 'Cris Ong', 'Dina Cruz', 'Eli Sy', 'Faye Go', 'Gino Uy', 'Hazel Yu'];
  v record;
  c record;
  v_day int;
  v_session tstzrange;
  v_start timestamptz;
  v_end timestamptz;
  v_hour int;
  v_dow int;
  v_chance float8;
  v_roll float8;
  v_walk_in boolean;
  v_status public.booking_status;
  v_payment public.payment_status;
  v_player uuid;
  v_created timestamptz;
  v_code text;
begin
  perform setseed(0.42);
  select array_agg(p.id order by p.email) into v_players from seed_people p where p.email like 'player%';

  for v in
    select sv.n, sv.id, vv.payment_mode
    from seed_venues sv
    join public.venues vv on vv.id = sv.id
    where sv.tier in ('pro', 'trial', 'lapsed')
    order by sv.n
  loop
    for c in select ct.id from public.courts ct where ct.venue_id = v.id order by ct.sort loop
      for v_day in -60..13 loop
        v_session := public.session_bounds(v.id, v_today + v_day);
        continue when v_session is null;

        v_start := lower(v_session);
        while v_start + interval '1 hour' <= upper(v_session) loop
          v_end := v_start + interval '1 hour';
          v_hour := extract(hour from v_start at time zone 'Asia/Manila');
          v_dow := extract(dow from v_start at time zone 'Asia/Manila');
          v_chance := case
            when v_dow between 1 and 5 and v_hour between 17 and 21 then 0.62
            when v_dow in (0, 6) and v_hour between 8 and 20 then 0.48
            else 0.18
          end;
          if v_day >= 0 then
            v_chance := v_chance * greatest(0.15, 0.7 - v_day * 0.04);
          end if;

          -- Skip the hour in progress, and future hours a block or demo booking already holds.
          if random() < v_chance
             and (v_end <= now() or v_start >= now() + interval '1 hour')
             and not (v_start >= now() and exists (
               select 1 from public.bookings b
               where b.court_id = c.id
                 and b.during && tstzrange(v_start, v_end)
                 and b.status in ('held', 'pending_verification', 'confirmed', 'checked_in')
             )) then
            v_walk_in := random() < 0.15;
            v_roll := random();
            if v_end <= now() then
              v_status := case when v_roll < 0.85 then 'completed' when v_roll < 0.95 then 'cancelled' else 'no_show' end;
            else
              v_status := case when v_roll < 0.95 then 'confirmed' else 'cancelled' end;
            end if;
            v_payment := case
              when v_status = 'completed' then 'paid'
              when v_walk_in and v_status = 'confirmed' then 'paid'
              when v_status = 'confirmed' and v.payment_mode = 'gcash_proof' then 'paid'
              else 'unpaid'
            end;
            v_player := case when v_walk_in then null else v_players[1 + floor(random() * cardinality(v_players))::int] end;
            -- Created days earlier, so nobody starts out rate-limited.
            v_created := least(v_start, now()) - make_interval(days => 1 + floor(random() * 6)::int);
            -- Thousands of rows make a booking-code collision likely, so redraw until unique.
            loop
              v_code := public.gen_booking_code();
              exit when not exists (select 1 from public.bookings b where b.code = v_code);
            end loop;

            insert into public.bookings (
              id, code, venue_id, court_id, player_id, kind, customer_name, during, status, price_total_centavos,
              payment_mode, payment_status, created_by, created_at, cancelled_at, cancel_reason
            ) values (
              md5('booking:' || c.id::text || ':' || v_start::text)::uuid,
              v_code,
              v.id,
              c.id,
              v_player,
              case when v_walk_in then 'walk_in' else 'online' end::public.booking_kind,
              case when v_walk_in then v_names[1 + floor(random() * cardinality(v_names))::int] end,
              tstzrange(v_start, v_end),
              v_status,
              public.compute_price(c.id, v_start, v_end),
              case when v_walk_in then 'at_venue'::public.payment_mode else v.payment_mode end,
              v_payment,
              v_player,
              v_created,
              case when v_status = 'cancelled' then least(v_created + interval '1 day', v_start) end,
              case when v_status = 'cancelled' then 'Change of plans' end
            );
          end if;

          v_start := v_end;
        end loop;
      end loop;
    end loop;
  end loop;
end
$$;

alter table public.bookings enable trigger bookings_broadcast_availability;

drop table seed_people, seed_venues;
select set_config('courtify.seeding', 'off', false);
