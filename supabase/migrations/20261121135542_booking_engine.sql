-- Booking engine: operating hours, pricing, availability and race-safe booking creation.
-- Every function is security definer with an empty search_path. Only quote_booking,
-- get_availability (anon + authenticated) and create_booking (authenticated) face clients.

-- ---------------------------------------------------------------------------------------------
-- Hours
-- ---------------------------------------------------------------------------------------------

-- The session that opens on local day p_date: opens_at to closes_at, on the next day when
-- closes_at <= opens_at (equal means 24 h). Null when the venue is closed that day.
create or replace function public.session_bounds(p_venue_id uuid, p_date date)
returns tstzrange
language sql
stable
security definer
set search_path = ''
as $$
  select case when h.is_closed then null else
    tstzrange(
      (p_date + h.opens_at) at time zone v.timezone,
      ((p_date + case when h.closes_at <= h.opens_at then 1 else 0 end) + h.closes_at) at time zone v.timezone,
      '[)'
    )
  end
  from public.venues v
  join public.venue_hours h on h.venue_id = v.id and h.weekday = extract(dow from p_date)::int
  where v.id = p_venue_id;
$$;

-- The session holding [p_starts_at, p_ends_at): the one opening on the start's local date,
-- else the one opening the day before (a Saturday 00:00 slot can belong to Friday's late session).
create or replace function public.session_containing(p_venue_id uuid, p_starts_at timestamptz, p_ends_at timestamptz)
returns tstzrange
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_timezone text;
  v_range tstzrange;
  v_day date;
  v_session tstzrange;
begin
  if p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at then
    return null;
  end if;

  select v.timezone into v_timezone from public.venues v where v.id = p_venue_id;
  if not found then
    return null;
  end if;

  v_range := tstzrange(p_starts_at, p_ends_at, '[)');
  v_day := (p_starts_at at time zone v_timezone)::date;

  v_session := public.session_bounds(p_venue_id, v_day);
  if v_session @> v_range then
    return v_session;
  end if;

  v_session := public.session_bounds(p_venue_id, v_day - 1);
  if v_session @> v_range then
    return v_session;
  end if;

  return null;
end;
$$;

create or replace function public.is_within_hours(p_venue_id uuid, p_starts_at timestamptz, p_ends_at timestamptz)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.session_containing(p_venue_id, p_starts_at, p_ends_at) is not null;
$$;

-- ---------------------------------------------------------------------------------------------
-- Validation and pricing
-- ---------------------------------------------------------------------------------------------

-- Internal. Returns the court's venue, or raises the first rule the range breaks.
create or replace function public.validate_booking_range(
  p_court_id uuid,
  p_starts_at timestamptz,
  p_minutes integer,
  p_enforce_window boolean
) returns public.venues
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_court_active boolean;
  v_venue public.venues;
  v_session tstzrange;
begin
  select c.is_active into v_court_active from public.courts c where c.id = p_court_id;
  if not found then
    raise exception 'not_found';
  end if;
  if not v_court_active then
    raise exception 'court_inactive';
  end if;

  select v.* into v_venue
  from public.venues v
  join public.courts c on c.venue_id = v.id
  where c.id = p_court_id;

  -- Nonsense input can't form a range at all.
  if p_starts_at is null or p_minutes is null or p_minutes <= 0 then
    raise exception 'bad_duration';
  end if;

  v_session := public.session_containing(v_venue.id, p_starts_at, p_starts_at + make_interval(mins => p_minutes));
  if v_session is null then
    raise exception 'outside_hours';
  end if;

  if extract(epoch from p_starts_at - lower(v_session)) % (v_venue.slot_minutes * 60) <> 0 then
    raise exception 'misaligned';
  end if;

  if p_minutes % v_venue.slot_minutes <> 0
     or p_minutes not between v_venue.min_duration_minutes and v_venue.max_duration_minutes then
    raise exception 'bad_duration';
  end if;

  if p_enforce_window then
    if p_starts_at < now() + make_interval(mins => v_venue.min_lead_minutes) then
      raise exception 'too_soon';
    end if;
    if p_starts_at > now() + make_interval(days => v_venue.advance_days) then
      raise exception 'too_far';
    end if;
  end if;

  return v_venue;
end;
$$;

-- Each slot-sized segment is priced by the rule covering its local weekday and start time
-- (rules never overlap on a weekday), else the court's base rate. Past midnight a segment
-- uses its own calendar day's rules.
create or replace function public.compute_price(p_court_id uuid, p_starts_at timestamptz, p_ends_at timestamptz)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(round(
    coalesce(
      (select r.rate_centavos
       from public.court_rates r
       where r.court_id = c.id
         and r.weekdays @> array[extract(dow from seg.local_start)::smallint]
         and seg.local_start::time >= r.starts_at
         and seg.local_start::time < r.ends_at
       order by r.starts_at, r.id
       limit 1),
      c.base_rate_centavos
    ) * v.slot_minutes / 60.0
  )), 0)::integer
  from public.courts c
  join public.venues v on v.id = c.venue_id
  cross join lateral generate_series(
    p_starts_at,
    p_ends_at - make_interval(mins => v.slot_minutes),
    make_interval(mins => v.slot_minutes)
  ) as g (seg_start)
  cross join lateral (select g.seg_start at time zone v.timezone as local_start) as seg
  where c.id = p_court_id;
