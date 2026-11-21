-- Venues domain: venues and their children, membership and invites, platform settings,
-- and the access helpers every later policy builds on.

create type public.venue_status as enum ('draft', 'pending_review', 'active', 'rejected', 'suspended');
create type public.member_role as enum ('owner', 'manager', 'staff');
create type public.payment_mode as enum ('at_venue', 'gcash_proof');

-- ---------------------------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------------------------

create table public.venues (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  description text,
  address_line text,
  city text,
  province text,
  location extensions.geography(point, 4326),
  timezone text not null default 'Asia/Manila',
  phone text,
  messenger_url text,
  facebook_url text,
  status public.venue_status not null default 'draft',
  review_note text,
  submitted_at timestamptz,
  approved_at timestamptz,
  slot_minutes int not null default 60 check (slot_minutes in (30, 60)),
  min_duration_minutes int not null default 60 check (min_duration_minutes > 0),
  max_duration_minutes int not null default 180,
  advance_days int not null default 14 check (advance_days between 1 and 60),
  min_lead_minutes int not null default 30 check (min_lead_minutes >= 0),
  cancel_cutoff_hours int not null default 12 check (cancel_cutoff_hours >= 0),
  payment_mode public.payment_mode not null default 'at_venue',
  hold_minutes int not null default 30 check (hold_minutes between 10 and 120),
  trial_ends_at timestamptz,
  pro_until timestamptz,
  search tsvector generated always as (
    to_tsvector('simple',
      coalesce(name, '') || ' ' || coalesce(city, '') || ' ' || coalesce(province, '') || ' ' || coalesce(description, ''))
  ) stored,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint venues_durations_fit_slots check (
    min_duration_minutes % slot_minutes = 0 and max_duration_minutes % slot_minutes = 0
  ),
  constraint venues_duration_range check (max_duration_minutes >= min_duration_minutes)
);

create table public.venue_payment_details (
  venue_id uuid primary key references public.venues (id) on delete cascade,
  gcash_name text,
  gcash_number text,
  gcash_qr_path text,
  updated_at timestamptz not null default now()
);

