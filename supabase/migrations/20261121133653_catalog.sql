-- Catalog: the sports and amenities venues pick from. Anyone reads; only platform admins write.

create table public.sports (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort smallint not null default 0
);

create table public.amenities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort smallint not null default 0
);

insert into public.sports (slug, name, sort) values
  ('pickleball', 'Pickleball', 1),
  ('badminton', 'Badminton', 2),
  ('tennis', 'Tennis', 3),
  ('padel', 'Padel', 4),
  ('table-tennis', 'Table tennis', 5),
  ('squash', 'Squash', 6);

insert into public.amenities (slug, name, sort) values
  ('parking', 'Parking', 1),
  ('showers', 'Showers', 2),
  ('locker-rooms', 'Locker rooms', 3),
  ('equipment-rental', 'Equipment rental', 4),
  ('coaching', 'Coaching', 5),
  ('cafe', 'Café', 6),
  ('wifi', 'Wi-Fi', 7),
  ('air-conditioning', 'Air conditioning', 8),
  ('seating', 'Seating', 9),
  ('first-aid', 'First aid', 10),
  ('pro-shop', 'Pro shop', 11),
  ('wheelchair-access', 'Wheelchair access', 12);

alter table public.sports enable row level security;
alter table public.amenities enable row level security;

create policy "sports: anyone reads" on public.sports for select to anon, authenticated using (true);
create policy "sports: admins insert" on public.sports for insert to authenticated
  with check ((select public.is_platform_admin()));
create policy "sports: admins update" on public.sports for update to authenticated
  using ((select public.is_platform_admin())) with check ((select public.is_platform_admin()));
create policy "sports: admins delete" on public.sports for delete to authenticated
  using ((select public.is_platform_admin()));

create policy "amenities: anyone reads" on public.amenities for select to anon, authenticated using (true);
create policy "amenities: admins insert" on public.amenities for insert to authenticated
  with check ((select public.is_platform_admin()));
create policy "amenities: admins update" on public.amenities for update to authenticated
  using ((select public.is_platform_admin())) with check ((select public.is_platform_admin()));
create policy "amenities: admins delete" on public.amenities for delete to authenticated
  using ((select public.is_platform_admin()));

-- Undo Supabase's blanket default grants; RLS above narrows writes to admins.
revoke all on public.sports, public.amenities from anon, authenticated;
grant select on public.sports, public.amenities to anon, authenticated;
grant insert, update, delete on public.sports, public.amenities to authenticated;
