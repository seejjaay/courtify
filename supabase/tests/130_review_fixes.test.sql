-- Regressions from the M0 whole-branch review.
begin;
select plan(6);

select tests.create_user('rf-o@t.test', 'Owner') as o \gset
select tests.create_user('rf-m@t.test', 'Manager') as m \gset
select tests.create_user('rf-p@t.test', 'Player') as p \gset

insert into public.venues (slug, name, created_by, status, payment_mode, trial_ends_at)
  values ('t-rf-v', 'V', :'o', 'active', 'gcash_proof', now() + interval '30 days')
  returning id as v \gset
insert into public.venue_members (venue_id, user_id, role) values (:'v', :'m', 'manager');
insert into public.courts (venue_id, sport_id, name, base_rate_centavos)
  values (:'v', (select id from public.sports where slug = 'padel'), 'P1', 40000) returning id as c \gset

insert into public.bookings (venue_id, court_id, player_id, kind, during, status, hold_expires_at, payment_mode, price_total_centavos)
  values (:'v', :'c', :'p', 'online', tstzrange(now() + interval '2 days', now() + interval '2 days 1 hour'), 'held', now() + interval '30 minutes', 'gcash_proof', 40000)
  returning id as b_swept \gset
insert into public.bookings (venue_id, court_id, player_id, kind, during, status, hold_expires_at, payment_mode, price_total_centavos)
  values (:'v', :'c', :'p', 'online', tstzrange(now() + interval '2 days 1 hour', now() + interval '2 days 2 hours'), 'held', now() + interval '30 minutes', 'gcash_proof', 40000)
  returning id as b_verify \gset
insert into public.bookings (venue_id, court_id, player_id, kind, during, status, hold_expires_at, payment_mode, price_total_centavos)
  values (:'v', :'c', :'p', 'online', tstzrange(now() + interval '2 days 2 hours', now() + interval '2 days 3 hours'), 'held', now() + interval '30 minutes', 'gcash_proof', 40000)
  returning id as b_reject \gset

-- Review Focus 3 after the every-minute sweep has already marked the hold expired.
update public.bookings set hold_expires_at = now() - interval '1 minute' where id = :'b_swept';
select public.expire_stale_holds() as swept \gset
select tests.authenticate_as(:'p');
select throws_ok(format($$ select public.submit_booking_payment(%L, 'REF1', %L) $$, :'b_swept', :'p' || '/' || :'b_swept' || '/p.webp'),
  'P0001', 'hold_expired', 'a hold the sweep already expired still reports hold_expired');

-- A proof submitted, then the booking cancelled: the proof must still be reviewable.
select status as s1 from public.submit_booking_payment(:'b_verify', 'REF2', :'p' || '/' || :'b_verify' || '/p.webp') \gset
select status as s2 from public.cancel_booking(:'b_verify') \gset
select status as s3 from public.submit_booking_payment(:'b_reject', 'REF3', :'p' || '/' || :'b_reject' || '/p.webp') \gset
select status as s4 from public.cancel_booking(:'b_reject') \gset
select tests.as_postgres();
select id as pay_v from public.booking_payments where booking_id = :'b_verify' \gset
select id as pay_r from public.booking_payments where booking_id = :'b_reject' \gset
select tests.authenticate_as(:'m');
select is((select status::text || '/' || payment_status::text from public.verify_booking_payment(:'pay_v')),
  'cancelled/refund_due', 'verifying the proof of a cancelled booking flags the refund');
select is((select status::text from public.booking_payments where id = :'pay_v'), 'verified', 'that proof leaves the queue as verified');
select is((select status::text || '/' || payment_status::text from public.reject_booking_payment(:'pay_r', 'Amount does not match')),
  'cancelled/unpaid', 'rejecting the proof of a cancelled booking leaves it unpaid');

-- Pro billing stays owner-only, audit log included.
select tests.as_postgres();
insert into public.subscription_payments (venue_id, period, amount_centavos, reference_no, proof_path, submitted_by)
  values (:'v', 'monthly', 99900, 'GC-1', :'v' || '/r.webp', :'o');
select tests.authenticate_as(:'m');
select is((select count(*)::int from public.audit_log where entity = 'subscription_payments' and venue_id = :'v'), 0,
  'managers cannot read billing through the audit log');
select tests.authenticate_as(:'o');
select ok((select count(*) from public.audit_log where entity = 'subscription_payments' and venue_id = :'v') > 0,
  'owners still can');

select * from finish();
rollback;
