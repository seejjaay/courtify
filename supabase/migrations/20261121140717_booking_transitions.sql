-- Booking state transitions, walk-ins and blocks. Each RPC locks the rows it changes before
-- checking state, so two people acting on the same booking at once can't both succeed: the
-- second sees the new state and gets invalid_state (Review Focus 4).

-- Internal: inserts a booking row, turning an overlap into slot_taken and retrying the rare
-- booking-code collision.
create or replace function public.insert_booking(p_booking public.bookings)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
  v_attempt int;
begin
  for v_attempt in 1..3 loop
    begin
      insert into public.bookings (
        venue_id, court_id, player_id, kind, customer_name, customer_phone, during, status,
        hold_expires_at, price_total_centavos, payment_mode, payment_status, notes, created_by
      ) values (
        p_booking.venue_id, p_booking.court_id, p_booking.player_id, p_booking.kind, p_booking.customer_name,
        p_booking.customer_phone, p_booking.during, p_booking.status, p_booking.hold_expires_at,
        p_booking.price_total_centavos, p_booking.payment_mode, p_booking.payment_status, p_booking.notes,
        p_booking.created_by
      )
      returning * into v_booking;
      return v_booking;
    exception
      when exclusion_violation then
        raise exception 'slot_taken';
      when unique_violation then
        if v_attempt = 3 then
          raise;
        end if;
    end;
  end loop;
  return null; -- unreachable
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- GCash proof: submit, verify, reject
-- ---------------------------------------------------------------------------------------------

create or replace function public.submit_booking_payment(p_booking_id uuid, p_reference_no text, p_proof_path text)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_booking public.bookings;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'not_found';
  end if;
  if v_booking.player_id is distinct from v_user then
    raise exception 'forbidden';
  end if;
  if v_booking.status <> 'held' then
    raise exception 'invalid_state';
  end if;
  if v_booking.hold_expires_at <= now() then
    raise exception 'hold_expired';
  end if;
  if nullif(btrim(p_reference_no), '') is null then
    raise exception 'reference_required';
  end if;
  -- Proof files live in the booker's own folder: {uid}/{booking_id}/{file}.webp
  if p_proof_path is null or p_proof_path !~ ('^' || v_user::text || '/' || p_booking_id::text || '/[^/]+\.webp$') then
    raise exception 'bad_proof_path';
  end if;

  insert into public.booking_payments (booking_id, amount_centavos, reference_no, proof_path, status, submitted_by)
  values (v_booking.id, v_booking.price_total_centavos, btrim(p_reference_no), p_proof_path, 'submitted', v_user);

  update public.bookings
  set status = 'pending_verification', payment_status = 'proof_submitted', hold_expires_at = null
  where id = v_booking.id
  returning * into v_booking;

  perform public.notify_venue(v_booking.venue_id, 'manager', 'booking_proof_submitted',
    jsonb_build_object('booking_id', v_booking.id, 'code', v_booking.code));
  return v_booking;
end;
$$;

