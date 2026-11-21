-- Extensions live in the `extensions` schema, as Supabase recommends.
create extension if not exists postgis with schema extensions;
create extension if not exists btree_gist with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- pg_cron the Supabase way: it must live in pg_catalog, and postgres schedules the jobs.
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;
