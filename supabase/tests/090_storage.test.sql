begin;
select plan(10);

-- Fixtures (as postgres): venue v with manager m and staff s; venue v2 with manager m2;
-- p1 holds bh at v, p2 has b2 at v, p3 has nothing.
select tests.create_user('st-m@t.test', 'Manager') as m \gset
select tests.create_user('st-s@t.test', 'Staff') as s \gset
select tests.create_user('st-m2@t.test', 'Other Manager') as m2 \gset
select tests.create_user('st-p1@t.test', 'P One') as p1 \gset
select tests.create_user('st-p2@t.test', 'P Two') as p2 \gset
select tests.create_user('st-p3@t.test', 'P Three') as p3 \gset

insert into public.venues (slug, name, status, payment_mode) values ('t-st-v', 'V', 'active', 'gcash_proof') returning id as v \gset
insert into public.venues (slug, name, status) values ('t-st-v2', 'V2', 'active') returning id as v2 \gset
insert into public.venue_members (venue_id, user_id, role) values (:'v', :'m', 'manager'), (:'v', :'s', 'staff'), (:'v2', :'m2', 'manager');
insert into public.courts (venue_id, sport_id, name, base_rate_centavos)
  values (:'v', (select id from public.sports where slug = 'padel'), 'P1', 40000) returning id as c \gset
insert into public.bookings (venue_id, court_id, player_id, kind, during, status, hold_expires_at, payment_mode)
  values (:'v', :'c', :'p1', 'online', tstzrange(now() + interval '2 days', now() + interval '2 days 1 hour'), 'held', now() + interval '30 minutes', 'gcash_proof')
  returning id as bh \gset
insert into public.bookings (venue_id, court_id, player_id, kind, during, status, payment_mode)
  values (:'v', :'c', :'p2', 'online', tstzrange(now() + interval '3 days', now() + interval '3 days 1 hour'), 'confirmed', 'gcash_proof')
  returning id as b2 \gset

-- venue-photos: managers of the venue write
select tests.authenticate_as(:'m');
select lives_ok(format($$ insert into storage.objects (bucket_id, name) values ('venue-photos', %L) $$, :'v' || '/p1-480.webp'), 'manager uploads venue photos');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('venue-photos', 'not-a-uuid/x.webp') $$, '42501', null, 'malformed paths fail closed');
select tests.authenticate_as(:'s');
select throws_ok(format($$ insert into storage.objects (bucket_id, name) values ('venue-photos', %L) $$, :'v' || '/p2-480.webp'), '42501', null, 'staff cannot upload venue photos');
select tests.authenticate_as(:'m2');
select throws_ok(format($$ insert into storage.objects (bucket_id, name) values ('venue-photos', %L) $$, :'v' || '/p3-480.webp'), '42501', null, 'other venues cannot either');

-- payment-proofs: the booker writes into their own folder, for their own booking
select tests.authenticate_as(:'p1');
select lives_ok(format($$ insert into storage.objects (bucket_id, name) values ('payment-proofs', %L) $$, :'p1' || '/' || :'bh' || '/proof.webp'), 'booker uploads proof for own booking');
select throws_ok(format($$ insert into storage.objects (bucket_id, name) values ('payment-proofs', %L) $$, :'p1' || '/' || :'b2' || '/x.webp'), '42501', null, 'not for someone else''s booking');
select tests.authenticate_as(:'m');
select is((select count(*)::int from storage.objects where bucket_id = 'payment-proofs' and name like :'p1' || '/%'), 1, 'venue manager sees proofs for their bookings');
select tests.authenticate_as(:'p2');
select is((select count(*)::int from storage.objects where bucket_id = 'payment-proofs' and name like :'p1' || '/%'), 0, 'other players cannot');

-- payment-qr: readable by members, players with a live hold there, and admins
select tests.as_postgres();
insert into storage.objects (bucket_id, name) values ('payment-qr', 'venue/' || :'v' || '.webp');
select tests.authenticate_as(:'p1');
select is((select count(*)::int from storage.objects where bucket_id = 'payment-qr' and name = 'venue/' || :'v' || '.webp'), 1, 'players with an active hold read the venue QR');
select tests.authenticate_as(:'p3');
select is((select count(*)::int from storage.objects where bucket_id = 'payment-qr' and name = 'venue/' || :'v' || '.webp'), 0, 'others cannot');

select * from finish();
rollback;
