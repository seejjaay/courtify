-- Scheduled jobs (pg_cron) and realtime: postgres_changes on bookings and notifications, plus a
-- public, personal-data-free availability broadcast per venue.

-- ---------------------------------------------------------------------------------------------
-- Job functions (server-side only)
-- ---------------------------------------------------------------------------------------------

create or replace function public.complete_ended_bookings()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.bookings
  set status = 'completed'
  where status in ('confirmed', 'checked_in')
    and upper(during) <= now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Confirmed online bookings starting within two hours get one reminder each.
create or replace function public.send_booking_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  with due as (
    update public.bookings b
    set reminded_at = now()
    where b.status = 'confirmed'
      and b.kind = 'online'
      and b.player_id is not null
      and b.reminded_at is null
      and lower(b.during) > now()
      and lower(b.during) <= now() + interval '2 hours'
    returning b.id, b.code, b.player_id, lower(b.during) as starts_at
  )
  insert into public.notifications (user_id, type, payload)
  select due.player_id, 'booking_reminder',
         jsonb_build_object('booking_id', due.id, 'code', due.code, 'starts_at', due.starts_at)
  from due;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Owners hear 7, 3 and 1 Manila days before Pro (or the trial) ends. The payload carries the
-- expiry date as well, so "already sent" is judged per billing cycle, not forever.
create or replace function public.send_pro_expiry_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_due record;
  v_payload jsonb;
  v_count integer := 0;
begin
  for v_due in
    select
      v.id,
      (greatest(v.pro_until, v.trial_ends_at) at time zone 'Asia/Manila')::date as expires_on,
      (greatest(v.pro_until, v.trial_ends_at) at time zone 'Asia/Manila')::date
        - (now() at time zone 'Asia/Manila')::date as days_left
    from public.venues v
    where v.status = 'active'
      and greatest(v.pro_until, v.trial_ends_at) is not null
  loop
    continue when v_due.days_left not in (7, 3, 1);

    v_payload := jsonb_build_object('venue_id', v_due.id, 'days_left', v_due.days_left, 'expires_on', v_due.expires_on);
    continue when exists (
      select 1 from public.notifications n where n.type = 'pro_expiring' and n.payload = v_payload
    );

    perform public.notify_venue(v_due.id, 'owner', 'pro_expiring', v_payload);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke execute on function public.complete_ended_bookings() from public, anon, authenticated;
revoke execute on function public.send_booking_reminders() from public, anon, authenticated;
revoke execute on function public.send_pro_expiry_reminders() from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Cron (UTC). 00:00 UTC is 08:00 in Manila.
-- ---------------------------------------------------------------------------------------------
select cron.schedule('expire-holds', '* * * * *', $$select public.expire_stale_holds()$$);
select cron.schedule('complete-bookings', '*/15 * * * *', $$select public.complete_ended_bookings()$$);
select cron.schedule('booking-reminders', '*/15 * * * *', $$select public.send_booking_reminders()$$);
select cron.schedule('pro-expiry-reminders', '0 0 * * *', $$select public.send_pro_expiry_reminders()$$);

-- ---------------------------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------------------------

-- postgres_changes respects RLS, so subscribers only receive rows they could select.
alter publication supabase_realtime add table public.bookings, public.notifications;

-- Public broadcast on availability:{venue_id}: which court and time changed and its new state,
-- never who booked it. When a booking moves, its old range is announced free as well.
create or replace function public.broadcast_availability()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_blocking constant public.booking_status[] := array['held', 'pending_verification', 'confirmed', 'checked_in']::public.booking_status[];
  v_topic text := 'availability:' || new.venue_id::text;
  v_state text;
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status and new.during is not distinct from old.during then
    return null;
  end if;

  v_state := case
    when not (new.status = any (v_blocking)) then 'free'
    when new.kind = 'block' then 'blocked'
    when new.status in ('held', 'pending_verification') then 'held'
    else 'booked'
  end;

  perform realtime.send(
    jsonb_build_object('court_id', new.court_id, 'starts_at', lower(new.during), 'ends_at', upper(new.during), 'state', v_state),
    'availability', v_topic, false
  );

  if tg_op = 'UPDATE' and new.during is distinct from old.during and old.status = any (v_blocking) then
    perform realtime.send(
      jsonb_build_object('court_id', old.court_id, 'starts_at', lower(old.during), 'ends_at', upper(old.during), 'state', 'free'),
      'availability', v_topic, false
    );
  end if;

  return null;
end;
$$;

revoke execute on function public.broadcast_availability() from public, anon, authenticated;

create trigger bookings_broadcast_availability
  after insert or update of status, during on public.bookings
  for each row execute function public.broadcast_availability();
