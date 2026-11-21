-- The caller's venue memberships, for the session (navigation, role checks). Invoker, so RLS on
-- venue_members and venues decides what comes back.
create or replace function public.my_venues()
returns table (id uuid, name text, slug text, status public.venue_status, role public.member_role, has_pro boolean)
language sql
stable
security invoker
set search_path = ''
as $$
  select v.id, v.name, v.slug, v.status, m.role, public.venue_has_pro(v.id)
  from public.venue_members m
  join public.venues v on v.id = m.venue_id
  where m.user_id = (select auth.uid())
  order by v.name;
$$;

revoke execute on function public.my_venues() from public, anon;
grant execute on function public.my_venues() to authenticated;
