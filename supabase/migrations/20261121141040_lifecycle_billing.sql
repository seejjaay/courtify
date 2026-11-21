-- Venue review lifecycle (draft → pending_review → active, with rejection, suspension and
-- reinstatement) and manual Pro billing: owners upload a GCash receipt, admins verify it.

create type public.billing_period as enum ('monthly', 'yearly');

create table public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  period public.billing_period not null,
  amount_centavos int not null check (amount_centavos > 0),
  reference_no text not null,
  proof_path text not null,
  status public.proof_status not null default 'submitted',
  submitted_by uuid references auth.users (id) on delete set null,
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  reason text,
  period_start timestamptz,
  period_end timestamptz
);
create index subscription_payments_venue_idx on public.subscription_payments (venue_id, submitted_at desc);
create index subscription_payments_queue_idx on public.subscription_payments (submitted_at) where status = 'submitted';

alter table public.subscription_payments enable row level security;
create policy "subscriptions: owners and admins read" on public.subscription_payments for select to authenticated
  using (public.has_venue_role(venue_id, 'owner') or (select public.is_platform_admin()));

revoke all on public.subscription_payments from anon, authenticated;
grant select on public.subscription_payments to authenticated;

create trigger subscription_payments_audit after insert or update or delete on public.subscription_payments
  for each row execute function public.audit_row('id');

-- ---------------------------------------------------------------------------------------------
-- Review lifecycle
-- ---------------------------------------------------------------------------------------------

-- Owners submit a draft (or a rejected venue, after fixing it). Anything missing is listed in
-- the error's DETAIL so the wizard can point at it.
create or replace function public.submit_venue_for_review(p_venue_id uuid)
returns public.venues
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_venue public.venues;
  v_missing text[] := '{}';
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_venue from public.venues where id = p_venue_id for update;
  if not found then
    raise exception 'not_found';
  end if;
  if not public.has_venue_role(p_venue_id, 'owner') then
    raise exception 'forbidden';
  end if;
  if v_venue.status not in ('draft', 'rejected') then
    raise exception 'invalid_state';
  end if;

  if v_venue.location is null then
    v_missing := v_missing || 'location'::text;
  end if;
  if nullif(btrim(v_venue.phone), '') is null and nullif(btrim(v_venue.messenger_url), '') is null then
    v_missing := v_missing || 'contact'::text;
  end if;
  if not exists (select 1 from public.courts c where c.venue_id = p_venue_id and c.is_active) then
    v_missing := v_missing || 'courts'::text;
  end if;
  if not exists (select 1 from public.venue_hours h where h.venue_id = p_venue_id and not h.is_closed) then
    v_missing := v_missing || 'hours'::text;
  end if;
  if not exists (select 1 from public.venue_photos p where p.venue_id = p_venue_id) then
    v_missing := v_missing || 'photos'::text;
  end if;
  if cardinality(v_missing) > 0 then
    raise exception 'venue_incomplete' using detail = array_to_string(v_missing, ',');
  end if;

  update public.venues set status = 'pending_review', submitted_at = now()
  where id = p_venue_id
  returning * into v_venue;

  perform public.notify_admins('venue_submitted', jsonb_build_object('venue_id', v_venue.id, 'name', v_venue.name));
  return v_venue;
end;
$$;

-- Internal: the admin gate and row lock every admin lifecycle RPC starts with.
create or replace function public.lock_venue_for_admin(p_venue_id uuid)
returns public.venues
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_venue public.venues;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated';
  end if;
  if not public.is_platform_admin() then
    raise exception 'forbidden';
  end if;

  select * into v_venue from public.venues where id = p_venue_id for update;
  if not found then
    raise exception 'not_found';
  end if;
  return v_venue;
end;
$$;

