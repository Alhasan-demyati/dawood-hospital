-- =====================================================================
-- 0006_realtime.sql — Dawood Hospital voicebot
-- Add the dashboard-streamed tables to the Supabase realtime publication.
-- apps/dashboard subscribes to these via Supabase realtime channels in
-- step 08 (live "recent calls", transcript tail, handover + safety feeds).
--
-- Idempotent + portable: each table is added only if missing, and the
-- whole block is skipped (with a NOTICE) when the supabase_realtime
-- publication does not exist — e.g. on a vanilla Postgres used for local
-- schema checks.
-- =====================================================================

do $$
declare
  tbls text[] := array['conversations', 'turns', 'handovers', 'safety_events'];
  t    text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise notice 'supabase_realtime publication not found — skipping realtime setup (expected on non-Supabase Postgres).';
    return;
  end if;

  foreach t in array tbls loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
      raise notice 'added public.% to supabase_realtime', t;
    end if;
  end loop;
end;
$$;