create or replace function public.verify_booking_payment(p_payment_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_payment public.booking_payments;
  v_booking public.bookings;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_payment from public.booking_payments where id = p_payment_id for update;
  if not found then
    raise exception 'not_found';
  end if;
  select * into v_booking from public.bookings where id = v_payment.booking_id for update;
  if not public.has_venue_role(v_booking.venue_id, 'manager') then
    raise exception 'forbidden';
  end if;
  if v_payment.status <> 'submitted' or v_booking.status <> 'pending_verification' then
    raise exception 'invalid_state';
  end if;

  update public.booking_payments
  set status = 'verified', reviewed_by = v_user, reviewed_at = now()
  where id = v_payment.id;

  update public.bookings
  set status = 'confirmed', payment_status = 'paid'
  where id = v_booking.id
  returning * into v_booking;

  if v_booking.player_id is not null then
    perform public.notify(v_booking.player_id, 'booking_confirmed',
      jsonb_build_object('booking_id', v_booking.id, 'code', v_booking.code));
  end if;
  return v_booking;
end;
$$;

create or replace function public.reject_booking_payment(p_payment_id uuid, p_reason text)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_reason text := nullif(btrim(p_reason), '');
  v_payment public.booking_payments;
  v_booking public.bookings;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_payment from public.booking_payments where id = p_payment_id for update;
  if not found then
    raise exception 'not_found';
  end if;
  select * into v_booking from public.bookings where id = v_payment.booking_id for update;
  if not public.has_venue_role(v_booking.venue_id, 'manager') then
    raise exception 'forbidden';
  end if;
  if v_reason is null then
    raise exception 'reason_required';
  end if;
  if v_payment.status <> 'submitted' or v_booking.status <> 'pending_verification' then
    raise exception 'invalid_state';
  end if;

  update public.booking_payments
  set status = 'rejected', reviewed_by = v_user, reviewed_at = now(), reason = v_reason
  where id = v_payment.id;

  -- The proof didn't hold up, so the booking is unpaid as well as cancelled.
  update public.bookings
  set status = 'cancelled', payment_status = 'unpaid', cancelled_at = now(),
      cancel_reason = 'Payment not verified: ' || v_reason
  where id = v_booking.id
  returning * into v_booking;

  if v_booking.player_id is not null then
    perform public.notify(v_booking.player_id, 'booking_payment_rejected',
      jsonb_build_object('booking_id', v_booking.id, 'code', v_booking.code, 'reason', v_reason));
  end if;
  return v_booking;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Cancellation
-- ---------------------------------------------------------------------------------------------

-- Managers and owners cancel live bookings with a reason, any time. Otherwise the booker cancels
-- a held or verifying booking before it starts, and a confirmed one until the venue's cutoff.
-- A paid booking becomes refund_due. The other side is notified.
create or replace function public.cancel_booking(p_booking_id uuid, p_reason text default null)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_reason text := nullif(btrim(p_reason), '');
  v_booking public.bookings;
  v_cutoff_hours int;
  v_by_venue boolean;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'not_found';
  end if;

  v_by_venue := public.has_venue_role(v_booking.venue_id, 'manager');

  if v_by_venue then
    if v_booking.status not in ('held', 'pending_verification', 'confirmed') then
      raise exception 'invalid_state';
    end if;
    if v_reason is null then
      raise exception 'reason_required';
    end if;
  elsif v_booking.player_id = v_user then
    if v_booking.status in ('held', 'pending_verification') then
      if now() >= lower(v_booking.during) then
        raise exception 'cancel_cutoff';
      end if;
    elsif v_booking.status = 'confirmed' then
      select v.cancel_cutoff_hours into v_cutoff_hours from public.venues v where v.id = v_booking.venue_id;
      if now() >= lower(v_booking.during) - make_interval(hours => v_cutoff_hours) then
        raise exception 'cancel_cutoff';
      end if;
    else
      raise exception 'invalid_state';
    end if;
  else
    raise exception 'forbidden';
  end if;

  update public.bookings
  set status = 'cancelled',
      cancelled_at = now(),
      cancel_reason = v_reason,
      payment_status = case when payment_status = 'paid'
        then 'refund_due'::public.payment_status else payment_status end
  where id = v_booking.id
  returning * into v_booking;

  if v_by_venue then
    if v_booking.player_id is not null then
      perform public.notify(v_booking.player_id, 'booking_cancelled',
        jsonb_build_object('booking_id', v_booking.id, 'code', v_booking.code, 'reason', v_reason));
    end if;
  else
    perform public.notify_venue(v_booking.venue_id, 'manager', 'booking_cancelled',
      jsonb_build_object('booking_id', v_booking.id, 'code', v_booking.code));
  end if;
  return v_booking;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Front desk: check-in, payments at the venue, no-shows, refunds. No Pro check, so a lapsed
-- venue keeps serving the bookings it already has.
-- ---------------------------------------------------------------------------------------------

create or replace function public.check_in_booking(p_venue_id uuid, p_code text, p_mark_paid boolean default false)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_booking public.bookings;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  if not public.has_venue_role(p_venue_id, 'staff') then
    raise exception 'forbidden';
  end if;

  select * into v_booking from public.bookings where venue_id = p_venue_id and code = v_code for update;
  if not found then
    raise exception 'not_found';
  end if;
  if v_booking.status <> 'confirmed' then
    raise exception 'invalid_state';
  end if;
  if not (now() >= lower(v_booking.during) - interval '2 hours' and now() < upper(v_booking.during)) then
    raise exception 'check_in_window';
  end if;

  update public.bookings
  set status = 'checked_in',
      checked_in_at = now(),
      checked_in_by = v_user,
      payment_status = case when p_mark_paid and payment_status = 'unpaid'
        then 'paid'::public.payment_status else payment_status end
  where id = v_booking.id
  returning * into v_booking;
  return v_booking;
end;
$$;

create or replace function public.mark_booking_paid(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'not_found';
  end if;
  if not public.has_venue_role(v_booking.venue_id, 'staff') then
    raise exception 'forbidden';
  end if;
  if v_booking.payment_status <> 'unpaid' or v_booking.status not in ('confirmed', 'checked_in', 'completed') then
    raise exception 'invalid_state';
  end if;

  update public.bookings set payment_status = 'paid' where id = v_booking.id returning * into v_booking;
  return v_booking;
end;
$$;

create or replace function public.mark_no_show(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'not_found';
  end if;
  if not public.has_venue_role(v_booking.venue_id, 'staff') then
    raise exception 'forbidden';
  end if;
  if v_booking.status <> 'confirmed' then
    raise exception 'invalid_state';
  end if;
  if now() < lower(v_booking.during) + interval '15 minutes' then
    raise exception 'check_in_window';
  end if;

  update public.bookings set status = 'no_show' where id = v_booking.id returning * into v_booking;
  return v_booking;
end;
$$;

create or replace function public.mark_refunded(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'not_found';
  end if;
  if not public.has_venue_role(v_booking.venue_id, 'manager') then
    raise exception 'forbidden';
  end if;
  if v_booking.payment_status <> 'refund_due' then
    raise exception 'invalid_state';
  end if;

  update public.bookings set payment_status = 'refunded' where id = v_booking.id returning * into v_booking;
  return v_booking;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Walk-ins and blocks (Pro only)
-- ---------------------------------------------------------------------------------------------

create or replace function public.create_walk_in(
  p_court_id uuid,
  p_starts_at timestamptz,
  p_minutes integer,
  p_customer_name text,
  p_customer_phone text default null,
  p_paid boolean default true
) returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_venue_id uuid;
  v_venue public.venues;
  v_row public.bookings;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  select c.venue_id into v_venue_id from public.courts c where c.id = p_court_id;
  if not found then
    raise exception 'not_found';
  end if;
  if not public.has_venue_role(v_venue_id, 'staff') then
    raise exception 'forbidden';
  end if;
  if not public.venue_has_pro(v_venue_id) then
    raise exception 'venue_not_bookable';
  end if;

  v_venue := public.validate_booking_range(p_court_id, p_starts_at, p_minutes, false);
  perform public.expire_stale_holds(p_court_id);

  v_row.venue_id := v_venue.id;
  v_row.court_id := p_court_id;
  v_row.kind := 'walk_in';
  v_row.customer_name := coalesce(nullif(btrim(p_customer_name), ''), 'Walk-in');
  v_row.customer_phone := nullif(btrim(p_customer_phone), '');
  v_row.during := tstzrange(p_starts_at, p_starts_at + make_interval(mins => p_minutes), '[)');
  v_row.status := 'confirmed';
  v_row.price_total_centavos := public.compute_price(p_court_id, lower(v_row.during), upper(v_row.during));
  v_row.payment_mode := 'at_venue';
  v_row.payment_status := case when coalesce(p_paid, true) then 'paid'::public.payment_status else 'unpaid'::public.payment_status end;
  v_row.created_by := v_user;

  return public.insert_booking(v_row);
end;
$$;

-- Takes a court out of play (maintenance, events). Both ends sit on the slot grid, which is
-- anchored at the start of the session holding the start, or local midnight outside hours.
create or replace function public.create_block(p_court_id uuid, p_starts_at timestamptz, p_ends_at timestamptz, p_note text)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_venue public.venues;
  v_anchor timestamptz;
  v_slot_seconds int;
  v_row public.bookings;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  select v.* into v_venue from public.venues v join public.courts c on c.venue_id = v.id where c.id = p_court_id;
  if not found then
    raise exception 'not_found';
  end if;
  if not public.has_venue_role(v_venue.id, 'manager') then
    raise exception 'forbidden';
  end if;
  if not public.venue_has_pro(v_venue.id) then
    raise exception 'venue_not_bookable';
  end if;
  if p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at then
    raise exception 'bad_duration';
  end if;

  v_slot_seconds := v_venue.slot_minutes * 60;
  v_anchor := coalesce(
    lower(public.session_containing(v_venue.id, p_starts_at, p_starts_at + make_interval(secs => v_slot_seconds))),
    ((p_starts_at at time zone v_venue.timezone)::date)::timestamp at time zone v_venue.timezone
  );
  if extract(epoch from p_starts_at - v_anchor) % v_slot_seconds <> 0
     or extract(epoch from p_ends_at - v_anchor) % v_slot_seconds <> 0 then
    raise exception 'misaligned';
  end if;

  perform public.expire_stale_holds(p_court_id);

  v_row.venue_id := v_venue.id;
  v_row.court_id := p_court_id;
  v_row.kind := 'block';
  v_row.during := tstzrange(p_starts_at, p_ends_at, '[)');
  v_row.status := 'confirmed';
  v_row.price_total_centavos := 0;
  v_row.payment_mode := 'at_venue';
  v_row.payment_status := 'waived';
  v_row.notes := nullif(btrim(p_note), '');
  v_row.created_by := v_user;

  return public.insert_booking(v_row);
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------------------------
revoke execute on function public.insert_booking(public.bookings) from public, anon, authenticated;

revoke execute on function
  public.submit_booking_payment(uuid, text, text),
  public.verify_booking_payment(uuid),
  public.reject_booking_payment(uuid, text),
  public.cancel_booking(uuid, text),
  public.check_in_booking(uuid, text, boolean),
  public.mark_booking_paid(uuid),
  public.mark_no_show(uuid),
  public.mark_refunded(uuid),
  public.create_walk_in(uuid, timestamptz, integer, text, text, boolean),
  public.create_block(uuid, timestamptz, timestamptz, text)
from public, anon;

grant execute on function
  public.submit_booking_payment(uuid, text, text),
  public.verify_booking_payment(uuid),
  public.reject_booking_payment(uuid, text),
  public.cancel_booking(uuid, text),
  public.check_in_booking(uuid, text, boolean),
  public.mark_booking_paid(uuid),
  public.mark_no_show(uuid),
  public.mark_refunded(uuid),
  public.create_walk_in(uuid, timestamptz, integer, text, text, boolean),
  public.create_block(uuid, timestamptz, timestamptz, text)
to authenticated;
