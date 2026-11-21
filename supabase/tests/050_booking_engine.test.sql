begin;
select plan(25);

-- Dates in Manila: d2 is two days ahead; fri/sat are a Friday more than a week ahead and the Saturday after.
select (now() at time zone 'Asia/Manila')::date + 2 as d2 \gset
with base as (select (now() at time zone 'Asia/Manila')::date + 8 as d)
select d + (5 - extract(dow from d)::int + 7) % 7 as fri,
       d + (5 - extract(dow from d)::int + 7) % 7 + 1 as sat
from base \gset

-- Players: p1 and p2 have phones, p3 doesn't.
select tests.create_user('be-owner@t.test', 'Owner') as owner \gset
select tests.create_user('be-p1@t.test', 'P One') as p1 \gset
select tests.create_user('be-p2@t.test', 'P Two') as p2 \gset
select tests.create_user('be-p3@t.test', 'P Three', null) as p3 \gset

-- Venues (as postgres). v: GCash, 60-min slots, 06:00-00:00. h: pay at venue, 30-min slots, 06:00-23:00.
-- n: 16:00-02:00. v24: 24 h with a 2-hour lead. f: free (no trial). f_draft: never submitted.
insert into public.venues (slug, name, created_by, status, payment_mode, slot_minutes, trial_ends_at)
  values ('t-be-v', 'V', :'owner', 'active', 'gcash_proof', 60, now() + interval '30 days')
  returning id as v \gset
insert into public.venues (slug, name, created_by, status, payment_mode, slot_minutes, trial_ends_at)
  values ('t-be-h', 'H', :'owner', 'active', 'at_venue', 30, now() + interval '30 days')
  returning id as h \gset
insert into public.venues (slug, name, created_by, status, trial_ends_at)
  values ('t-be-n', 'N', :'owner', 'active', now() + interval '30 days')
  returning id as n \gset
insert into public.venues (slug, name, created_by, status, min_lead_minutes, trial_ends_at)
  values ('t-be-v24', 'V24', :'owner', 'active', 120, now() + interval '30 days')
  returning id as v24 \gset
insert into public.venues (slug, name, created_by, status)
  values ('t-be-f', 'F', :'owner', 'active')
  returning id as f \gset
insert into public.venues (slug, name, created_by)
  values ('t-be-f-draft', 'F draft', :'owner')
  returning id as f_draft \gset

insert into public.venue_hours (venue_id, weekday, opens_at, closes_at)
select x.venue_id, d.weekday, x.opens_at, x.closes_at
from (values
  (:'v'::uuid, '06:00'::time, '00:00'::time),
  (:'h'::uuid, '06:00', '23:00'),
  (:'n'::uuid, '16:00', '02:00'),
  (:'v24'::uuid, '00:00', '00:00'),
  (:'f'::uuid, '06:00', '22:00'),
  (:'f_draft'::uuid, '06:00', '22:00')
) as x (venue_id, opens_at, closes_at)
cross join generate_series(0, 6) as d (weekday);

insert into public.courts (venue_id, sport_id, name, base_rate_centavos)
  values (:'v', (select id from public.sports where slug = 'pickleball'), 'C', 40000) returning id as c \gset
insert into public.courts (venue_id, sport_id, name, base_rate_centavos)
  values (:'h', (select id from public.sports where slug = 'pickleball'), 'C30', 40000) returning id as c30 \gset
insert into public.courts (venue_id, sport_id, name, base_rate_centavos)
  values (:'n', (select id from public.sports where slug = 'badminton'), 'CN', 40000) returning id as cn \gset
insert into public.courts (venue_id, sport_id, name, base_rate_centavos)
  values (:'v24', (select id from public.sports where slug = 'tennis'), 'C24', 40000) returning id as c24 \gset
insert into public.courts (venue_id, sport_id, name, base_rate_centavos)
  values (:'f', (select id from public.sports where slug = 'squash'), 'CF', 40000) returning id as cf \gset
insert into public.court_rates (court_id, weekdays, starts_at, ends_at, rate_centavos) values
  (:'c', '{0,1,2,3,4,5,6}', '18:00', '22:00', 60000),
  (:'c30', '{0,1,2,3,4,5,6}', '18:00', '22:00', 60000);

-- Pricing and hours
select is(public.compute_price(:'c', tests.manila(:'d2', '17:00'), tests.manila(:'d2', '19:00')), 100000, 'price crosses into peak at 18:00');
select is(public.quote_booking(:'c30', tests.manila(:'d2', '17:30'), 60), 50000, '30-minute slots price each half hour');
select is(public.is_within_hours(:'n', tests.manila(:'fri', '23:00'), tests.manila(:'sat', '01:00')), true, 'session runs past midnight');
select is(public.is_within_hours(:'n', tests.manila(:'sat', '01:00'), tests.manila(:'sat', '03:00')), false, 'not past closing');

-- create_booking
select tests.authenticate_as(:'p1');
select id as b1 from public.create_booking(:'c', tests.manila(:'d2', '10:00'), 60) \gset
select ok((select status = 'held'
              and hold_expires_at between now() + interval '29 min' and now() + interval '31 min'
              and price_total_centavos = 40000
           from public.bookings where id = :'b1'),
  'gcash venue creates a 30-minute hold');
