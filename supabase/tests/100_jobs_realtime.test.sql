begin;
select plan(10);

-- Fixtures (as postgres): venue v (Pro) owned by o; be confirmed and already ended; bn a no-show
-- that ended; br confirmed for p1, starting in 90 minutes.
select tests.create_user('jr-o@t.test', 'Owner') as o \gset
select tests.create_user('jr-p1@t.test', 'P One') as p1 \gset

insert into public.venues (slug, name, created_by, status, trial_ends_at)
  values ('t-jr-v', 'V', :'o', 'active', now() + interval '30 days')
  returning id as v \gset
insert into public.courts (venue_id, sport_id, name, base_rate_centavos)
  values (:'v', (select id from public.sports where slug = 'tennis'), 'C', 40000) returning id as c \gset
insert into public.bookings (venue_id, court_id, player_id, kind, during, status, payment_mode)
  values (:'v', :'c', :'p1', 'online', tstzrange(now() - interval '3 hours', now() - interval '2 hours'), 'confirmed', 'at_venue')
  returning id as be \gset
insert into public.bookings (venue_id, court_id, player_id, kind, during, status, payment_mode)
  values (:'v', :'c', :'p1', 'online', tstzrange(now() - interval '5 hours', now() - interval '4 hours'), 'no_show', 'at_venue')
  returning id as bn \gset
insert into public.bookings (venue_id, court_id, player_id, kind, during, status, payment_mode)
  values (:'v', :'c', :'p1', 'online', tstzrange(now() + interval '90 minutes', now() + interval '150 minutes'), 'confirmed', 'at_venue')
  returning id as br \gset

select is((select count(*)::int from cron.job where jobname in ('expire-holds', 'complete-bookings', 'booking-reminders', 'pro-expiry-reminders')),
  4, 'all four jobs are scheduled');

select ok(public.complete_ended_bookings() >= 1, 'ended bookings complete');
select is((select status::text from public.bookings where id = :'be'), 'completed', 'confirmed past end becomes completed');
select is((select status::text from public.bookings where id = :'bn'), 'no_show', 'no-shows stay no-shows');

select ok(public.send_booking_reminders() >= 1, 'upcoming bookings get reminders');
select is(public.send_booking_reminders(), 0, 'reminders are sent once');

update public.venues
  set pro_until = null,
      trial_ends_at = (((now() at time zone 'Asia/Manila')::date + 7) + time '12:00') at time zone 'Asia/Manila'
  where id = :'v';
select ok(public.send_pro_expiry_reminders() >= 1, '7-day expiry reminder sent');
select is(public.send_pro_expiry_reminders(), 0, 'one reminder per milestone');

insert into public.bookings (venue_id, court_id, kind, customer_name, customer_phone, during, status, payment_mode, payment_status)
  values (:'v', :'c', 'walk_in', 'Private Person', '+639170000000',
          tstzrange(now() + interval '1 day', now() + interval '1 day 1 hour'), 'confirmed', 'at_venue', 'paid');
select ok(exists(select 1 from realtime.messages where topic = 'availability:' || :'v' and payload ->> 'state' = 'booked'),
  'availability broadcast emitted');
select ok(not exists(select 1 from realtime.messages
                     where topic = 'availability:' || :'v' and (payload ? 'player_id' or payload ? 'customer_name')),
  'broadcast carries no personal data');

select * from finish();
rollback;
