begin;
select plan(2);

-- Fixtures (as postgres): an owner with an active Pro venue v and a draft d; an outsider.
select tests.create_user('mv-owner@t.test', 'Owner') as owner \gset
select tests.create_user('mv-outsider@t.test', 'Outsider') as outsider \gset
insert into public.venues (slug, name, created_by, status, trial_ends_at)
  values ('t-v', 'Venue V', :'owner', 'active', now() + interval '30 days');
insert into public.venues (slug, name, created_by) values ('t-d', 'Venue D', :'owner');

select tests.authenticate_as(:'owner');
select set_eq($$ select slug || ':' || role || ':' || has_pro from public.my_venues() where slug like 't-%' $$,
  array['t-v:owner:true', 't-d:owner:false'], 'members get their venues with role and Pro flag');

select tests.authenticate_as(:'outsider');
select is((select count(*)::int from public.my_venues() where slug like 't-%'), 0, 'non-members get nothing');

select * from finish();
rollback;