$$;

-- The price a player would pay, for any active venue (free venues show prices too).
create or replace function public.quote_booking(p_court_id uuid, p_starts_at timestamptz, p_minutes integer)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.courts c
    join public.venues v on v.id = c.venue_id
    where c.id = p_court_id and v.status = 'active'
  ) then
    raise exception 'not_found';
  end if;

  perform public.validate_booking_range(p_court_id, p_starts_at, p_minutes, false);
  return public.compute_price(p_court_id, p_starts_at, p_starts_at + make_interval(mins => p_minutes));
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Availability
-- ---------------------------------------------------------------------------------------------

-- One row per active court, with the day's session and what blocks it. No personal fields.
-- Holds already past their expiry don't count, even before the sweep marks them expired.
create or replace function public.get_availability(p_venue_id uuid, p_date date)
returns table (court_id uuid, court_name text, sport_slug text, session tstzrange, busy jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_session tstzrange;
begin
  if not exists (
    select 1 from public.venues v
    where v.id = p_venue_id
      and (v.status = 'active' or public.has_venue_role(v.id, 'staff') or public.is_platform_admin())
  ) then
    return;
  end if;

  v_session := public.session_bounds(p_venue_id, p_date);

  return query
    select
      c.id,
      c.name,
      s.slug,
      v_session,
      coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'starts_at', lower(b.during),
            'ends_at', upper(b.during),
            'state', case
              when b.kind = 'block' then 'blocked'
              when b.status in ('held', 'pending_verification') then 'held'
              else 'booked'
            end
          )
          order by lower(b.during)
        )
        from public.bookings b
        where b.court_id = c.id
          and b.status in ('held', 'pending_verification', 'confirmed', 'checked_in')
          and not (b.status = 'held' and b.hold_expires_at <= now())
          and b.during && v_session
      ), '[]'::jsonb)
    from public.courts c
    join public.sports s on s.id = c.sport_id
    where c.venue_id = p_venue_id and c.is_active
    order by c.sort, c.name;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Holds and booking creation
-- ---------------------------------------------------------------------------------------------

