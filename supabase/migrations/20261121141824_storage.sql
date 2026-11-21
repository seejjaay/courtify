-- Storage buckets and their policies. Paths are contracts that later milestones rely on:
--   venue-photos         {venue_id}/{photo_id}-{480|960|1600}.webp   public
--   avatars              {user_id}/{n}.webp                          public
--   payment-proofs       {user_id}/{booking_id}/{file}.webp
--   subscription-proofs  {venue_id}/{file}.webp
--   payment-qr           venue/{venue_id}.webp | platform/payout.webp
--   venue-docs           {venue_id}/{file}                           pdf or webp
-- Every id taken from a path goes through try_uuid(), which regex-checks before casting, so a
-- malformed name yields null and the policy fails closed instead of raising.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('venue-photos', 'venue-photos', true, 2097152, array['image/webp']),
  ('avatars', 'avatars', true, 1048576, array['image/webp']),
  ('payment-proofs', 'payment-proofs', false, 2097152, array['image/webp']),
  ('subscription-proofs', 'subscription-proofs', false, 2097152, array['image/webp']),
  ('payment-qr', 'payment-qr', false, 1048576, array['image/webp']),
  ('venue-docs', 'venue-docs', false, 5242880, array['application/pdf', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------------------------
-- Helpers. Policies run as the caller, so these keep execute for anon and authenticated; each
-- answers only about the caller's own relationship to a booking or venue.
-- ---------------------------------------------------------------------------------------------

create or replace function public.try_uuid(p_value text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when p_value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then p_value::uuid
  end;
$$;

-- The venue a payment-qr object belongs to, from `venue/{venue_id}.webp`.
create or replace function public.payment_qr_venue_id(p_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select public.try_uuid(substring(p_name from '^venue/([^/]+)\.webp$'));
$$;

create or replace function public.is_booking_player(p_booking_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.bookings b where b.id = p_booking_id and b.player_id = (select auth.uid())
  );
$$;

create or replace function public.is_booking_venue_manager(p_booking_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.bookings b where b.id = p_booking_id and public.has_venue_role(b.venue_id, 'manager')
  );
$$;

-- The caller has a live hold (or a proof waiting to be checked) at the venue.
create or replace function public.has_live_hold_at(p_venue_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.bookings b
    where b.venue_id = p_venue_id
      and b.player_id = (select auth.uid())
      and b.status in ('held', 'pending_verification')
  );
$$;

-- ---------------------------------------------------------------------------------------------
-- venue-photos: managers of the venue write; the public URL serves reads.
-- ---------------------------------------------------------------------------------------------
create policy "venue-photos: managers read" on storage.objects for select to authenticated
  using (bucket_id = 'venue-photos'
         and public.has_venue_role(public.try_uuid((storage.foldername(name))[1]), 'manager'));
create policy "venue-photos: managers upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'venue-photos'
              and array_length(storage.foldername(name), 1) = 1
              and storage.filename(name) ~ '^[A-Za-z0-9_-]+-(480|960|1600)\.webp$'
              and public.has_venue_role(public.try_uuid((storage.foldername(name))[1]), 'manager'));
create policy "venue-photos: managers delete" on storage.objects for delete to authenticated
  using (bucket_id = 'venue-photos'
         and public.has_venue_role(public.try_uuid((storage.foldername(name))[1]), 'manager'));

-- ---------------------------------------------------------------------------------------------
-- avatars: each user writes only their own folder; the public URL serves reads.
-- ---------------------------------------------------------------------------------------------
create policy "avatars: own read" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: own upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars'
              and array_length(storage.foldername(name), 1) = 1
              and (storage.foldername(name))[1] = (select auth.uid())::text
              and storage.filename(name) ~ '^[0-9]+\.webp$');
create policy "avatars: own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------------------------------------
-- payment-proofs: the booker uploads into {own id}/{their booking}/; proofs are evidence, so
-- there is no update or delete. Read by the booker, the venue's managers and admins.
-- ---------------------------------------------------------------------------------------------
create policy "payment-proofs: booker uploads" on storage.objects for insert to authenticated
  with check (bucket_id = 'payment-proofs'
              and array_length(storage.foldername(name), 1) = 2
              and (storage.foldername(name))[1] = (select auth.uid())::text
              and storage.filename(name) ~ '^[^/]+\.webp$'
              and public.is_booking_player(public.try_uuid((storage.foldername(name))[2])));
create policy "payment-proofs: booker, venue managers and admins read" on storage.objects for select to authenticated
  using (bucket_id = 'payment-proofs'
         and (
           ((storage.foldername(name))[1] = (select auth.uid())::text
             and public.is_booking_player(public.try_uuid((storage.foldername(name))[2])))
           or public.is_booking_venue_manager(public.try_uuid((storage.foldername(name))[2]))
           or (select public.is_platform_admin())
         ));

-- ---------------------------------------------------------------------------------------------
-- subscription-proofs: owners upload the venue's Pro receipts; owners and admins read.
-- ---------------------------------------------------------------------------------------------
create policy "subscription-proofs: owners upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'subscription-proofs'
              and array_length(storage.foldername(name), 1) = 1
              and storage.filename(name) ~ '^[^/]+\.webp$'
              and public.has_venue_role(public.try_uuid((storage.foldername(name))[1]), 'owner'));
create policy "subscription-proofs: owners and admins read" on storage.objects for select to authenticated
  using (bucket_id = 'subscription-proofs'
         and (public.has_venue_role(public.try_uuid((storage.foldername(name))[1]), 'owner')
              or (select public.is_platform_admin())));

-- ---------------------------------------------------------------------------------------------
-- payment-qr: a venue's GCash QR (managers write) and the platform payout QR (admins write).
-- The venue QR is read by its members, players paying there, and admins; the platform QR by
-- any signed-in user (owners paying for Pro).
-- ---------------------------------------------------------------------------------------------
create policy "payment-qr: managers and admins read" on storage.objects for select to authenticated
  using (bucket_id = 'payment-qr'
         and (
           name = 'platform/payout.webp'
           or public.has_venue_role(public.payment_qr_venue_id(name), 'staff')
           or public.has_live_hold_at(public.payment_qr_venue_id(name))
           or (select public.is_platform_admin())
         ));
create policy "payment-qr: managers and admins upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'payment-qr'
              and (public.has_venue_role(public.payment_qr_venue_id(name), 'manager')
                   or (name = 'platform/payout.webp' and (select public.is_platform_admin()))));
