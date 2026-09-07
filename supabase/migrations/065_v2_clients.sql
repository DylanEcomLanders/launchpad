-- 065_v2_clients.sql
-- Launchpad 2.0 foundation: canonical `clients` table.
--
-- NEW table. Not finance_clients, pods_v2_clients, kanban_clients,
-- sales_clients, or cx_*. Do not migrate those here. Empty is fine.
--
-- Auth / persistence (deliberately unlike 1.0 createStore):
--   * Cloud (this table) is the source of truth. No localStorage.
--   * RLS closed: anon denied. authenticated + active app_users only.
--   * Every write stamps updated_by from the signed-in app_users row.
--   * App access is server-side only (server actions). RLS is the last
--     line of defense if a browser ever holds the anon key.

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid not null references public.app_users (id),
  constraint clients_name_not_blank check (length(trim(name)) > 0)
);

create index if not exists clients_created_at_idx on public.clients (created_at desc);
create index if not exists clients_updated_at_idx on public.clients (updated_at desc);

comment on table public.clients is
  'Launchpad 2.0 canonical clients. Names only in the foundation. Not a port of pods_v2/kanban/finance clients.';

-- Who is an active team member? Used by RLS. SECURITY DEFINER so the
-- check does not depend on app_users RLS remaining permissive.
create or replace function public.is_active_app_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_users
    where active = true
      and (
        auth_id = auth.uid()
        or (
          coalesce(auth.jwt() ->> 'email', '') <> ''
          and lower(email) = lower(auth.jwt() ->> 'email')
        )
      )
  );
$$;

revoke all on function public.is_active_app_user() from public;
revoke all on function public.is_active_app_user() from anon;
grant execute on function public.is_active_app_user() to authenticated;

create or replace function public.clients_stamp_meta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid;
begin
  select id into actor
  from public.app_users
  where active = true
    and (
      auth_id = auth.uid()
      or (
        coalesce(auth.jwt() ->> 'email', '') <> ''
        and lower(email) = lower(auth.jwt() ->> 'email')
      )
    )
  limit 1;

  if actor is null then
    raise exception 'clients: signed-in user is not an active app_users row';
  end if;

  new.updated_by := actor;
  new.updated_at := now();
  if tg_op = 'INSERT' then
    new.created_at := coalesce(new.created_at, now());
  else
    new.created_at := old.created_at;
    new.id := old.id;
  end if;

  return new;
end;
$$;

-- Trigger-only. Must not be callable via /rest/v1/rpc.
revoke all on function public.clients_stamp_meta() from public;
revoke all on function public.clients_stamp_meta() from anon;
revoke all on function public.clients_stamp_meta() from authenticated;

drop trigger if exists clients_stamp_meta on public.clients;
create trigger clients_stamp_meta
  before insert or update on public.clients
  for each row execute function public.clients_stamp_meta();

alter table public.clients enable row level security;
alter table public.clients force row level security;

drop policy if exists clients_select_team on public.clients;
create policy clients_select_team on public.clients
  for select
  to authenticated
  using (public.is_active_app_user());

drop policy if exists clients_insert_team on public.clients;
create policy clients_insert_team on public.clients
  for insert
  to authenticated
  with check (public.is_active_app_user());

drop policy if exists clients_update_team on public.clients;
create policy clients_update_team on public.clients
  for update
  to authenticated
  using (public.is_active_app_user())
  with check (public.is_active_app_user());

drop policy if exists clients_delete_team on public.clients;
create policy clients_delete_team on public.clients
  for delete
  to authenticated
  using (public.is_active_app_user());

revoke all on table public.clients from public;
revoke all on table public.clients from anon;
grant select, insert, update, delete on table public.clients to authenticated;
grant all on table public.clients to service_role;
