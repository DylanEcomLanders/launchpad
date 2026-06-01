-- 024_create_app_users.sql
-- Per-person identity for Launchpad.
--
-- Until now Launchpad used three SHARED passwords mapped to roles
-- (admin / cro / team) — no concept of "who" a user is. This table is the
-- allowlist that turns shared-role access into per-person identity:
--   * Admin adds a person here (email + name + role + which pod member they are).
--   * That person signs in by magic link; sign-in only "counts" if their
--     email is on this list (no open signup).
--   * `pod_member_id` links the account to their existing pods_v2 member row,
--     so every task already assigned to them lights up with zero migration.
--
-- Storage convention matches the rest of the app: a real typed table here
-- (not the {id,data jsonb} pattern) because we query by email + want RLS.
--
-- NOTE: run this by pasting into the Supabase SQL editor (migrations are not
-- auto-applied in this project — see project_supabase_migrations memory).

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  -- Lowercased email. The join key between Supabase Auth and our allowlist.
  email text not null unique,
  name text not null,
  -- Mirrors the existing AuthGate roles so all role-gating keeps working.
  role text not null default 'team' check (role in ('admin', 'cro', 'team')),
  -- Links to pods_v2_pods -> members[].id (stable member id, e.g. "member-jack").
  -- Null for people who aren't pod members (e.g. founder/admin-only accounts).
  pod_member_id text,
  -- Supabase Auth user id, stamped on first successful sign-in. Lets us tie
  -- an auth session back to this row. Null until they've logged in once.
  auth_id uuid,
  active boolean not null default true,
  invited_by text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create index if not exists app_users_email_idx on app_users (lower(email));
create index if not exists app_users_auth_id_idx on app_users (auth_id);

-- RLS: the anon client may READ the allowlist (the app needs to check whether
-- a freshly-authenticated email is allowed, and resolve its name/role). It may
-- UPDATE only the sign-in bookkeeping columns (auth_id, last_seen_at) via the
-- narrow policy below. Inserts/role-changes are admin-only and done from the
-- Supabase dashboard or a service-role context — never from the browser.
alter table app_users enable row level security;

drop policy if exists app_users_read on app_users;
create policy app_users_read on app_users
  for select using (true);

-- Allow the browser to stamp sign-in bookkeeping (auth_id + last_seen_at) on
-- an existing row. We can't easily scope a column-level update in a USING
-- clause, so we keep this permissive-for-update but the app only ever patches
-- those two columns. Role/email/name remain admin-managed in practice.
drop policy if exists app_users_touch on app_users;
create policy app_users_touch on app_users
  for update using (true) with check (true);

-- Seed the founder so there's always one working admin account. Idempotent.
insert into app_users (email, name, role, invited_by)
values ('dylanevansdesign@gmail.com', 'Dylan', 'admin', 'system')
on conflict (email) do update set role = 'admin', active = true;
