-- 065_client_package_priority.sql
-- First slice of Launchpad offer encoding on the Clients workspace.
--
-- Client identity on /clients is pod_docs (one Google-doc-style record per
-- client). Package + the one active commercial priority live in data jsonb
-- (see src/lib/pod-projects/types.ts). These generated columns mirror that
-- shape for SQL; the app keeps reading/writing the jsonb blob so preview
-- works even before this file is pasted.
--
-- package_type NULL = legacy / not yet classified. No backfill. Reversible:
-- drop the three columns + comments.
--
-- Apply manually in the Supabase SQL editor (repo convention). NOT destructive.

do $$ begin
  if to_regclass('public.pod_docs') is null then
    raise notice 'pod_docs missing — skip 065 (apply 059 first)';
    return;
  end if;

  execute $c$
    comment on table pod_docs is
      'Clients workspace docs. data jsonb includes optional packageType (sprint|audit|partner) and commercialPriority { statement, metric }. Null/absent packageType = legacy/unknown — never backfilled.';
  $c$;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pod_docs' and column_name = 'package_type'
  ) then
    alter table pod_docs
      add column package_type text
      generated always as (nullif(data->>'packageType', '')) stored;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pod_docs' and column_name = 'priority_statement'
  ) then
    alter table pod_docs
      add column priority_statement text
      generated always as (nullif(data->'commercialPriority'->>'statement', '')) stored;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pod_docs' and column_name = 'priority_metric'
  ) then
    alter table pod_docs
      add column priority_metric text
      generated always as (nullif(data->'commercialPriority'->>'metric', '')) stored;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'pod_docs_package_type_chk'
  ) then
    alter table pod_docs
      add constraint pod_docs_package_type_chk
      check (package_type is null or package_type in ('sprint', 'audit', 'partner'));
  end if;
end $$;
