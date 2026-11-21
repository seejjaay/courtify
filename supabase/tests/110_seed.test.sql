-- Checks the local seed (supabase/seed.sql). Unlike the other files this reads seeded rows,
-- so it needs `npm run db:reset` first.
begin;
select plan(9);

select is((select count(*)::int from auth.users where email like '%@courtify.test'), 45, '5 demo + 40 extra accounts');
select is((select count(*)::int from public.venues where status = 'active'), 10, 'ten listed venues');
select ok((select bool_and(public.venue_has_pro(id)) from public.venues
           where slug in ('terracotta-rally-club', 'chalkline-pickle-yard', 'shuttle-and-sol', 'arco-padel-terraza', 'sugbo-smash-house', 'dink-district-mandaluyong')),
  'Pro and trial venues are bookable');
select ok((select not public.venue_has_pro(id) from public.venues where slug = 'mactan-breeze-courts'), 'lapsed venue is not bookable');
select ok((select count(*) from public.bookings where lower(during) < now() - interval '50 days') > 0, 'history reaches back 60 days');
select is((select count(*)::int from public.subscription_payments where status = 'submitted'), 1, 'one Pro payment waits for admin');
select ok((select count(*) from public.booking_payments where status = 'submitted') >= 2, 'proofs wait for verification');
select is((select count(*)::int from public.venues v
           where v.status = 'active' and not exists (select 1 from public.venue_photos p where p.venue_id = v.id)),
  0, 'every listed venue has photos');
select ok((select count(*) from public.venue_members m join auth.users u on u.id = m.user_id where u.email = 'owner@courtify.test') = 3,
  'demo owner runs three venues');

select * from finish();
rollback;