create table public.venue_members (
  venue_id uuid not null references public.venues (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null,
  created_at timestamptz not null default now(),
  primary key (venue_id, user_id)
);
create index venue_members_user_id_idx on public.venue_members (user_id);

create table public.venue_invites (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  role public.member_role not null check (role <> 'owner'),
  token_hash text not null unique,
  expires_at timestamptz not null default now() + interval '7 days',
  created_by uuid references auth.users (id) on delete set null,
  used_by uuid references auth.users (id) on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index venue_invites_venue_id_idx on public.venue_invites (venue_id);

-- Photo files live at `{path}-{480|960|1600}.webp`, and path is always `{venue_id}/{id}`.
create table public.venue_photos (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  path text not null unique,
  width int not null check (width > 0),
  height int not null check (height > 0),
  sort int not null default 0,
  alt text not null default '',
  created_at timestamptz not null default now(),
  constraint venue_photos_path_format check (path = venue_id::text || '/' || id::text)
);
create index venue_photos_venue_id_idx on public.venue_photos (venue_id, sort);

create table public.venue_amenities (
  venue_id uuid not null references public.venues (id) on delete cascade,
  amenity_id uuid not null references public.amenities (id) on delete cascade,
  primary key (venue_id, amenity_id)
);

-- weekday 0 = Sunday. closes_at <= opens_at means the venue closes the next day; equal means 24 h.
create table public.venue_hours (
  venue_id uuid not null references public.venues (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  opens_at time not null,
  closes_at time not null,
  is_closed boolean not null default false,
  primary key (venue_id, weekday)
);

create table public.courts (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  sport_id uuid not null references public.sports (id),
  name text not null,
  surface text not null default 'other'
    check (surface in ('hard', 'clay', 'synthetic-grass', 'wood', 'rubber', 'concrete', 'other')),
  is_indoor boolean not null default false,
  has_lights boolean not null default false,
  base_rate_centavos int not null check (base_rate_centavos > 0),
  is_active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  unique (venue_id, name),
  unique (id, venue_id)
);

-- A rate rule covers [starts_at, ends_at) on each listed weekday; '24:00' closes the day.
create table public.court_rates (
  id uuid primary key default gen_random_uuid(),
  court_id uuid not null references public.courts (id) on delete cascade,
  weekdays smallint[] not null check (
    cardinality(weekdays) > 0
    and array_position(weekdays, null) is null
    and weekdays <@ '{0,1,2,3,4,5,6}'::smallint[]
  ),
  starts_at time not null,
  ends_at time not null,
  rate_centavos int not null check (rate_centavos > 0),
  created_at timestamptz not null default now(),
  constraint court_rates_time_order check (ends_at > starts_at)
);
create index court_rates_court_id_idx on public.court_rates (court_id);

-- Exactly one row: id is always true.
create table public.platform_settings (
  id boolean primary key default true check (id),
  pro_monthly_centavos int not null default 99900 check (pro_monthly_centavos > 0),
  pro_yearly_centavos int not null default 999000 check (pro_yearly_centavos > 0),
  trial_days int not null default 30 check (trial_days >= 0),
  grace_days int not null default 7 check (grace_days >= 0),
  payout_gcash_name text,
  payout_gcash_number text,
  payout_gcash_qr_path text,
  payout_bank_details text,
  announcement text,
  updated_at timestamptz not null default now()
);
insert into public.platform_settings default values;

-- ---------------------------------------------------------------------------------------------
-- Access helpers
-- ---------------------------------------------------------------------------------------------

create or replace function public.member_role_rank(p_role public.member_role)
returns int
language sql
immutable
set search_path = ''
as $$
  select case p_role when 'staff' then 1 when 'manager' then 2 when 'owner' then 3 end;
$$;

-- The caller's role at a venue, or null.
create or replace function public.venue_role(p_venue_id uuid)
returns public.member_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.venue_members where venue_id = p_venue_id and user_id = (select auth.uid());
$$;

create or replace function public.has_venue_role(p_venue_id uuid, p_min public.member_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    public.member_role_rank(public.venue_role(p_venue_id)) >= public.member_role_rank(p_min),
    false
  );
$$;

-- Pro while a subscription or trial runs, plus the platform's grace days after both end.
create or replace function public.venue_has_pro(p_venue_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select now() < greatest(
             coalesce(v.pro_until, '-infinity'::timestamptz),
             coalesce(v.trial_ends_at, '-infinity'::timestamptz)
           ) + make_interval(days => s.grace_days)
    from public.venues v
    cross join public.platform_settings s
    where v.id = p_venue_id
  ), false);
$$;

-- ---------------------------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------------------------

-- The creator becomes the first owner, and every venue gets its (empty) payment details row.
create or replace function public.handle_new_venue()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.created_by is not null then
    insert into public.venue_members (venue_id, user_id, role) values (new.id, new.created_by, 'owner');
  end if;
  insert into public.venue_payment_details (venue_id) values (new.id);
  return null;
end;
$$;

create trigger on_venue_created
  after insert on public.venues
  for each row execute function public.handle_new_venue();

-- A venue always keeps an owner. Definer so the count sees every member, whoever asks.
-- Deleting the venue itself cascades here after the venue row is gone, which is allowed.
create or replace function public.guard_last_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role <> 'owner'
     or (tg_op = 'UPDATE' and new.role = 'owner' and new.venue_id = old.venue_id)
     or not exists (select 1 from public.venues where id = old.venue_id) then
    return coalesce(new, old);
  end if;

  if not exists (
    select 1 from public.venue_members
    where venue_id = old.venue_id and role = 'owner' and user_id <> old.user_id
  ) then
    raise exception 'last_owner';
  end if;

  return coalesce(new, old);
end;
$$;

create trigger venue_members_keep_an_owner
  before update or delete on public.venue_members
  for each row execute function public.guard_last_owner();

-- Two rules on one court may not share a weekday and overlap in time. Locking the court
-- serialises concurrent rate edits so two overlapping inserts can't both pass the check.
create or replace function public.check_court_rate_overlap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.courts where id = new.court_id for update;

  if exists (
    select 1 from public.court_rates r
    where r.court_id = new.court_id
      and r.id <> new.id
      and r.weekdays && new.weekdays
      and r.starts_at < new.ends_at
      and new.starts_at < r.ends_at
  ) then
    raise exception 'rate_overlap';
  end if;

  return new;
end;
$$;

create trigger court_rates_no_overlap
  before insert or update on public.court_rates
  for each row execute function public.check_court_rate_overlap();

create trigger venues_set_updated_at
  before update on public.venues
  for each row execute function public.set_updated_at();
create trigger venue_payment_details_set_updated_at
  before update on public.venue_payment_details
  for each row execute function public.set_updated_at();
create trigger platform_settings_set_updated_at
  before update on public.platform_settings
  for each row execute function public.set_updated_at();

-- Trigger-only functions aren't callable through the API.
revoke execute on function public.handle_new_venue() from public, anon, authenticated;
revoke execute on function public.guard_last_owner() from public, anon, authenticated;
revoke execute on function public.check_court_rate_overlap() from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- RLS and privileges. Supabase grants everything on new public tables by default, so each
-- table revokes that first and grants back exactly what its policies need.
-- ---------------------------------------------------------------------------------------------

alter table public.venues enable row level security;
alter table public.venue_payment_details enable row level security;
alter table public.venue_members enable row level security;
alter table public.venue_invites enable row level security;
alter table public.venue_photos enable row level security;
alter table public.venue_amenities enable row level security;
alter table public.venue_hours enable row level security;
alter table public.courts enable row level security;
alter table public.court_rates enable row level security;
alter table public.platform_settings enable row level security;

-- venues ------------------------------------------------------------------------------------
create policy "venues: read active, own or admin" on public.venues for select to anon, authenticated
  using (status = 'active' or public.has_venue_role(id, 'staff') or (select public.is_platform_admin()));
create policy "venues: signed-in users start one" on public.venues for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy "venues: managers update" on public.venues for update to authenticated
  using (public.has_venue_role(id, 'manager')) with check (public.has_venue_role(id, 'manager'));
create policy "venues: owners delete drafts" on public.venues for delete to authenticated
  using (public.has_venue_role(id, 'owner') and status in ('draft', 'rejected'));

revoke all on public.venues from anon, authenticated;
grant select on public.venues to anon, authenticated;
grant insert (slug, name, description, address_line, city, province, location, phone, messenger_url, facebook_url, created_by)
  on public.venues to authenticated;
-- Profile, contact and booking settings only: status, review, trial, pro, slug and created_by stay server-side.
grant update (
  name, description, address_line, city, province, location, phone, messenger_url, facebook_url,
  slot_minutes, min_duration_minutes, max_duration_minutes, advance_days, min_lead_minutes,
  cancel_cutoff_hours, payment_mode, hold_minutes
) on public.venues to authenticated;
grant delete on public.venues to authenticated;

-- venue_payment_details ---------------------------------------------------------------------
create policy "payment details: managers and admins read" on public.venue_payment_details for select to authenticated
  using (public.has_venue_role(venue_id, 'manager') or (select public.is_platform_admin()));
create policy "payment details: managers and admins update" on public.venue_payment_details for update to authenticated
  using (public.has_venue_role(venue_id, 'manager') or (select public.is_platform_admin()))
  with check (public.has_venue_role(venue_id, 'manager') or (select public.is_platform_admin()));

revoke all on public.venue_payment_details from anon, authenticated;
grant select on public.venue_payment_details to authenticated;
grant update (gcash_name, gcash_number, gcash_qr_path) on public.venue_payment_details to authenticated;

-- venue_members -----------------------------------------------------------------------------
create policy "members: read self, team or admin" on public.venue_members for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.has_venue_role(venue_id, 'staff')
    or (select public.is_platform_admin())
  );
create policy "members: owners insert" on public.venue_members for insert to authenticated
  with check (public.has_venue_role(venue_id, 'owner'));
create policy "members: owners update" on public.venue_members for update to authenticated
  using (public.has_venue_role(venue_id, 'owner')) with check (public.has_venue_role(venue_id, 'owner'));
create policy "members: owners delete" on public.venue_members for delete to authenticated
  using (public.has_venue_role(venue_id, 'owner'));

revoke all on public.venue_members from anon, authenticated;
grant select, delete on public.venue_members to authenticated;
grant insert (venue_id, user_id, role) on public.venue_members to authenticated;
grant update (role) on public.venue_members to authenticated;

-- venue_invites -----------------------------------------------------------------------------
create policy "invites: owners read" on public.venue_invites for select to authenticated
  using (public.has_venue_role(venue_id, 'owner'));
create policy "invites: owners insert" on public.venue_invites for insert to authenticated
  with check (public.has_venue_role(venue_id, 'owner'));
create policy "invites: owners update" on public.venue_invites for update to authenticated
  using (public.has_venue_role(venue_id, 'owner')) with check (public.has_venue_role(venue_id, 'owner'));
create policy "invites: owners delete" on public.venue_invites for delete to authenticated
  using (public.has_venue_role(venue_id, 'owner'));

revoke all on public.venue_invites from anon, authenticated;
grant select, delete on public.venue_invites to authenticated;
grant insert (venue_id, role, token_hash, expires_at, created_by) on public.venue_invites to authenticated;
grant update (role, expires_at) on public.venue_invites to authenticated;

-- Venue children: readable whenever the parent venue is, written by its managers ------------
create policy "photos: read with venue" on public.venue_photos for select to anon, authenticated
  using (exists (select 1 from public.venues v where v.id = venue_id));
create policy "photos: managers insert" on public.venue_photos for insert to authenticated
  with check (public.has_venue_role(venue_id, 'manager'));
create policy "photos: managers update" on public.venue_photos for update to authenticated
  using (public.has_venue_role(venue_id, 'manager')) with check (public.has_venue_role(venue_id, 'manager'));
create policy "photos: managers delete" on public.venue_photos for delete to authenticated
  using (public.has_venue_role(venue_id, 'manager'));

create policy "amenities: read with venue" on public.venue_amenities for select to anon, authenticated
  using (exists (select 1 from public.venues v where v.id = venue_id));
create policy "amenities: managers insert" on public.venue_amenities for insert to authenticated
  with check (public.has_venue_role(venue_id, 'manager'));
create policy "amenities: managers delete" on public.venue_amenities for delete to authenticated
  using (public.has_venue_role(venue_id, 'manager'));

create policy "hours: read with venue" on public.venue_hours for select to anon, authenticated
  using (exists (select 1 from public.venues v where v.id = venue_id));
create policy "hours: managers insert" on public.venue_hours for insert to authenticated
  with check (public.has_venue_role(venue_id, 'manager'));
create policy "hours: managers update" on public.venue_hours for update to authenticated
  using (public.has_venue_role(venue_id, 'manager')) with check (public.has_venue_role(venue_id, 'manager'));
create policy "hours: managers delete" on public.venue_hours for delete to authenticated
  using (public.has_venue_role(venue_id, 'manager'));

create policy "courts: read with venue" on public.courts for select to anon, authenticated
  using (exists (select 1 from public.venues v where v.id = venue_id));
create policy "courts: managers insert" on public.courts for insert to authenticated
  with check (public.has_venue_role(venue_id, 'manager'));
create policy "courts: managers update" on public.courts for update to authenticated
  using (public.has_venue_role(venue_id, 'manager')) with check (public.has_venue_role(venue_id, 'manager'));
create policy "courts: managers delete" on public.courts for delete to authenticated
  using (public.has_venue_role(venue_id, 'manager'));

create policy "rates: read with court" on public.court_rates for select to anon, authenticated
  using (exists (select 1 from public.courts c where c.id = court_id));
create policy "rates: managers insert" on public.court_rates for insert to authenticated
  with check (exists (select 1 from public.courts c where c.id = court_id and public.has_venue_role(c.venue_id, 'manager')));
create policy "rates: managers update" on public.court_rates for update to authenticated
  using (exists (select 1 from public.courts c where c.id = court_id and public.has_venue_role(c.venue_id, 'manager')))
  with check (exists (select 1 from public.courts c where c.id = court_id and public.has_venue_role(c.venue_id, 'manager')));
create policy "rates: managers delete" on public.court_rates for delete to authenticated
  using (exists (select 1 from public.courts c where c.id = court_id and public.has_venue_role(c.venue_id, 'manager')));

revoke all on public.venue_photos, public.venue_amenities, public.venue_hours, public.courts, public.court_rates
  from anon, authenticated;
grant select on public.venue_photos, public.venue_amenities, public.venue_hours, public.courts, public.court_rates
  to anon, authenticated;
grant delete on public.venue_photos, public.venue_amenities, public.venue_hours, public.courts, public.court_rates
  to authenticated;
-- Children never move between venues (or courts), so the parent key is insert-only.
grant insert (id, venue_id, path, width, height, sort, alt) on public.venue_photos to authenticated;
grant update (width, height, sort, alt) on public.venue_photos to authenticated;
grant insert (venue_id, amenity_id) on public.venue_amenities to authenticated;
grant insert (venue_id, weekday, opens_at, closes_at, is_closed) on public.venue_hours to authenticated;
grant update (opens_at, closes_at, is_closed) on public.venue_hours to authenticated;
grant insert (venue_id, sport_id, name, surface, is_indoor, has_lights, base_rate_centavos, is_active, sort)
  on public.courts to authenticated;
grant update (sport_id, name, surface, is_indoor, has_lights, base_rate_centavos, is_active, sort)
  on public.courts to authenticated;
grant insert (court_id, weekdays, starts_at, ends_at, rate_centavos) on public.court_rates to authenticated;
grant update (weekdays, starts_at, ends_at, rate_centavos) on public.court_rates to authenticated;

-- platform_settings -------------------------------------------------------------------------
create policy "settings: everyone reads" on public.platform_settings for select to anon, authenticated
  using (true);
create policy "settings: admins update" on public.platform_settings for update to authenticated
  using ((select public.is_platform_admin())) with check ((select public.is_platform_admin()));

revoke all on public.platform_settings from anon, authenticated;
-- Visitors see prices and the announcement; payout details are for signed-in owners paying for Pro.
grant select (pro_monthly_centavos, pro_yearly_centavos, trial_days, grace_days, announcement)
  on public.platform_settings to anon;
grant select on public.platform_settings to authenticated;
grant update (
  pro_monthly_centavos, pro_yearly_centavos, trial_days, grace_days,
  payout_gcash_name, payout_gcash_number, payout_gcash_qr_path, payout_bank_details, announcement
) on public.platform_settings to authenticated;
