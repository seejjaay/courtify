-- Venue search: full text plus typo-tolerant names, distance, price, amenities, Pro-only and
-- "free at this time". Definer so it can check bookings, but it only returns public fields.

create index venues_search_idx on public.venues using gin (search);
create index venues_name_trgm_idx on public.venues using gin (name extensions.gin_trgm_ops);
create index venues_location_idx on public.venues using gist (location);

create or replace function public.search_venues(
  p_query text default null,
  p_sport text default null,
  p_city text default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_km double precision default 25,
  p_max_rate_centavos integer default null,
  p_indoor boolean default null,
  p_amenities text[] default null,
  p_bookable_only boolean default false,
  p_free_at timestamptz default null,
  p_free_minutes integer default 60,
  p_sort text default 'relevance',
  p_limit integer default 24,
  p_offset integer default 0
) returns table (
  id uuid,
  slug text,
  name text,
  city text,
  province text,
  lat double precision,
  lng double precision,
  sports text[],
  min_rate_centavos integer,
  is_bookable boolean,
  distance_km double precision,
  cover_photo_path text,
  total_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with params as (
    select
      nullif(btrim(p_query), '') as q,
      case when p_lat is not null and p_lng is not null
        then extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography
      end as point,
      case when p_free_at is not null
        then tstzrange(p_free_at, p_free_at + make_interval(mins => greatest(coalesce(p_free_minutes, 60), 1)), '[)')
      end as free_range
  ),
  -- Active courts that pass the court-level filters; prices and "free at" look at these only.
  matching_courts as (
    select c.id, c.venue_id, c.base_rate_centavos
    from public.courts c
    join public.sports s on s.id = c.sport_id
    where c.is_active
      and (p_sport is null or s.slug = p_sport)
      and (p_indoor is null or c.is_indoor = p_indoor)
  ),
  venue_rates as (
    select mc.venue_id,
           min(least(mc.base_rate_centavos, coalesce(r.min_rule, mc.base_rate_centavos)))::integer as min_rate
    from matching_courts mc
    left join lateral (
      select min(cr.rate_centavos) as min_rule from public.court_rates cr where cr.court_id = mc.id
    ) as r on true
    group by mc.venue_id
  ),
  candidates as (
    select
      v.id, v.slug, v.name, v.city, v.province, v.location, v.approved_at,
      vr.min_rate,
      public.venue_has_pro(v.id) as bookable,
      case when p.point is not null then extensions.st_distance(v.location, p.point) / 1000.0 end as dist_km,
      case when p.q is not null then
        ts_rank(v.search, websearch_to_tsquery('simple', p.q)) + extensions.word_similarity(p.q, v.name)
      else 0 end as relevance
    from public.venues v
    join venue_rates vr on vr.venue_id = v.id
    cross join params p
    where v.status = 'active'
      and (p.q is null
           or v.search @@ websearch_to_tsquery('simple', p.q)
           or p.q operator(extensions.<%) v.name)
      and (p_city is null or lower(v.city) = lower(btrim(p_city)))
      and (p.point is null
           or extensions.st_dwithin(v.location, p.point, coalesce(p_radius_km, 25) * 1000))
      and (p_max_rate_centavos is null or vr.min_rate <= p_max_rate_centavos)
      and (p_amenities is null or not exists (
            select 1 from unnest(p_amenities) as wanted (slug)
            where not exists (
              select 1 from public.venue_amenities va
              join public.amenities a on a.id = va.amenity_id
              where va.venue_id = v.id and a.slug = wanted.slug
            )))
      and (p.free_range is null or exists (
            select 1 from matching_courts mc
            where mc.venue_id = v.id
              and public.is_within_hours(v.id, lower(p.free_range), upper(p.free_range))
              and not exists (
                select 1 from public.bookings b
                where b.court_id = mc.id
                  and b.status in ('held', 'pending_verification', 'confirmed', 'checked_in')
                  and not (b.status = 'held' and b.hold_expires_at <= now())
                  and b.during && p.free_range
              )))
  ),
  filtered as (
    select c.*,
           case
             when p_sort = 'distance' and p.point is not null then 'distance'
             when p_sort in ('price', 'newest') then p_sort
             else 'relevance'
           end as sort_mode
    from candidates c
    cross join params p
    -- Pro-only search, and "free at", only make sense for venues that take online bookings.
    where c.bookable or not (coalesce(p_bookable_only, false) or p_free_at is not null)
  )
  select
    f.id,
    f.slug,
    f.name,
    f.city,
    f.province,
    extensions.st_y(f.location::extensions.geometry),
    extensions.st_x(f.location::extensions.geometry),
    array(
      select distinct on (s.sort, s.slug) s.slug
      from public.courts c
      join public.sports s on s.id = c.sport_id
      where c.venue_id = f.id and c.is_active
      order by s.sort, s.slug
    ),
    f.min_rate,
    f.bookable,
    f.dist_km,
    (select ph.path from public.venue_photos ph where ph.venue_id = f.id order by ph.sort, ph.created_at limit 1),
    count(*) over ()
  from filtered f
  order by
    case when f.sort_mode = 'distance' then f.dist_km end asc nulls last,
    case when f.sort_mode = 'price' then f.min_rate end asc nulls last,
    case when f.sort_mode = 'relevance' then f.relevance end desc nulls last,
    f.approved_at desc nulls last,
    f.id
  limit least(greatest(coalesce(p_limit, 24), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

grant execute on function public.search_venues(
  text, text, text, double precision, double precision, double precision, integer, boolean, text[],
  boolean, timestamptz, integer, text, integer, integer
) to anon, authenticated;