create policy "payment-qr: managers and admins replace" on storage.objects for update to authenticated
  using (bucket_id = 'payment-qr'
         and (public.has_venue_role(public.payment_qr_venue_id(name), 'manager')
              or (name = 'platform/payout.webp' and (select public.is_platform_admin()))))
  with check (bucket_id = 'payment-qr'
              and (public.has_venue_role(public.payment_qr_venue_id(name), 'manager')
                   or (name = 'platform/payout.webp' and (select public.is_platform_admin()))));
create policy "payment-qr: managers and admins delete" on storage.objects for delete to authenticated
  using (bucket_id = 'payment-qr'
         and (public.has_venue_role(public.payment_qr_venue_id(name), 'manager')
              or (name = 'platform/payout.webp' and (select public.is_platform_admin()))));

-- ---------------------------------------------------------------------------------------------
-- venue-docs: business permits and the like. Owners write and read; admins read.
-- ---------------------------------------------------------------------------------------------
create policy "venue-docs: owners upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'venue-docs'
              and array_length(storage.foldername(name), 1) = 1
              and public.has_venue_role(public.try_uuid((storage.foldername(name))[1]), 'owner'));
create policy "venue-docs: owners and admins read" on storage.objects for select to authenticated
  using (bucket_id = 'venue-docs'
         and (public.has_venue_role(public.try_uuid((storage.foldername(name))[1]), 'owner')
              or (select public.is_platform_admin())));
create policy "venue-docs: owners delete" on storage.objects for delete to authenticated
  using (bucket_id = 'venue-docs'
         and public.has_venue_role(public.try_uuid((storage.foldername(name))[1]), 'owner'));
