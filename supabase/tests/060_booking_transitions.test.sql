begin;
select plan(24);

-- Fixtures (as postgres). Venue v: GCash, Pro, open 24 h, courts c and c2, manager m and staff s.
-- Bookings on fixed Manila dates use court c; bookings relative to now() use c2, so the two never overlap.
select (now() at time zone 'Asia/Manila')::date + 3 as d3, (now() at time zone 'Asia/Manila')::date + 4 as d4 \gset

select tests.create_user('tr-m@t.test', 'Manager') as m \gset
select tests.create_user('tr-s@t.test', 'Staff') as s \gset
select tests.create_user('tr-sl@t.test', 'Lapsed Staff') as sl \gset
select tests.create_user('tr-p1@t.test', 'P One') as p1 \gset
select tests.create_user('tr-p2@t.test', 'P Two') as p2 \gset

insert into public.venues (slug, name, status, payment_mode, trial_ends_at)
  values ('t-tr-v', 'V', 'active', 'gcash_proof', now() + interval '30 days')
  returning id as v \gset
insert into public.venue_hours (venue_id, weekday, opens_at, closes_at)
  select :'v', d, '00:00', '00:00' from generate_series(0, 6) as d;
insert into public.venue_members (venue_id, user_id, role) values (:'v', :'m', 'manager'), (:'v', :'s', 'staff');
insert into public.courts (venue_id, sport_id, name, base_rate_centavos)
  values (:'v', (select id from public.sports where slug = 'pickleball'), 'C', 40000) returning id as c \gset
insert into public.courts (venue_id, sport_id, name, base_rate_centavos)
  values (:'v', (select id from public.sports where slug = 'pickleball'), 'C2', 40000) returning id as c2 \gset

-- Lapsed venue l: Pro ended 20 days ago (past the 7-day grace), staff sl.
insert into public.venues (slug, name, status, pro_until)
  values ('t-tr-l', 'L', 'active', now() - interval '20 days')
  returning id as l \gset
insert into public.venue_members (venue_id, user_id, role) values (:'l', :'sl', 'staff');
insert into public.courts (venue_id, sport_id, name, base_rate_centavos)
  values (:'l', (select id from public.sports where slug = 'tennis'), 'CL', 40000) returning id as cl \gset

-- Holds for p1 on court c
insert into public.bookings (venue_id, court_id, player_id, kind, during, status, hold_expires_at, payment_mode, price_total_centavos)
  values (:'v', :'c', :'p1', 'online', tstzrange(tests.manila(:'d4', '10:00'), tests.manila(:'d4', '11:00')), 'held', now() + interval '30 minutes', 'gcash_proof', 40000)
  returning id as bh, code as bh_code \gset
insert into public.bookings (venue_id, court_id, player_id, kind, during, status, hold_expires_at, payment_mode, price_total_centavos)
  values (:'v', :'c', :'p1', 'online', tstzrange(tests.manila(:'d4', '11:00'), tests.manila(:'d4', '12:00')), 'held', now() + interval '30 minutes', 'gcash_proof', 40000)
  returning id as bh2, code as bh2_code, lower(during) as bh2_start \gset
insert into public.bookings (venue_id, court_id, player_id, kind, during, status, hold_expires_at, payment_mode, price_total_centavos)
  values (:'v', :'c', :'p1', 'online', tstzrange(tests.manila(:'d4', '12:00'), tests.manila(:'d4', '13:00')), 'held', now() + interval '30 minutes', 'gcash_proof', 40000)
  returning id as bh3, code as bh3_code \gset

-- Confirmed bookings for p1 on court c2, relative to now()
insert into public.bookings (venue_id, court_id, player_id, kind, during, status, payment_mode, price_total_centavos)
  values (:'v', :'c2', :'p1', 'online', tstzrange(now() + interval '48 hours', now() + interval '49 hours'), 'confirmed', 'gcash_proof', 40000)
  returning id as bc, code as bc_code \gset
insert into public.bookings (venue_id, court_id, player_id, kind, during, status, payment_mode, price_total_centavos)
  values (:'v', :'c2', :'p1', 'online', tstzrange(now() + interval '6 hours', now() + interval '7 hours'), 'confirmed', 'gcash_proof', 40000)
  returning id as bc_late, code as bc_late_code \gset
insert into public.bookings (venue_id, court_id, player_id, kind, during, status, payment_mode, payment_status, price_total_centavos)
  values (:'v', :'c2', :'p1', 'online', tstzrange(now() + interval '72 hours', now() + interval '73 hours'), 'confirmed', 'gcash_proof', 'paid', 40000)
  returning id as bpaid, code as bpaid_code \gset
insert into public.bookings (venue_id, court_id, player_id, kind, during, status, payment_mode, price_total_centavos)
  values (:'v', :'c2', :'p1', 'online', tstzrange(now() + interval '30 minutes', now() + interval '90 minutes'), 'confirmed', 'gcash_proof', 40000)
  returning id as bt, code as bt_code \gset
insert into public.bookings (venue_id, court_id, player_id, kind, during, status, payment_mode, price_total_centavos)
  values (:'v', :'c2', :'p1', 'online', tstzrange(now() + interval '50 hours', now() + interval '51 hours'), 'confirmed', 'gcash_proof', 40000)
  returning id as bfar, code as bfar_code \gset
insert into public.bookings (venue_id, court_id, player_id, kind, during, status, payment_mode, price_total_centavos)
  values (:'l', :'cl', :'p1', 'online', tstzrange(now() + interval '30 minutes', now() + interval '90 minutes'), 'confirmed', 'at_venue', 40000)
  returning id as bl, code as bl_code \gset