select is((select id from public.create_booking(:'c', tests.manila(:'d2', '10:00'), 60)), :'b1'::uuid, 'double tap returns the same booking');
select is((select status::text from public.create_booking(:'c30', tests.manila(:'d2', '10:00'), 60)), 'confirmed', 'pay-at-venue confirms immediately');
select throws_ok(format($$ select public.create_booking(%L, %L, 60) $$, :'c', tests.manila(:'d2', '10:30')), 'P0001', 'misaligned', 'start must sit on the slot grid');
select throws_ok(format($$ select public.create_booking(%L, %L, 60) $$, :'c', tests.manila(:'d2', '05:00')), 'P0001', 'outside_hours', 'closed hours are refused');
select throws_ok(format($$ select public.create_booking(%L, %L, 60) $$, :'c24', date_trunc('hour', now()) + interval '1 hour'), 'P0001', 'too_soon', 'lead time enforced');
select throws_ok(format($$ select public.create_booking(%L, %L, 60) $$, :'c', tests.manila(:'d2', '10:00') + interval '20 days'), 'P0001', 'too_far', 'advance window enforced');
select throws_ok(format($$ select public.create_booking(%L, %L, 30) $$, :'c', tests.manila(:'d2', '12:00')), 'P0001', 'bad_duration', 'duration bounds enforced');
select throws_ok(format($$ select public.create_booking(%L, %L, 60) $$, :'cf', tests.manila(:'d2', '10:00')), 'P0001', 'venue_not_bookable', 'free venues take no online bookings');
select lives_ok(format($$ select public.create_booking(%L, %L, 60) $$, :'c', tests.manila(:'d2', '11:00')), 'second hold allowed');
select throws_ok(format($$ select public.create_booking(%L, %L, 60) $$, :'c', tests.manila(:'d2', '12:00')), 'P0001', 'hold_limit', 'third hold refused');

select tests.authenticate_as(:'p3');
select throws_ok(format($$ select public.create_booking(%L, %L, 60) $$, :'c', tests.manila(:'d2', '13:00')), 'P0001', 'phone_required', 'contact phone required');

select tests.authenticate_as(:'p2');
select throws_ok(format($$ select public.create_booking(%L, %L, 60) $$, :'c', tests.manila(:'d2', '10:00')), 'P0001', 'slot_taken', 'overlap reported as slot_taken');

select tests.as_postgres();
update public.bookings set hold_expires_at = now() - interval '1 minute' where id = :'b1';

select tests.authenticate_as(:'p2');
select lives_ok(format($$ select public.create_booking(%L, %L, 60) $$, :'c', tests.manila(:'d2', '10:00')), 'an expired hold frees the slot');

select tests.as_postgres();
select is((select status::text from public.bookings where id = :'b1'), 'expired', 'the stale hold is marked expired');

-- Rate limit: ten more bookings by p2 inside the hour.
insert into public.bookings (venue_id, court_id, player_id, kind, during, status, payment_mode, created_at)
select :'v', :'c', :'p2', 'online', tstzrange(tests.manila(:'d2', '20:00'), tests.manila(:'d2', '21:00'), '[)'), 'cancelled', 'gcash_proof', now()
from generate_series(1, 10);

select tests.authenticate_as(:'p2');
select throws_ok(format($$ select public.create_booking(%L, %L, 60) $$, :'c', tests.manila(:'d2', '15:00')), 'P0001', 'rate_limited', 'ten bookings an hour max');

-- Availability
select tests.authenticate_as_anon();
select ok(exists(select 1 from public.get_availability(:'v', :'d2') g, jsonb_array_elements(g.busy) b
                 where g.court_id = :'c' and b ->> 'state' = 'held'),
  'holds show as held');
select is((select count(*)::int from public.get_availability(:'v', :'d2') g, jsonb_array_elements(g.busy) b
           where b ? 'player_id' or b ? 'customer_name'),
  0, 'availability carries no personal data');
select is((select count(*)::int from public.get_availability(:'f_draft', :'d2')), 0, 'draft venues expose no availability');

-- Review Focus 1: a Saturday 00:00 booking belongs to Friday's session at a venue open until 02:00.
select tests.as_postgres();
insert into public.bookings (venue_id, court_id, player_id, kind, during, status, payment_mode)
values (:'n', :'cn', :'p1', 'online', tstzrange(tests.manila(:'sat', '00:00'), tests.manila(:'sat', '01:00'), '[)'), 'confirmed', 'at_venue');

select tests.authenticate_as_anon();
select ok(exists(select 1 from public.get_availability(:'n', :'fri') g, jsonb_array_elements(g.busy) b
                 where (b ->> 'starts_at')::timestamptz = tests.manila(:'sat', '00:00')),
  'Saturday 00:00 belongs to Friday''s session');
select ok(not exists(select 1 from public.get_availability(:'n', :'sat') g, jsonb_array_elements(g.busy) b
                     where (b ->> 'starts_at')::timestamptz = tests.manila(:'sat', '00:00')),
  '...not Saturday''s');

select * from finish();
rollback;
