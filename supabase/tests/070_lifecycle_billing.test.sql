begin;
select plan(16);

-- Fixtures (as postgres): owner o with a bare draft venue d, manager m on d, admin a.
select tests.create_user('lb-o@t.test', 'Owner') as o \gset
select tests.create_user('lb-m@t.test', 'Manager') as m \gset
select tests.create_user('lb-a@t.test', 'Admin') as a \gset
select tests.make_admin(:'a');

insert into public.venues (slug, name, created_by) values ('t-lb-d', 'Draft', :'o') returning id as d \gset
insert into public.venue_members (venue_id, user_id, role) values (:'d', :'m', 'manager');

-- Review
select tests.authenticate_as(:'o');
select throws_ok(format($$ select public.submit_venue_for_review(%L) $$, :'d'), 'P0001', 'venue_incomplete', 'incomplete venues cannot be submitted');
select is(tests.error_detail(format($$ select public.submit_venue_for_review(%L) $$, :'d')), 'location,contact,courts,hours,photos', 'detail lists what is missing');

-- Complete d: location, phone, an active court, Monday hours and one photo.
select tests.as_postgres();
update public.venues set location = 'SRID=4326;POINT(121.0437 14.5547)'::extensions.geography, phone = '+639171234567' where id = :'d';
insert into public.courts (venue_id, sport_id, name, base_rate_centavos)
  values (:'d', (select id from public.sports where slug = 'pickleball'), 'Court 1', 40000);
insert into public.venue_hours (venue_id, weekday, opens_at, closes_at) values (:'d', 1, '06:00', '22:00');
insert into public.venue_photos (id, venue_id, path, width, height)
  select x.id, :'d', :'d' || '/' || x.id, 1600, 1200 from (select gen_random_uuid() as id) as x;

select tests.authenticate_as(:'m');
select throws_ok(format($$ select public.submit_venue_for_review(%L) $$, :'d'), 'P0001', 'forbidden', 'only owners submit for review');
select tests.authenticate_as(:'o');
select is((select status::text from public.submit_venue_for_review(:'d')), 'pending_review', 'complete venues go to review');
select throws_ok(format($$ select public.approve_venue(%L) $$, :'d'), 'P0001', 'forbidden', 'only admins approve');

select tests.authenticate_as(:'a');
select ok((select status = 'active'
              and trial_ends_at between now() + interval '30 days' - interval '1 minute' and now() + interval '30 days'
           from public.approve_venue(:'d')),
  'approval lists the venue and starts a 30-day trial');
select tests.as_postgres();
select is((select count(*)::int from public.notifications where user_id = :'o' and type = 'venue_approved'), 1, 'owner is notified');

select tests.authenticate_as(:'a');
select lives_ok(format($$ select public.suspend_venue(%L, 'Spam reports') $$, :'d'), 'admin suspends');
select tests.as_postgres();
update public.venues set trial_ends_at = now() - interval '1 day' where id = :'d';
select tests.authenticate_as(:'a');
select lives_ok(format($$ select public.reinstate_venue(%L) $$, :'d'), 'admin reinstates');
select ok((select trial_ends_at < now() from public.venues where id = :'d'), 'reinstating does not restart the trial');

-- Billing
select tests.as_postgres();
update public.venues set trial_ends_at = now() + interval '10 days', pro_until = null where id = :'d';
select tests.authenticate_as(:'o');
select id as sp, amount_centavos as amt from public.submit_subscription_payment(:'d', 'monthly', 'GC-778899', :'d' || '/receipt.webp') \gset
select is(:amt, 99900, 'amount comes from platform settings');

select tests.authenticate_as(:'a');
select ok((select pro_until between now() + interval '10 days' + interval '1 month' - interval '1 minute'
                                and now() + interval '10 days' + interval '1 month' + interval '1 minute'
           from public.verify_subscription_payment(:'sp')),
  'paid month starts after the remaining trial');
select throws_ok(format($$ select public.verify_subscription_payment(%L) $$, :'sp'), 'P0001', 'invalid_state', 'a payment is verified once');

select tests.authenticate_as(:'o');
select id as sp2 from public.submit_subscription_payment(:'d', 'yearly', 'GC-112233', :'d' || '/receipt-2.webp') \gset
select tests.authenticate_as(:'a');
select throws_ok(format($$ select public.reject_subscription_payment(%L, ' ') $$, :'sp2'), 'P0001', 'reason_required', 'rejection needs a reason');

select tests.authenticate_as(:'m');
select throws_ok(format($$ select public.submit_subscription_payment(%L, 'monthly', 'X1', %L) $$, :'d', :'d' || '/r.webp'), 'P0001', 'forbidden', 'only owners pay for Pro');
select is((select count(*)::int from public.subscription_payments where venue_id = :'d'), 0, 'managers cannot see billing');

select * from finish();
rollback;
