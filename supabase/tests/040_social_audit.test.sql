begin;
select plan(10);

-- Fixtures (as postgres): venue v with court c (base 40000), its owner, manager m and staff s; players p1 and p2.
select tests.create_user('sa-owner@t.test', 'Owner') as owner \gset
select tests.create_user('sa-m@t.test', 'Manager') as m \gset
select tests.create_user('sa-s@t.test', 'Staff') as s \gset
select tests.create_user('sa-p1@t.test', 'P One') as p1 \gset
select tests.create_user('sa-p2@t.test', 'P Two') as p2 \gset

insert into public.venues (slug, name, created_by, status)
  values ('t-sa-v', 'Venue V', :'owner', 'active')
  returning id as v \gset
insert into public.venue_members (venue_id, user_id, role) values (:'v', :'m', 'manager'), (:'v', :'s', 'staff');
insert into public.courts (venue_id, sport_id, name, base_rate_centavos)
  values (:'v', (select id from public.sports where slug = 'padel'), 'Court 1', 40000)
  returning id as c \gset

select tests.authenticate_as(:'p1');
select lives_ok(format($$ insert into public.favorites (user_id, venue_id) values (auth.uid(), %L) $$, :'v'), 'players can save venues');
select throws_ok(format($$ insert into public.favorites (user_id, venue_id) values (%L, %L) $$, :'p2', :'v'), '42501', null, 'cannot save for someone else');
select throws_ok($$ select public.notify(auth.uid(), 'x', '{}') $$, '42501', null, 'clients cannot call notify');

select tests.as_postgres();
select public.notify(:'p1', 'booking_confirmed', '{"booking_id":"x"}');

select tests.authenticate_as(:'p2');
select is((select count(*)::int from public.notifications), 0, 'notifications are private');

select tests.authenticate_as(:'p1');
select results_eq($$ with u as (update public.notifications set read_at = now() returning 1) select count(*)::int from u $$, $$ values (1) $$, 'owner marks read');
select throws_ok($$ update public.notifications set type = 'hacked' $$, '42501', null, 'only read_at is writable');

select tests.authenticate_as(:'m');
update public.courts set base_rate_centavos = 50000 where id = :'c';

select tests.as_postgres();
select is((select diff -> 'base_rate_centavos' from public.audit_log where entity = 'courts' and entity_id = :'c'::text order by id desc limit 1),
  '[40000, 50000]'::jsonb, 'audit stores only changed columns as [old, new]');
select is((select actor_id from public.audit_log where entity = 'courts' and entity_id = :'c'::text order by id desc limit 1),
  :'m'::uuid, 'audit records the actor');

select tests.authenticate_as(:'s');
select is((select count(*)::int from public.audit_log where venue_id = :'v'), 0, 'staff cannot read the audit log');

select tests.authenticate_as(:'owner');
select ok((select count(*) from public.audit_log where venue_id = :'v') > 0, 'owners read their venue audit log');

select * from finish();
rollback;
