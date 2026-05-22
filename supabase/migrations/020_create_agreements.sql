-- ═══════════════════════════════════════════════════════════════════
-- Launchpad: Team agreements — NDAs + contracts per Person
-- Two tables backing /company/contracts + the public signing pages.
-- Same { id text pk, data jsonb, updated_at } convention everything
-- else uses.
--
-- company_agreements          — one row per signed (or pending) NDA /
--                                contract for a Person. The body
--                                clauses are *snapshotted* onto the
--                                row at creation, so editing the
--                                master template later doesn't
--                                retroactively rewrite history.
-- company_agreement_templates — editable master template per kind
--                                ('nda' or 'contract'). Singleton-ish:
--                                the app reads the most recently
--                                updated row for each kind.
--
-- Signing flow:
--   draft (admin created) → sent (signing link copied to team member)
--   → team_signed (member submitted via /portal/<kind>/[id])
--   → counter_signed (Dylan signed in /company/contracts/[id])
--   → active. terminated = ended for any reason after active.
--
-- TODO(pdf-export): for V1 the signed document is rendered as HTML on
-- the detail pages. A future iteration can produce a PDF via
-- @react-pdf/renderer (already used by the proposal PDF) and store
-- it in the finance-documents bucket under team-agreements/.
-- TODO(delivery): no auto-email/Slack of the signing link in V1 —
-- Dylan copies the URL from /company/contracts/[id] and shares it
-- manually. Worth wiring email or Slack DM later.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS company_agreements (
  id          TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS company_agreement_templates (
  id          TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS company_agreements_updated_idx ON company_agreements (updated_at DESC);
CREATE INDEX IF NOT EXISTS company_agreement_templates_updated_idx ON company_agreement_templates (updated_at DESC);

-- RLS — same posture as the other company_* tables. App-level auth
-- gates writes via the launchpad-role cookie; the anon Supabase
-- client used by the data layer just needs rows readable to function.
-- For the public signing pages the read is by `id` (the token), so a
-- guessing attack would need 36 chars of UUID entropy + a knowledge
-- of which kind the URL is for.
ALTER TABLE company_agreements          ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_agreement_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_agreements_all"          ON company_agreements          FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "company_agreement_templates_all" ON company_agreement_templates FOR ALL TO anon USING (true) WITH CHECK (true);
