-- Bookings core: the table every booking flow writes through RPCs, its payments and status log.
-- Clients only ever read here; every write goes through security-definer RPCs (Tasks 9-11).

create type public.booking_kind as enum ('online', 'walk_in', 'block');
-- Same order as BOOKING_STATUSES in src/lib/booking/status.ts.
create type public.booking_status as enum (
  'held', 'pending_verification', 'confirmed', 'checked_in', 'completed', 'cancelled', 'expired', 'no_show'
);
create type public.payment_status as enum ('unpaid', 'proof_submitted', 'paid', 'refund_due', 'refunded', 'waived');
create type public.proof_status as enum ('submitted', 'verified', 'rejected');

-- Six characters from an alphabet with no I, L, O, 0 or 1. Rejection sampling keeps it unbiased.
create or replace function public.gen_booking_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_code text := '';
  v_byte int;
begin
  while length(v_code) < 6 loop
    v_byte := get_byte(extensions.gen_random_bytes(1), 0);
    if v_byte < 248 then -- 248 = 8 * 31, the largest multiple of the alphabet size below 256
      v_code := v_code || substr(v_alphabet, 1 + v_byte % 31, 1);
    end if;
  end loop;
  return v_code;
end;
$$;

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default public.gen_booking_code(),
  venue_id uuid not null references public.venues (id),
  court_id uuid not null,
  player_id uuid references public.profiles (id) on delete set null,
  kind public.booking_kind not null,
  customer_name text,
  customer_phone text,
  during tstzrange not null check (lower_inc(during) and not upper_inc(during) and not isempty(during)),
  status public.booking_status not null,
  hold_expires_at timestamptz,
  price_total_centavos int not null default 0 check (price_total_centavos >= 0),
  payment_mode public.payment_mode not null,
  payment_status public.payment_status not null default 'unpaid',
  notes text,
  reminded_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancel_reason text,
  checked_in_at timestamptz,
  checked_in_by uuid references auth.users (id) on delete set null,
  constraint bookings_court_in_venue foreign key (court_id, venue_id) references public.courts (id, venue_id),
  constraint bookings_held_needs_expiry check (status <> 'held' or hold_expires_at is not null),
  -- The last line of defence against double booking: live bookings on one court never overlap.
  constraint bookings_no_overlap exclude using gist (court_id with =, during with &&)
    where (status in ('held', 'pending_verification', 'confirmed', 'checked_in'))
);

create index bookings_venue_start_idx on public.bookings (venue_id, lower(during));
create index bookings_player_created_idx on public.bookings (player_id, created_at);
create index bookings_hold_expiry_idx on public.bookings (hold_expires_at) where status = 'held';

create table public.booking_payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  amount_centavos int not null check (amount_centavos >= 0),
  reference_no text,
  proof_path text,
  status public.proof_status not null default 'submitted',
  submitted_by uuid references auth.users (id) on delete set null,
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  reason text
);
create index booking_payments_booking_id_idx on public.booking_payments (booking_id);

create table public.booking_events (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.bookings (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  from_status public.booking_status,
  to_status public.booking_status not null,
  note text,
  created_at timestamptz not null default now()
);
create index booking_events_booking_id_idx on public.booking_events (booking_id, id);

-- Logs creation (from_status null) and every status change, with the cancel reason as the note.
create or replace function public.log_booking_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return null;
  end if;

  insert into public.booking_events (booking_id, actor_id, from_status, to_status, note)
  values (
    new.id,
    (select auth.uid()),
    case when tg_op = 'UPDATE' then old.status end,
    new.status,
    case when new.status = 'cancelled' then new.cancel_reason end
  );
  return null;
end;
$$;

create trigger bookings_log_status
  after insert or update of status on public.bookings
  for each row execute function public.log_booking_status();

revoke execute on function public.log_booking_status() from public, anon, authenticated;

-- RLS: read-only for clients.
alter table public.bookings enable row level security;
alter table public.booking_payments enable row level security;
alter table public.booking_events enable row level security;

create policy "bookings: player, venue staff or admin" on public.bookings for select to authenticated
  using (
    player_id = (select auth.uid())
    or public.has_venue_role(venue_id, 'staff')
    or (select public.is_platform_admin())
  );

-- Proofs are financial: the booking's player, venue managers and admins only.
create policy "payments: player, venue managers or admin" on public.booking_payments for select to authenticated
  using (exists (
    select 1 from public.bookings b
    where b.id = booking_id
      and (
        b.player_id = (select auth.uid())
        or public.has_venue_role(b.venue_id, 'manager')
        or (select public.is_platform_admin())
      )
  ));

-- Events follow their booking's visibility.
create policy "events: follow the booking" on public.booking_events for select to authenticated
  using (exists (select 1 from public.bookings b where b.id = booking_id));

revoke all on public.bookings, public.booking_payments, public.booking_events from anon, authenticated;
grant select on public.bookings, public.booking_payments, public.booking_events to anon, authenticated;

-- Venue staff can read the profiles of players who booked at their venue.
create policy "profiles: venue staff read their bookers" on public.profiles for select to authenticated
  using (exists (
    select 1 from public.bookings b
    where b.player_id = profiles.id and public.has_venue_role(b.venue_id, 'staff')
  ));
