-- Test helpers shared by every pgTAP file. They persist: this file runs first, outside a transaction,
-- and uses `create or replace`, so later files can call them. Nothing here is a migration.
create extension if not exists pgtap with schema extensions;

create schema if not exists tests;

-- Inserts a confirmed email user. The on_auth_user_created trigger builds the profile; this sets its phone.
create or replace function tests.create_user(
  p_email text,
  p_full_name text default 'Test User',
  p_phone text default '+639170000000'
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', p_email, '', now(),
    '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', p_full_name), now(), now()
  );
  update public.profiles set phone = p_phone where id = v_id;
  return v_id;
end;
$$;

-- Invoker on purpose: a security definer function may not change the role.
create or replace function tests.authenticate_as(p_user uuid) returns void
language plpgsql
set search_path = ''
as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', p_user, 'role', 'authenticated')::text, true);
end;
$$;

create or replace function tests.authenticate_as_anon() returns void
language plpgsql
set search_path = ''
as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', jsonb_build_object('role', 'anon')::text, true);
end;
$$;

-- Back to the session user (postgres), with no JWT claims.
create or replace function tests.as_postgres() returns void
language plpgsql
set search_path = ''
as $$
begin
  perform set_config('role', 'none', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$;

create or replace function tests.make_admin(p_user uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.platform_admins (user_id) values (p_user) on conflict do nothing;
end;
$$;

-- Runs p_sql as the current role and returns the DETAIL of the error it raises (null when it doesn't raise).
create or replace function tests.error_detail(p_sql text) returns text
language plpgsql
set search_path = ''
as $$
declare
  v_detail text;
begin
  execute p_sql;
  return null;
exception when others then
  get stacked diagnostics v_detail = pg_exception_detail;
  return v_detail;
end;
$$;

-- A wall-clock time in Manila, the default venue timezone.
create or replace function tests.manila(p_date date, p_time time) returns timestamptz
language sql
immutable
set search_path = ''
as $$
  select (p_date + p_time) at time zone 'Asia/Manila';
$$;

grant usage on schema tests to anon, authenticated;
grant execute on all functions in schema tests to anon, authenticated;

select plan(1);
select ok(
  to_regprocedure('tests.create_user(text, text, text)') is not null
    and to_regprocedure('tests.authenticate_as(uuid)') is not null
    and to_regprocedure('tests.authenticate_as_anon()') is not null
    and to_regprocedure('tests.as_postgres()') is not null
    and to_regprocedure('tests.make_admin(uuid)') is not null
    and to_regprocedure('tests.error_detail(text)') is not null
    and to_regprocedure('tests.manila(date, time)') is not null,
  'test helpers are installed'
);
select * from finish();
