-- Identity: profiles (one per auth user) and platform admins.
-- Platform admin comes only from public.platform_admins, never from user metadata.

-- Reusable trigger function: keeps updated_at current on any table that has one.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  phone text,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.platform_admins where user_id = (select auth.uid()));
$$;

-- Builds the profile for every new auth user. Signup metadata is client-controlled,
-- so only the display name is copied; nothing in it ever grants a role.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS: deny by default, then open exactly what each role needs.
alter table public.profiles enable row level security;
alter table public.platform_admins enable row level security;

create policy "profiles: read own or admin" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_platform_admin()));

create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "platform_admins: read own or admin" on public.platform_admins
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_platform_admin()));

-- Supabase's default privileges grant everything on new public tables to anon and authenticated.
-- Take it back: clients read through RLS, may edit only these profile columns, and write nothing else.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant update (full_name, phone, avatar_path) on public.profiles to authenticated;

revoke all on public.platform_admins from anon, authenticated;
grant select on public.platform_admins to authenticated;

-- Trigger-only functions have no business being callable through the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
