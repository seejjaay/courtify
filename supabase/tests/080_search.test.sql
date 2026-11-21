begin;
select plan(8);

-- Fixtures (as postgres):
--   t-a "Terracotta Test Club", Makati, pickleball, Pro, base 40000, open 24 h
--   t-b BGC, badminton, free;  t-c Cebu, pickleball, Pro;  t-d near Makati, draft, no courts
select tests.create_user('se-o@t.test', 'Owner') as o \gset

insert into public.venues (slug, name, city, status, location, trial_ends_at, approved_at)
  values ('t-a', 'Terracotta Test Club', 'Makati', 'active', 'SRID=4326;POINT(121.0244 14.5547)'::extensions.geography,
          now() + interval '30 days', now() - interval '2 days')
  returning id as a \gset
insert into public.venues (slug, name, city, status, location, approved_at)
  values ('t-b', 'Bonifacio Shuttle Hall', 'Taguig', 'active', 'SRID=4326;POINT(121.0503 14.5509)'::extensions.geography,
          now() - interval '1 day')
  returning id as b \gset
insert into public.venues (slug, name, city, status, location, trial_ends_at, approved_at)
  values ('t-c', 'Cebu Pickle Yard', 'Cebu City', 'active', 'SRID=4326;POINT(123.8854 10.3157)'::extensions.geography,
          now() + interval '30 days', now() - interval '3 days')
  returning id as c \gset
insert into public.venues (slug, name, city, created_by, location)
  values ('t-d', 'Draft Near Makati', 'Makati', :'o', 'SRID=4326;POINT(121.0250 14.5550)'::extensions.geography)
  returning id as d \gset

insert into public.venue_hours (venue_id, weekday, opens_at, closes_at)
  select :'a', d, '00:00', '00:00' from generate_series(0, 6) as d;
insert into public.courts (venue_id, sport_id, name, base_rate_centavos)
  values (:'a', (select id from public.sports where slug = 'pickleball'), 'A1', 40000) returning id as ca \gset
insert into public.courts (venue_id, sport_id, name, base_rate_centavos)
  values (:'b', (select id from public.sports where slug = 'badminton'), 'B1', 30000);
insert into public.courts (venue_id, sport_id, name, base_rate_centavos)
  values (:'c', (select id from public.sports where slug = 'pickleball'), 'C1', 35000);

-- t: a future, slot-aligned hour at which t-a's only court is booked.
select tests.manila((now() at time zone 'Asia/Manila')::date + 2, '10:00') as t \gset
insert into public.bookings (venue_id, court_id, kind, customer_name, during, status, payment_mode, payment_status)
  values (:'a', :'ca', 'walk_in', 'Booked', tstzrange(:'t'::timestamptz, :'t'::timestamptz + interval '1 hour'), 'confirmed', 'at_venue', 'paid');

select tests.authenticate_as_anon();
select set_eq($$ select slug from public.search_venues(p_sport => 'pickleball') where slug like 't-%' $$,
  array['t-a', 't-c'], 'sport filter');
select set_eq($$ select slug from public.search_venues(p_lat => 14.5547, p_lng => 121.0244, p_radius_km => 10) where slug like 't-%' $$,
  array['t-a', 't-b'], 'radius excludes Cebu and drafts');
select is((select slug from public.search_venues(p_lat => 14.5547, p_lng => 121.0244, p_sort => 'distance') where slug in ('t-a', 't-b') limit 1),
  't-a', 'nearest first');
select set_eq($$ select slug from public.search_venues(p_bookable_only => true) where slug like 't-%' $$,
  array['t-a', 't-c'], 'bookable filter keeps Pro venues');
select ok(not exists(select 1 from public.search_venues(p_free_at => :'t', p_free_minutes => 60) where slug = 't-a'),
  'a fully booked venue is excluded for that time');
select ok(exists(select 1 from public.search_venues(p_free_at => :'t'::timestamptz + interval '2 hours', p_free_minutes => 60) where slug = 't-a'),
  '...and found when free');
select is((select min_rate_centavos from public.search_venues(p_query => 'terracotta') where slug = 't-a'), 40000, 'min rate reported');
select ok(exists(select 1 from public.search_venues(p_query => 'terracota') where slug = 't-a'), 'typo-tolerant name match');

select * from finish();
rollback;