-- Free, slot-aligned ranges at v for walk-ins and blocks.
select tests.manila(:'d3', '10:00') as walkin_start, tests.manila(:'d3', '14:00') as blk_start, tests.manila(:'d3', '16:00') as blk_end \gset

-- Proof submission
select tests.authenticate_as(:'p2');
select throws_ok(format($$ select public.submit_booking_payment(%L, 'REF123', 'x.webp') $$, :'bh'), 'P0001', 'forbidden', 'only the booker submits proof');
select tests.authenticate_as(:'p1');
select throws_ok(format($$ select public.submit_booking_payment(%L, 'REF123', 'someone/else.webp') $$, :'bh'), 'P0001', 'bad_proof_path', 'proof must live in the booker''s folder');
select throws_ok(format($$ select public.submit_booking_payment(%L, '  ', %L) $$, :'bh', :'p1' || '/' || :'bh' || '/proof.webp'), 'P0001', 'reference_required', 'reference number required');
select is((select status::text from public.submit_booking_payment(:'bh', 'REF123', :'p1' || '/' || :'bh' || '/proof.webp')), 'pending_verification', 'proof moves the booking to verifying');

-- Review (Review Focus 4: a proof is reviewed once)
select tests.as_postgres();
select id as pay from public.booking_payments where booking_id = :'bh' \gset
select tests.authenticate_as(:'s');
select throws_ok(format($$ select public.verify_booking_payment(%L) $$, :'pay'), 'P0001', 'forbidden', 'staff cannot verify payments');
select tests.authenticate_as(:'m');
select is((select status::text || '/' || payment_status::text from public.verify_booking_payment(:'pay')), 'confirmed/paid', 'manager verification confirms and marks paid');
select throws_ok(format($$ select public.verify_booking_payment(%L) $$, :'pay'), 'P0001', 'invalid_state', 'a proof is reviewed once');
select is((select count(*)::int from public.booking_events where booking_id = :'bh' and to_status = 'confirmed'), 1, 'no duplicate confirm event');
select is((select actor_id from public.booking_events where booking_id = :'bh' and to_status = 'confirmed'), :'m'::uuid, 'events record who acted');

select tests.authenticate_as(:'p1');
select status as bh3_status from public.submit_booking_payment(:'bh3', 'REF3', :'p1' || '/' || :'bh3' || '/proof.webp') \gset
select tests.as_postgres();
select id as pay3 from public.booking_payments where booking_id = :'bh3' \gset
select tests.authenticate_as(:'m');
select throws_ok(format($$ select public.reject_booking_payment(%L, '  ') $$, :'pay3'), 'P0001', 'reason_required', 'rejection needs a reason');

-- Review Focus 3: proof after the hold expired is refused, and the slot opens up again.
select tests.as_postgres();
update public.bookings set hold_expires_at = now() - interval '1 minute' where id = :'bh2';
select tests.authenticate_as(:'p1');
select throws_ok(format($$ select public.submit_booking_payment(%L, 'REF9', %L) $$, :'bh2', :'p1' || '/' || :'bh2' || '/p.webp'), 'P0001', 'hold_expired', 'proof after the hold window is refused');
select tests.authenticate_as(:'p2');
select lives_ok(format($$ select public.create_booking(%L, %L, 60) $$, :'c', :'bh2_start'), 'the expired slot is bookable again');

-- Cancellation
select tests.authenticate_as(:'p1');
select lives_ok(format($$ select public.cancel_booking(%L) $$, :'bc'), 'player cancels before cutoff');
select throws_ok(format($$ select public.cancel_booking(%L) $$, :'bc_late'), 'P0001', 'cancel_cutoff', 'player cannot cancel after cutoff');
select tests.authenticate_as(:'m');
select throws_ok(format($$ select public.cancel_booking(%L) $$, :'bc_late'), 'P0001', 'reason_required', 'venue cancellations need a reason');
select is((select payment_status::text from public.cancel_booking(:'bpaid', 'Court maintenance')), 'refund_due', 'cancelling a paid booking flags a refund');

-- Front desk
select tests.authenticate_as(:'s');
select is((select status::text from public.check_in_booking(:'v', lower(:'bt_code'))), 'checked_in', 'staff check in by code, case-insensitive');
select throws_ok(format($$ select public.check_in_booking(%L, %L) $$, :'v', :'bfar_code'), 'P0001', 'check_in_window', 'too early to check in');
select is((select kind::text || '/' || payment_status::text from public.create_walk_in(:'c', :'walkin_start', 60, 'Juan')), 'walk_in/paid', 'walk-in recorded as paid');
select throws_ok(format($$ select public.create_block(%L, %L, %L, 'x') $$, :'c', :'blk_start', :'blk_end'), 'P0001', 'forbidden', 'staff cannot block courts');
select tests.authenticate_as(:'m');
select is((select payment_status::text from public.create_block(:'c', :'blk_start', :'blk_end', 'Resurfacing')), 'waived', 'blocks are free and confirmed');
select tests.authenticate_as(:'s');
select throws_ok(format($$ select public.create_walk_in(%L, %L, 60, 'Ana') $$, :'c', :'blk_start'), 'P0001', 'slot_taken', 'walk-ins cannot overlap a block');

-- A lapsed venue keeps serving the bookings it already has, but takes no new ones.
select tests.authenticate_as(:'sl');
select is((select status::text from public.check_in_booking(:'l', :'bl_code')), 'checked_in', 'lapsed venues still check in existing bookings');
select throws_ok(format($$ select public.create_walk_in(%L, %L, 60, 'Ana') $$, :'cl', :'walkin_start'), 'P0001', 'venue_not_bookable', 'lapsed venues cannot add walk-ins');

select * from finish();
rollback;
