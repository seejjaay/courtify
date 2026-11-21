begin;
select plan(12);

select tests.create_user('alice@t.test', 'Alice') as alice \gset
select tests.create_user('bob@t.test', 'Bob') as bob \gset

select is((select full_name from public.profiles where id = :'alice'), 'Alice', 'profile is created from signup metadata');

select tests.authenticate_as(:'alice');
select is((select count(*)::int from public.profiles), 1, 'a user sees only their own profile');
select lives_ok($$ update public.profiles set full_name = 'Alice P' where id = auth.uid() $$, 'user can rename themselves');
select results_eq(
  format($$ with u as (update public.profiles set full_name = 'x' where id = %L returning 1) select count(*)::int from u $$, :'bob'),
  $$ values (0) $$,
  'user cannot update another profile'
);
select throws_ok($$ insert into public.profiles (id) values (gen_random_uuid()) $$, '42501', null, 'profiles cannot be inserted directly');
select throws_ok($$ update public.profiles set id = id $$, '42501', null, 'only granted columns are updatable');
select is(public.is_platform_admin(), false, 'a normal user is not admin');
select throws_ok($$ insert into public.platform_admins (user_id) values (auth.uid()) $$, '42501', null, 'users cannot make themselves admin');

select tests.as_postgres();
update auth.users set raw_user_meta_data = raw_user_meta_data || '{"role":"admin","is_admin":true}' where id = :'bob';
select tests.authenticate_as(:'bob');
select is(public.is_platform_admin(), false, 'user metadata never grants admin');

select tests.as_postgres();
select tests.make_admin(:'bob');
select tests.authenticate_as(:'bob');
select is(public.is_platform_admin(), true, 'platform_admins row grants admin');
select is((select count(*)::int from public.profiles where id in (:'alice', :'bob')), 2, 'admin sees every profile');

select tests.authenticate_as_anon();
select is((select count(*)::int from public.profiles), 0, 'anon sees no profiles');

select * from finish();
rollback;
