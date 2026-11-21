begin;
select plan(22);

-- Fixtures (as postgres): an active venue v run by owner, manager and staff, with court c; and a draft venue d.
select tests.create_user('owner@t.test', 'Owner') as owner \gset
select tests.create_user('manager@t.test', 'Manager') as manager \gset
select tests.create_user('staff@t.test', 'Staff') as staff \gset
select tests.create_user('outsider@t.test', 'Outsider') as outsider \gset

insert into public.venues (slug, name, created_by, status)
  values ('t-active-venue', 'Active Venue', :'owner', 'active')
  returning id as v \gset
insert into public.venues (slug, name, created_by)
  values ('t-draft-venue', 'Draft Venue', :'owner')
  returning id as d \gset
insert into public.venue_members (venue_id, user_id, role)
  values (:'v', :'manager', 'manager'), (:'v', :'staff', 'staff');
insert into public.courts (venue_id, sport_id, name, base_rate_centavos)
  values (:'v', (select id from public.sports where slug = 'pickleball'), 'Court 1', 40000)
  returning id as c \gset

select tests.authenticate_as_anon();
select is((select count(*)::int from public.venues where id in (:'v', :'d')), 1, 'anon sees active venues only');

select tests.authenticate_as(:'outsider');
select is((select count(*)::int from public.venues where id = :'d'), 0, 'non-members cannot see drafts');
select lives_ok($$ insert into public.venues (slug, name, created_by) values ('t-new-place', 'New Place', auth.uid()) $$, 'any user can start a venue');
select is((select m.role::text from public.venue_members m join public.venues x on x.id = m.venue_id where x.slug = 't-new-place'), 'owner', 'creator becomes owner');
select is((select status::text from public.venues where slug = 't-new-place'), 'draft', 'new venues start as drafts');
select throws_ok($$ insert into public.venues (slug, name, created_by, status) values ('t-sneaky', 'S', auth.uid(), 'active') $$, '42501', null, 'status cannot be chosen on insert');

select tests.authenticate_as(:'owner');
select throws_ok(format($$ update public.venues set status = 'active' where id = %L $$, :'d'), '42501', null, 'owners cannot set status directly');

select tests.authenticate_as(:'manager');
select results_eq(format($$ with u as (update public.courts set name = 'Court A' where id = %L returning 1) select count(*)::int from u $$, :'c'), $$ values (1) $$, 'managers edit courts');
select is((select count(*)::int from public.venue_payment_details where venue_id = :'v'), 1, 'managers read payment details');
select lives_ok(format($$ insert into public.court_rates (court_id, weekdays, starts_at, ends_at, rate_centavos) values (%L, '{1,2,3,4,5}', '18:00', '22:00', 60000) $$, :'c'), 'peak rate saved');
select throws_ok(format($$ insert into public.court_rates (court_id, weekdays, starts_at, ends_at, rate_centavos) values (%L, '{5,6}', '21:00', '23:00', 70000) $$, :'c'), 'P0001', 'rate_overlap', 'overlapping rule on a shared weekday is rejected');
select lives_ok(format($$ insert into public.court_rates (court_id, weekdays, starts_at, ends_at, rate_centavos) values (%L, '{6}', '18:00', '22:00', 70000) $$, :'c'), 'same hours on another weekday is fine');

select tests.authenticate_as(:'staff');
select results_eq(format($$ with u as (update public.courts set name = 'Court Z' where id = %L returning 1) select count(*)::int from u $$, :'c'), $$ values (0) $$, 'staff cannot edit courts');
select is((select count(*)::int from public.venue_payment_details where venue_id = :'v'), 0, 'staff cannot read payment details');

select tests.authenticate_as(:'owner');
select throws_ok(format($$ delete from public.venue_members where venue_id = %L and user_id = auth.uid() $$, :'v'), 'P0001', 'last_owner', 'a venue always keeps an owner');
-- The cascade removes the last owner too; the guard must let a deleted venue go.
select results_eq(format($$ with x as (delete from public.venues where id = %L returning 1) select count(*)::int from x $$, :'d'), $$ values (1) $$, 'owners can delete a draft venue, members and all');

select tests.as_postgres();
update public.venues set trial_ends_at = now() + interval '5 days', pro_until = null where id = :'v';
select is(public.venue_has_pro(:'v'), true, 'trial grants Pro');
update public.venues set trial_ends_at = null, pro_until = now() - interval '3 days' where id = :'v';
select is(public.venue_has_pro(:'v'), true, 'grace keeps Pro for 7 days');
update public.venues set pro_until = now() - interval '8 days' where id = :'v';
select is(public.venue_has_pro(:'v'), false, 'Pro ends after grace');
update public.venues set pro_until = null where id = :'v';
select is(public.venue_has_pro(:'v'), false, 'no trial and no subscription is free');

select tests.authenticate_as_anon();
select is((select pro_monthly_centavos from public.platform_settings), 99900, 'anon reads the Pro price');
select throws_ok($$ select payout_gcash_number from public.platform_settings $$, '42501', null, 'anon cannot read payout details');

select * from finish();
rollback;