create or replace function public.expire_stale_holds(p_court_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.bookings
  set status = 'expired'
  where status = 'held'
    and hold_expires_at <= now()
    and (p_court_id is null or court_id = p_court_id);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Race safety: the player's profile row is locked first, so one player's calls run one at a
-- time (double taps, hold and rate limits). Between players, the exclusion constraint decides,
-- and the loser gets slot_taken.
create or replace function public.create_booking(p_court_id uuid, p_starts_at timestamptz, p_minutes integer)
returns public.bookings
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_venue public.venues;
  v_range tstzrange;
  v_booking public.bookings;
  v_attempt int;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  perform 1 from public.profiles p where p.id = v_user for update;
  if not exists (select 1 from public.profiles p where p.id = v_user and nullif(btrim(p.phone), '') is not null) then
    raise exception 'phone_required';
  end if;

  select v.* into v_venue
  from public.venues v
  join public.courts c on c.venue_id = v.id
  where c.id = p_court_id;
  if not found then
    raise exception 'not_found';
  end if;
  if v_venue.status <> 'active' or not public.venue_has_pro(v_venue.id) then
    raise exception 'venue_not_bookable';
  end if;

  v_venue := public.validate_booking_range(p_court_id, p_starts_at, p_minutes, true);
  v_range := tstzrange(p_starts_at, p_starts_at + make_interval(mins => p_minutes), '[)');

  -- Double tap: the same player, court and range gets the live booking back.
  select b.* into v_booking
  from public.bookings b
  where b.player_id = v_user
    and b.court_id = p_court_id
    and b.during = v_range
    and b.status in ('held', 'pending_verification', 'confirmed', 'checked_in')
    and not (b.status = 'held' and b.hold_expires_at <= now())
  limit 1;
  if found then
    return v_booking;
  end if;

  if (select count(*) from public.bookings b
      where b.player_id = v_user and b.status = 'held' and b.hold_expires_at > now()) >= 2 then
    raise exception 'hold_limit';
  end if;

  if (select count(*) from public.bookings b
      where b.player_id = v_user and b.created_at > now() - interval '1 hour') >= 10 then
    raise exception 'rate_limited';
  end if;

  perform public.expire_stale_holds(p_court_id);

  for v_attempt in 1..3 loop
    begin
      insert into public.bookings (
        venue_id, court_id, player_id, kind, during, status, hold_expires_at,
        price_total_centavos, payment_mode, payment_status, created_by
      ) values (
        v_venue.id,
        p_court_id,
        v_user,
        'online',
        v_range,
        case when v_venue.payment_mode = 'gcash_proof'
          then 'held'::public.booking_status else 'confirmed'::public.booking_status end,
        case when v_venue.payment_mode = 'gcash_proof'
          then now() + make_interval(mins => v_venue.hold_minutes) end,
        public.compute_price(p_court_id, lower(v_range), upper(v_range)),
        v_venue.payment_mode,
        'unpaid',
        v_user
      )
      returning * into v_booking;
      exit;
    exception
      when exclusion_violation then
        raise exception 'slot_taken';
      when unique_violation then
        -- A booking code collision (31^6 space): draw again, a couple of times at most.
        if v_attempt = 3 then
          raise;
        end if;
    end;
  end loop;

  perform public.notify_venue(
    v_venue.id, 'manager', 'booking_created',
    jsonb_build_object('booking_id', v_booking.id, 'code', v_booking.code)
  );

  return v_booking;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Privileges: internal helpers stay server-side.
-- ---------------------------------------------------------------------------------------------
revoke execute on function public.session_bounds(uuid, date) from public, anon, authenticated;
revoke execute on function public.session_containing(uuid, timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function public.is_within_hours(uuid, timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function public.validate_booking_range(uuid, timestamptz, integer, boolean) from public, anon, authenticated;
revoke execute on function public.compute_price(uuid, timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function public.expire_stale_holds(uuid) from public, anon, authenticated;

grant execute on function public.quote_booking(uuid, timestamptz, integer) to anon, authenticated;
grant execute on function public.get_availability(uuid, date) to anon, authenticated;

revoke execute on function public.create_booking(uuid, timestamptz, integer) from public, anon;
grant execute on function public.create_booking(uuid, timestamptz, integer) to authenticated;