create or replace function public.approve_venue(p_venue_id uuid)
returns public.venues
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_venue public.venues := public.lock_venue_for_admin(p_venue_id);
begin
  if v_venue.status <> 'pending_review' then
    raise exception 'invalid_state';
  end if;

  update public.venues
  set status = 'active',
      approved_at = now(),
      trial_ends_at = coalesce(trial_ends_at, now() + make_interval(days => (select s.trial_days from public.platform_settings s))),
      review_note = null
  where id = p_venue_id
  returning * into v_venue;

  perform public.notify_venue(v_venue.id, 'owner', 'venue_approved', jsonb_build_object('venue_id', v_venue.id, 'name', v_venue.name));
  return v_venue;
end;
$$;

create or replace function public.reject_venue(p_venue_id uuid, p_reason text)
returns public.venues
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_venue public.venues := public.lock_venue_for_admin(p_venue_id);
  v_reason text := nullif(btrim(p_reason), '');
begin
  if v_reason is null then
    raise exception 'reason_required';
  end if;
  if v_venue.status <> 'pending_review' then
    raise exception 'invalid_state';
  end if;

  update public.venues set status = 'rejected', review_note = v_reason
  where id = p_venue_id
  returning * into v_venue;

  perform public.notify_venue(v_venue.id, 'owner', 'venue_rejected',
    jsonb_build_object('venue_id', v_venue.id, 'name', v_venue.name, 'reason', v_reason));
  return v_venue;
end;
$$;

-- The reason is kept in review_note so the owner can see why.
create or replace function public.suspend_venue(p_venue_id uuid, p_reason text)
returns public.venues
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_venue public.venues := public.lock_venue_for_admin(p_venue_id);
  v_reason text := nullif(btrim(p_reason), '');
begin
  if v_reason is null then
    raise exception 'reason_required';
  end if;
  if v_venue.status <> 'active' then
    raise exception 'invalid_state';
  end if;

  update public.venues set status = 'suspended', review_note = v_reason
  where id = p_venue_id
  returning * into v_venue;

  perform public.notify_venue(v_venue.id, 'owner', 'venue_suspended',
    jsonb_build_object('venue_id', v_venue.id, 'name', v_venue.name, 'reason', v_reason));
  return v_venue;
end;
$$;

-- Back to active with the trial and subscription dates untouched.
create or replace function public.reinstate_venue(p_venue_id uuid)
returns public.venues
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_venue public.venues := public.lock_venue_for_admin(p_venue_id);
begin
  if v_venue.status <> 'suspended' then
    raise exception 'invalid_state';
  end if;

  update public.venues set status = 'active', review_note = null
  where id = p_venue_id
  returning * into v_venue;
  return v_venue;
end;
$$;

create or replace function public.admin_set_pro_until(p_venue_id uuid, p_pro_until timestamptz)
returns public.venues
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_venue public.venues := public.lock_venue_for_admin(p_venue_id);
begin
  update public.venues set pro_until = p_pro_until
  where id = v_venue.id
  returning * into v_venue;
  return v_venue;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Pro billing
-- ---------------------------------------------------------------------------------------------

create or replace function public.submit_subscription_payment(
  p_venue_id uuid,
  p_period public.billing_period,
  p_reference_no text,
  p_proof_path text
) returns public.subscription_payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_venue public.venues;
  v_payment public.subscription_payments;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_venue from public.venues where id = p_venue_id;
  if not found then
    raise exception 'not_found';
  end if;
  if not public.has_venue_role(p_venue_id, 'owner') then
    raise exception 'forbidden';
  end if;
  if v_venue.status <> 'active' then
    raise exception 'invalid_state';
  end if;
  if nullif(btrim(p_reference_no), '') is null then
    raise exception 'reference_required';
  end if;
  -- Receipts live in the venue's billing folder: {venue_id}/{file}.webp
  if p_proof_path is null or p_proof_path !~ ('^' || p_venue_id::text || '/[^/]+\.webp$') then
    raise exception 'bad_proof_path';
  end if;

  insert into public.subscription_payments (venue_id, period, amount_centavos, reference_no, proof_path, submitted_by)
  select p_venue_id, p_period,
         case p_period when 'monthly' then s.pro_monthly_centavos else s.pro_yearly_centavos end,
         btrim(p_reference_no), p_proof_path, v_user
  from public.platform_settings s
  returning * into v_payment;

  perform public.notify_admins('subscription_submitted',
    jsonb_build_object('payment_id', v_payment.id, 'venue_id', p_venue_id, 'period', p_period));
  return v_payment;
