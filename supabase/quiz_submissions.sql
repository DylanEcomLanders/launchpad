-- Run this in the Supabase SQL editor.
-- Quiz funnel submissions captured from /quiz.

create table if not exists public.quiz_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- Quiz answers (Q1–Q5)
  vertical text not null,
  revenue text not null,
  traffic_source text not null,
  pain_point text not null,
  cro_history text not null,

  -- Contact (Q6)
  first_name text not null,
  email text not null,
  store_url text not null,
  whatsapp text,

  -- Computed
  lead_tier text not null,            -- 'A' | 'B' | 'C'
  result_page_id uuid not null unique default gen_random_uuid(),

  -- Side-effect flags
  email_sent boolean not null default false,
  slack_sent boolean not null default false,

  -- Sales follow-up
  contacted_by text,
  contacted_at timestamptz,

  -- Attribution
  source text not null default 'direct',
  referrer text not null default ''
);

create index if not exists quiz_submissions_created_idx on public.quiz_submissions (created_at desc);
create index if not exists quiz_submissions_result_idx on public.quiz_submissions (result_page_id);
create index if not exists quiz_submissions_email_idx on public.quiz_submissions (email);
create index if not exists quiz_submissions_tier_idx on public.quiz_submissions (lead_tier);

alter table public.quiz_submissions enable row level security;

-- Public read so the result page can render anonymously by result_page_id token.
-- Same pattern as roadmap_items / portal views.
drop policy if exists "quiz_submissions_public_read" on public.quiz_submissions;
create policy "quiz_submissions_public_read"
  on public.quiz_submissions
  for select
  using (true);

-- Writes happen via the anon key from /api/quiz/submit and /sales-engine/quiz-leads.
drop policy if exists "quiz_submissions_public_write" on public.quiz_submissions;
create policy "quiz_submissions_public_write"
  on public.quiz_submissions
  for all
  using (true)
  with check (true);
