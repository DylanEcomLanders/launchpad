-- ── Attachments (universal artefact references) ───────────────
-- Polymorphic table: any record in Launchpad can attach pointers
-- to any artefact in any other tool. No file copying — the
-- attachment is just a {parent, target} reference. Clicking the
-- attachment opens the live source.
--
-- parent = the thing the attachment hangs off (kanban card, lead,
-- client, onboarding, etc.).
-- target = the artefact (report, audit, proposal, brief, roadmap,
-- test, test_win, plus a generic "external" type for URLs that
-- don't live in a Launchpad tool).
-- ──────────────────────────────────────────────────────────────

create table if not exists attachments (
  id          text primary key,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists attachments_updated_at_idx
  on attachments (updated_at desc);

alter table attachments enable row level security;

drop policy if exists "anon read attachments" on attachments;
create policy "anon read attachments" on attachments for select to anon using (true);
drop policy if exists "anon write attachments" on attachments;
create policy "anon write attachments" on attachments for all   to anon using (true) with check (true);
