begin;
select plan(16);

-- Fixtures (as postgres): venue v with courts c1 and c2, venue w, players p1 and p2,
-- staff s at v and staff s2 at w.
select tests.create_user('bk-owner@t.test', 'Owner') as owner \gset
select tests.create_user('bk-p1@t.test', 'P One') as p1 \gset
select tests.create_user('bk-p2@t.test', 'P Two') as p2 \gset
select tests.create_user('bk-s@t.test', 'Staff V') as s \gset
select tests.create_user('bk-s2@t.test', 'Staff W') as s2 \gset

insert into public.venues (slug, name, created_by, status)
  values ('t-bk-v', 'Venue V', :'owner', 'active')
  returning id as v \gset
insert into public.venues (slug, name, created_by, status)
  values ('t-bk-w', 'Venue W', :'owner', 'active')
  returning id as w \gset
insert into public.venue_members (venue_id, user_id, role) values (:'v', :'s', 'staff'), (:'w', :'s2', 'staff');
insert into public.courts (venue_id, sport_id, name, base_rate_centavos)
  values (:'v', (select id from public.sports where slug = 'tennis'), 'C1', 50000)
  returning id as c1 \gset
insert into public.courts (venue_id, sport_id, name, base_rate_centavos)
  values (:'v', (select id from public.sports where slug = 'tennis'), 'C2', 50000)
  returning id as c2 \gset
select gen_random_uuid() as b1 \gset

select lives_ok(format($$ insert into public.bookings (id, venue_id, court_id, player_id, kind, during, status, payment_mode, payment_status)
  values (%L, %L, %L, %L, 'online', '[2030-01-07 10:00+08,2030-01-07 11:00+08)', 'confirmed', 'at_venue', 'unpaid') $$, :'b1', :'v', :'c1', :'p1'),
  'first booking');
select throws_ok(format($$ insert into public.bookings (venue_id, court_id, player_id, kind, during, status, payment_mode, payment_status)
  values (%L, %L, %L, 'online', '[2030-01-07 10:30+08,2030-01-07 11:30+08)', 'confirmed', 'at_venue', 'unpaid') $$, :'v', :'c1', :'p1'),
  '23P01', null, 'overlap on the same court is impossible');
select lives_ok(format($$ insert into public.bookings (venue_id, court_id, player_id, kind, during, status, payment_mode, payment_status)
  values (%L, %L, %L, 'online', '[2030-01-07 11:00+08,2030-01-07 12:00+08)', 'confirmed', 'at_venue', 'unpaid') $$, :'v', :'c1', :'p1'),
  'back-to-back bookings are allowed');
select lives_ok(format($$ insert into public.bookings (venue_id, court_id, player_id, kind, during, status, payment_mode, payment_status)
  values (%L, %L, %L, 'online', '[2030-01-07 10:00+08,2030-01-07 11:00+08)', 'confirmed', 'at_venue', 'unpaid') $$, :'v', :'c2', :'p1'),
  'same time on another court is fine');
select lives_ok(format($$ insert into public.bookings (venue_id, court_id, player_id, kind, during, status, payment_mode, payment_status)
  values (%L, %L, %L, 'online', '[2030-01-07 10:00+08,2030-01-07 11:00+08)', 'cancelled', 'at_venue', 'unpaid') $$, :'v', :'c1', :'p1'),
  'cancelled rows do not block');
select throws_ok(format($$ insert into public.bookings (venue_id, court_id, player_id, kind, during, status, payment_mode, payment_status)
  values (%L, %L, %L, 'online', '[2030-01-08 10:00+08,2030-01-08 11:00+08)', 'confirmed', 'at_venue', 'unpaid') $$, :'w', :'c1', :'p1'),
  '23503', null, 'court must belong to the booking venue');

update public.bookings set status = 'checked_in' where id = :'b1';
select is((select array_agg(to_status::text order by id) from public.booking_events where booking_id = :'b1'),
  array['confirmed', 'checked_in'], 'status changes are logged');

select tests.authenticate_as(:'p2');
select is((select count(*)::int from public.bookings where venue_id = :'v'), 0, 'players see only their own bookings');
select throws_ok(format($$ update public.bookings set status = 'cancelled' where id = %L $$, :'b1'), '42501', null, 'clients cannot change status directly');

select tests.authenticate_as(:'s');
select is((select count(*)::int from public.bookings where venue_id = :'v'), 4, 'venue staff see every venue booking');
select is((select full_name from public.profiles where id = :'p1'), 'P One', 'venue staff can read their bookers'' names');

select tests.authenticate_as(:'s2');
select is((select count(*)::int from public.bookings where venue_id = :'v'), 0, 'other venues see nothing');

select tests.authenticate_as_anon();
select is((select count(*)::int from public.bookings where venue_id = :'v'), 0, 'anon sees nothing');
select matches(public.gen_booking_code(), '^[A-HJKMNP-Z2-9]{6}$', 'codes use the unambiguous alphabet');

select tests.as_postgres();
delete from auth.users where id = :'p1';
select is((select player_id from public.bookings where id = :'b1'), null, 'deleting a player keeps the booking');

select tests.authenticate_as(:'s');
select is((select count(*)::int from public.bookings where id = :'b1'), 1, 'venue staff still see it');

select * from finish();
rollback;
