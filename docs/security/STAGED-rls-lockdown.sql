-- ═══════════════════════════════════════════════════════════════════
-- STAGED RLS LOCKDOWN  (DO NOT PASTE THIS YET)
--
-- This file is the remediation for audit finding C2 (whole database
-- open to anon). It mirrors the proven pattern in migration
-- 016_lock_finance_rls.sql: drop the permissive "anon FOR ALL" policy,
-- leave RLS enabled (no policy == deny-all for anon), and let the
-- service-role key (server routes only) be the sole writer.
--
-- WHY IT IS STAGED, NOT APPLIED:
--   Every table below is currently read or written by CLIENT-SIDE code
--   using the public anon key. The moment a table is locked, those
--   browser calls start returning empty / failing, and because the data
--   layer swallows errors and falls back to localStorage (finding M7),
--   the breakage is SILENT. So each group must be locked ONLY AFTER its
--   client reads/writes have been moved behind an authenticated server
--   route (the finance module is the reference: /api/finance/store/*).
--
-- EXECUTION: apply each numbered block in the SQL editor in the SAME
-- deploy as the PR that moves that group's data layer server-side.
-- Verify the relevant screens in preview before moving to the next.
-- ═══════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────
-- GROUP 1 — app_users   (BLOCKED ON: server-side auth, finding C1/H2)
--   Client dependency: findAppUserByEmail() in src/lib/auth/app-users.ts
--   reads this table in the browser during login. Do NOT lock until the
--   allowlist check + sign-in bookkeeping run server-side (verify the
--   Supabase Auth JWT in middleware, look up app_users with service role).
-- ───────────────────────────────────────────────────────────────────
-- DROP POLICY IF EXISTS app_users_read  ON app_users;
-- DROP POLICY IF EXISTS app_users_touch ON app_users;


-- ───────────────────────────────────────────────────────────────────
-- GROUP 2 — leads   (BLOCKED ON: server read route for the leads dashboard)
--   Public INSERT path already goes through /api/leads/capture, but the
--   sales/pipeline UI reads + updates leads client-side. Move those to a
--   server route (auth-gated) first, then run:
-- ───────────────────────────────────────────────────────────────────
-- DROP POLICY IF EXISTS "anon read leads"  ON leads;
-- DROP POLICY IF EXISTS "anon write leads" ON leads;


-- ───────────────────────────────────────────────────────────────────
-- GROUP 3 — sales_* dashboard   (BLOCKED ON: sales dashboard server routes)
-- ───────────────────────────────────────────────────────────────────
-- DROP POLICY IF EXISTS "sales_pipeline_stages_all" ON sales_pipeline_stages;
-- DROP POLICY IF EXISTS "sales_leads_all"           ON sales_leads;
-- DROP POLICY IF EXISTS "sales_lead_messages_all"   ON sales_lead_messages;
-- DROP POLICY IF EXISTS "sales_lead_tasks_all"      ON sales_lead_tasks;
-- DROP POLICY IF EXISTS "sales_deals_all"           ON sales_deals;
-- DROP POLICY IF EXISTS "sales_clients_all"         ON sales_clients;


-- ───────────────────────────────────────────────────────────────────
-- GROUP 4 — company_* HR module   (BLOCKED ON: company server routes)
--   PII + invoices. Treat exactly like finance.
-- ───────────────────────────────────────────────────────────────────
-- DROP POLICY IF EXISTS "company_people_anon_all"     ON company_people;
-- DROP POLICY IF EXISTS "company_invoices_anon_all"   ON company_invoices;
-- DROP POLICY IF EXISTS "company_open_roles_anon_all" ON company_open_roles;
-- DROP POLICY IF EXISTS "company_candidates_anon_all" ON company_candidates;


-- ───────────────────────────────────────────────────────────────────
-- GROUP 5 — agreements / contracts   (BLOCKED ON: agreements server routes)
-- ───────────────────────────────────────────────────────────────────
-- DROP POLICY IF EXISTS "company_agreements_all"          ON company_agreements;
-- DROP POLICY IF EXISTS "company_agreement_templates_all" ON company_agreement_templates;


-- ───────────────────────────────────────────────────────────────────
-- GROUP 6 — tickets storage bucket   (can be tightened sooner)
--   Reads can stay public (screenshots) if needed, but anon UPDATE +
--   DELETE must go. Uploads already have a server route
--   (/api/tickets/upload); point them at the service-role client and:
-- ───────────────────────────────────────────────────────────────────
-- DROP POLICY IF EXISTS "tickets_public_update" ON storage.objects;
-- DROP POLICY IF EXISTS "tickets_public_delete" ON storage.objects;
-- -- optionally also remove anon INSERT once uploads use service role:
-- -- DROP POLICY IF EXISTS "tickets_public_insert" ON storage.objects;


-- ───────────────────────────────────────────────────────────────────
-- GROUP 7 — remaining ~30 business tables (migrations 001, 003-005, 009,
--   011-014, 019, 021-025, 029-043). Same "anon FOR ALL" pattern. Lock
--   in the same way, lowest-traffic groups first, each paired with its
--   server-route PR. Enumerate with:
--     grep -rn "to anon" supabase/migrations/ | grep -i "for all"
-- ───────────────────────────────────────────────────────────────────


-- ───────────────────────────────────────────────────────────────────
-- GROUP 8 — voice_profiles (finding H3 in the data-layer pass)
--   Has NO migration in the repo (created via dashboard). Add a tracked
--   migration that ENABLES RLS and adds an authenticated-only policy,
--   then verify in the dashboard that RLS is on.
-- ───────────────────────────────────────────────────────────────────
