-- Favorites, in-app notifications and the venue audit trail.

-- ---------------------------------------------------------------------------------------------
-- Favorites: a player's saved venues. Own rows only, for every operation.
-- ---------------------------------------------------------------------------------------------
create table public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  venue_id uuid not null references public.venues (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, venue_id)
);
create index favorites_venue_id_idx on public.favorites (venue_id);

alter table public.favorites enable row level security;
create policy "favorites: own rows" on public.favorites for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.favorites from anon, authenticated;
grant select, delete on public.favorites to authenticated;
grant insert (user_id, venue_id) on public.favorites to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Notifications: written only by the definer functions below, read and dismissed by their owner.
-- ---------------------------------------------------------------------------------------------
create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in (
    'booking_created', 'booking_proof_submitted', 'booking_confirmed', 'booking_payment_rejected',
    'booking_cancelled', 'booking_reminder', 'venue_submitted', 'venue_approved', 'venue_rejected',
    'venue_suspended', 'subscription_submitted', 'subscription_verified', 'subscription_rejected', 'pro_expiring'
  )),
  payload jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_created_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;
create policy "notifications: read own" on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy "notifications: mark own read" on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "notifications: delete own" on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.notifications from anon, authenticated;
grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create or replace function public.notify(p_user_id uuid, p_type text, p_payload jsonb default '{}')
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, type, payload)
  values (p_user_id, p_type, coalesce(p_payload, '{}'));
$$;

-- Every member of the venue at or above p_min.
create or replace function public.notify_venue(p_venue_id uuid, p_min public.member_role, p_type text, p_payload jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, type, payload)
  select m.user_id, p_type, coalesce(p_payload, '{}')
  from public.venue_members m
  where m.venue_id = p_venue_id
    and public.member_role_rank(m.role) >= public.member_role_rank(p_min);
$$;

create or replace function public.notify_admins(p_type text, p_payload jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, type, payload)
  select a.user_id, p_type, coalesce(p_payload, '{}')
  from public.platform_admins a;
$$;

-- Server-side only: RPCs call these as their definer; clients never can.
revoke execute on function public.notify(uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function public.notify_venue(uuid, public.member_role, text, jsonb) from public, anon, authenticated;
revoke execute on function public.notify_admins(text, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Audit log: who changed what on a venue's setup. No foreign keys on actor_id or venue_id:
-- a log row may outlive both, and rows written while a venue or user is being deleted
-- would otherwise point at a row that is already gone.
-- ---------------------------------------------------------------------------------------------
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  venue_id uuid,
  entity text not null,
  entity_id text,
  action text not null check (action in ('insert', 'update', 'delete')),
  diff jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_log_venue_created_idx on public.audit_log (venue_id, created_at desc);
create index audit_log_entity_idx on public.audit_log (entity, entity_id);

alter table public.audit_log enable row level security;
create policy "audit: venue managers and admins read" on public.audit_log for select to authenticated
  using (public.has_venue_role(venue_id, 'manager') or (select public.is_platform_admin()));

revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;

-- diff: the new row on insert, the old row on delete, and {column: [old, new]} for changed
-- columns on update. updated_at and search are noise and never recorded.
-- TG_ARGV[0] names the column that identifies the row within its venue.
create or replace function public.audit_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_row jsonb;
  v_diff jsonb := '{}';
  v_key text;
  v_venue_id uuid;
begin
  if current_setting('courtify.seeding', true) = 'on' then
    return null;
  end if;

  if tg_op <> 'INSERT' then
    v_old := to_jsonb(old) - 'updated_at' - 'search';
  end if;
  if tg_op <> 'DELETE' then
    v_new := to_jsonb(new) - 'updated_at' - 'search';
  end if;
  v_row := coalesce(v_new, v_old);

  if tg_op = 'UPDATE' then
    for v_key in select jsonb_object_keys(v_new) loop
      if (v_new -> v_key) is distinct from (v_old -> v_key) then
        v_diff := v_diff || jsonb_build_object(v_key, jsonb_build_array(v_old -> v_key, v_new -> v_key));
      end if;
    end loop;
    if v_diff = '{}' then
      return null; -- only ignored columns changed
    end if;
  else
    v_diff := v_row;
  end if;

  if tg_table_name = 'venues' then
    v_venue_id := (v_row ->> 'id')::uuid;
  elsif tg_table_name = 'court_rates' then
    select c.venue_id into v_venue_id from public.courts c where c.id = (v_row ->> 'court_id')::uuid;
  else
    v_venue_id := (v_row ->> 'venue_id')::uuid;
  end if;

  insert into public.audit_log (actor_id, venue_id, entity, entity_id, action, diff)
  values ((select auth.uid()), v_venue_id, tg_table_name, v_row ->> tg_argv[0], lower(tg_op), v_diff);

  return null;
end;
$$;

revoke execute on function public.audit_row() from public, anon, authenticated;

create trigger venues_audit after insert or update or delete on public.venues
  for each row execute function public.audit_row('id');
create trigger venue_payment_details_audit after insert or update or delete on public.venue_payment_details
  for each row execute function public.audit_row('venue_id');
create trigger venue_members_audit after insert or update or delete on public.venue_members
  for each row execute function public.audit_row('user_id');
create trigger venue_photos_audit after insert or update or delete on public.venue_photos
  for each row execute function public.audit_row('id');
create trigger venue_amenities_audit after insert or update or delete on public.venue_amenities
  for each row execute function public.audit_row('amenity_id');
create trigger venue_hours_audit after insert or update or delete on public.venue_hours
  for each row execute function public.audit_row('weekday');
create trigger courts_audit after insert or update or delete on public.courts
  for each row execute function public.audit_row('id');
create trigger court_rates_audit after insert or update or delete on public.court_rates
  for each row execute function public.audit_row('id');
