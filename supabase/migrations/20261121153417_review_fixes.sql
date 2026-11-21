-- Fixes from the M0 whole-branch review.

-- 1. A hold the every-minute sweep already marked expired still answers hold_expired (not
--    invalid_state), so a player who paid late is told what actually happened (Review Focus 3).
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
  if v_booking.status = 'expired' or (v_booking.status = 'held' and v_booking.hold_expires_at <= now()) then
    raise exception 'hold_expired';
  end if;
  if v_booking.status <> 'held' then
    raise exception 'invalid_state';
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

-- 2. A proof submitted before its booking was cancelled must still leave the queue. Verifying
--    it records that the money arrived and is owed back (refund_due); rejecting it leaves the
--    cancelled booking unpaid. Either way the booking stays cancelled.
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
  v_cancelled boolean;
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

  v_cancelled := v_booking.status = 'cancelled' and v_booking.payment_status = 'proof_submitted';
  if v_payment.status <> 'submitted' or not (v_booking.status = 'pending_verification' or v_cancelled) then
    raise exception 'invalid_state';
  end if;

  update public.booking_payments
  set status = 'verified', reviewed_by = v_user, reviewed_at = now()
  where id = v_payment.id;

  if v_cancelled then
    update public.bookings set payment_status = 'refund_due' where id = v_booking.id returning * into v_booking;
    return v_booking;
  end if;

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
  v_cancelled boolean;
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

  v_cancelled := v_booking.status = 'cancelled' and v_booking.payment_status = 'proof_submitted';
  if v_payment.status <> 'submitted' or not (v_booking.status = 'pending_verification' or v_cancelled) then
    raise exception 'invalid_state';
  end if;

  update public.booking_payments
  set status = 'rejected', reviewed_by = v_user, reviewed_at = now(), reason = v_reason
  where id = v_payment.id;

  if v_cancelled then
    update public.bookings set payment_status = 'unpaid' where id = v_booking.id returning * into v_booking;
  else
    -- The proof didn't hold up, so the booking is unpaid as well as cancelled.
    update public.bookings
    set status = 'cancelled', payment_status = 'unpaid', cancelled_at = now(),
        cancel_reason = 'Payment not verified: ' || v_reason
    where id = v_booking.id
    returning * into v_booking;
  end if;

  if v_booking.player_id is not null then
    perform public.notify(v_booking.player_id, 'booking_payment_rejected',
      jsonb_build_object('booking_id', v_booking.id, 'code', v_booking.code, 'reason', v_reason));
  end if;
  return v_booking;
end;
$$;

-- 3. Pro billing is owner-only, and that includes its audit trail: managers read every other
--    entity's history, but subscription_payments rows need the owner role (or admin).
drop policy "audit: venue managers and admins read" on public.audit_log;
create policy "audit: venue managers and admins read" on public.audit_log for select to authenticated
  using (
    (entity <> 'subscription_payments' and public.has_venue_role(venue_id, 'manager'))
    or (entity = 'subscription_payments' and public.has_venue_role(venue_id, 'owner'))
    or (select public.is_platform_admin())
  );