end;
$$;

-- Internal: the admin gate and row lock for reviewing a submitted subscription payment.
create or replace function public.lock_subscription_payment_for_admin(p_payment_id uuid)
returns public.subscription_payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.subscription_payments;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated';
  end if;
  if not public.is_platform_admin() then
    raise exception 'forbidden';
  end if;

  select * into v_payment from public.subscription_payments where id = p_payment_id for update;
  if not found then
    raise exception 'not_found';
  end if;
  return v_payment;
end;
$$;

-- The paid period starts when the current entitlement ends: greatest(now, pro_until,
-- trial_ends_at), so a payment made during the trial doesn't eat the remaining trial days.
create or replace function public.verify_subscription_payment(p_payment_id uuid)
returns public.venues
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.subscription_payments := public.lock_subscription_payment_for_admin(p_payment_id);
  v_venue public.venues;
  v_start timestamptz;
  v_end timestamptz;
begin
  if v_payment.status <> 'submitted' then
    raise exception 'invalid_state';
  end if;

  select * into v_venue from public.venues where id = v_payment.venue_id for update;
  v_start := greatest(now(), v_venue.pro_until, v_venue.trial_ends_at);
  v_end := v_start + case v_payment.period when 'monthly' then interval '1 month' else interval '1 year' end;

  update public.subscription_payments
  set status = 'verified', reviewed_by = (select auth.uid()), reviewed_at = now(),
      period_start = v_start, period_end = v_end
  where id = v_payment.id;

  update public.venues set pro_until = v_end
  where id = v_venue.id
  returning * into v_venue;

  perform public.notify_venue(v_venue.id, 'owner', 'subscription_verified',
    jsonb_build_object('payment_id', v_payment.id, 'venue_id', v_venue.id, 'pro_until', v_end));
  return v_venue;
end;
$$;

create or replace function public.reject_subscription_payment(p_payment_id uuid, p_reason text)
returns public.subscription_payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.subscription_payments := public.lock_subscription_payment_for_admin(p_payment_id);
  v_reason text := nullif(btrim(p_reason), '');
begin
  if v_reason is null then
    raise exception 'reason_required';
  end if;
  if v_payment.status <> 'submitted' then
    raise exception 'invalid_state';
  end if;

  update public.subscription_payments
  set status = 'rejected', reviewed_by = (select auth.uid()), reviewed_at = now(), reason = v_reason
  where id = v_payment.id
  returning * into v_payment;

  perform public.notify_venue(v_payment.venue_id, 'owner', 'subscription_rejected',
    jsonb_build_object('payment_id', v_payment.id, 'venue_id', v_payment.venue_id, 'reason', v_reason));
  return v_payment;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------------------------
revoke execute on function public.lock_venue_for_admin(uuid) from public, anon, authenticated;
revoke execute on function public.lock_subscription_payment_for_admin(uuid) from public, anon, authenticated;

revoke execute on function
  public.submit_venue_for_review(uuid),
  public.approve_venue(uuid),
  public.reject_venue(uuid, text),
  public.suspend_venue(uuid, text),
  public.reinstate_venue(uuid),
  public.admin_set_pro_until(uuid, timestamptz),
  public.submit_subscription_payment(uuid, public.billing_period, text, text),
  public.verify_subscription_payment(uuid),
  public.reject_subscription_payment(uuid, text)
from public, anon;

grant execute on function
  public.submit_venue_for_review(uuid),
  public.approve_venue(uuid),
  public.reject_venue(uuid, text),
  public.suspend_venue(uuid, text),
  public.reinstate_venue(uuid),
  public.admin_set_pro_until(uuid, timestamptz),
  public.submit_subscription_payment(uuid, public.billing_period, text, text),
  public.verify_subscription_payment(uuid),
  public.reject_subscription_payment(uuid, text)
to authenticated;
