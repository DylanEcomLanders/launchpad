# Launchpad Security and Bug Audit

**Date:** 2026-06-24
**Scope:** entire `launchpad` codebase (845 TS files, 108 API routes, 43 Supabase migrations, dependencies, config).
**Environment:** production (ecomlanders.app, Vercel, main branch).
**Method:** 6 parallel deep-read passes plus direct verification of the top findings.
**Status:** audit complete. Phase 1 remediation applied on branch `security/audit-remediation-2026-06-24` (see Remediation log below).

---

## Remediation log (2026-06-24)

Work is on branch `security/audit-remediation-2026-06-24`. Not pushed. `tsc --noEmit` and `next build` both pass.

### Phase 1: DONE (safe, self-contained, no production breakage)
- **H7 security headers** added in `next.config.ts` (X-Frame-Options, nosniff, HSTS, Referrer-Policy, Permissions-Policy, CSP frame-ancestors). No strict CSP yet (needs preview iteration so it does not break Supabase/fonts/framer-motion).
- **C4 portal XSS**: `branded-report.tsx` now sanitizes the docx HTML with `isomorphic-dompurify` before render.
- **C5 SVG upload XSS**: removed `image/svg+xml` from the case-studies upload allowlist.
- **H2 SSRF**: new guard `src/lib/security/ssrf.ts` (scheme + port + private/loopback/link-local/metadata IP checks with DNS resolution), applied to `cro-audit-engine/generate`, `store-intel` (both modes), and `prospect-scraper`.
- **H3 Slack webhooks**: both `slack/interact` and `slack/ticket` now fail closed when `SLACK_SIGNING_SECRET` is missing, add a 5-minute replay/timestamp window, and wrap `timingSafeEqual` so a malformed signature returns 401 instead of 500.
- **M2 sales inbound webhook**: fails closed in production when `SALES_INBOUND_SECRET` is unset.
- **M8 Shopify HMAC**: now compares decoded bytes, not base64 strings.
- **M4 info leak**: public `leads/capture` and `leads/track` return generic errors instead of raw `err.message`.
- **H5 dependencies**: `npm audit fix` (cleared 13 of 15) + bumped `next` 16.1.6 to 16.2.9, which resolves the HIGH Next.js middleware/proxy-bypass and cache-poisoning advisories. One build-time-only postcss moderate remains (bundled in Next; clears when Next ships a patched postcss). Build verified green.

### Deferred from Phase 1 (needs a small schema add)
- **M1 whop webhook idempotency**: needs a processed-event dedupe table so a replayed signed event cannot spawn duplicate portals. Small, do alongside Phase 2.

### Phase 3 step 1: auth foundation BUILT (additive, not yet cut over)
Net-new code on the branch. It does not change existing login behaviour until you set the env vars and the client starts using it, so deploying the branch is safe. Build + tsc green.
- `src/lib/auth/session-cookie.ts`: mint/verify a SIGNED httpOnly session cookie (`lp_session`), HMAC-SHA256 over `role.expiry` with `AUTH_SESSION_SECRET`, constant-time verify, 8h expiry. No external dep.
- `src/app/api/auth/gate/route.ts`: `POST` validates a submitted password against server-only `ADMIN_PASSWORD`/`CRO_PASSWORD`/`TEAM_PASSWORD` (no NEXT_PUBLIC, no hardcoded fallbacks, constant-time compare) and sets the signed cookie. `DELETE` logs out. Fails closed if `AUTH_SESSION_SECRET` is unset.
- `src/lib/auth/role.ts`: `authedRole` now verifies the signed cookie first; the forgeable legacy `launchpad-role` cookie is honoured ONLY while `AUTH_LEGACY_COOKIE !== "off"` (transition).
- `src/components/auth-gate.tsx`: the shared-password login now calls `/api/auth/gate` first (sets the signed cookie) and falls back to the legacy client comparison only if the gate route is not configured. Non-breaking.
- `src/app/api/admin/set-user-credentials/route.ts` (C1 hot spot): now uses `authedRole(req, ["admin"])`.

**Cutover checklist (you, in a preview session):**
1. Set `AUTH_SESSION_SECRET` (e.g. `openssl rand -hex 32`) and `ADMIN_PASSWORD` / `CRO_PASSWORD` / `TEAM_PASSWORD` (NEW strong values) in Vercel.
2. Deploy the branch to a preview URL; sign in with each role; confirm `lp_session` cookie is set and the app works.
3. Confirm the signed cookie is accepted by a protected route (e.g. the admin user-provisioning screen).
4. Set `AUTH_LEGACY_COOKIE=off`. Re-test: forging `launchpad-role=admin` should now be rejected. This closes C1.
5. Remove the `NEXT_PUBLIC_*_PASSWORD` vars and the hardcoded fallbacks in code (C3); the client no longer needs them once the gate route is the path.

### Phase 2 (remaining) + Phase 3 (remaining): PLANNED, not applied (requires you present + testing in preview)
These are the C1/C2/C3 fixes. They are NOT safe to ship blind because they change the live login flow and lock the database that the browser currently reads directly. Doing them wrong locks everyone out of production.

The hard dependency, confirmed during remediation: the client reads `app_users` in the browser during login (`findAppUserByEmail`), and most other tables are likewise read/written client-side with the anon key. So RLS lockdown (C2) and real auth (C1) are one coupled project, sequenced as:

1. **Server auth foundation.** Verify the Supabase Auth JWT server-side (middleware or per-route `auth.getUser()`); derive role from `app_users` keyed on `auth.uid()`. Add a server route for gate-password entry that sets a signed httpOnly cookie. Replace the unsigned `launchpad-role` cookie check in `src/lib/auth/role.ts`. Closes C1 and the cookie-forgery root cause.
2. **De-NEXT_PUBLIC the passwords** (C3): rename to server-only env vars, remove the hardcoded fallbacks (`ecomlanders2025` etc.), validate server-side, rotate all five in Vercel. Requires the gate route from step 1.
3. **RLS lockdown** (C2): apply `docs/security/STAGED-rls-lockdown.sql` group by group, each paired with the PR that moves that group's data layer onto an authenticated server route (finance is the template). Verify each screen in preview before the next group.
4. **Remaining hardening**: auth + rate limiting + spend caps on the paid-API routes (H1), `quiz-leads` read gating (H6), whop idempotency (M1), unswallow Supabase errors (M7).

The staged SQL lives in `docs/security/STAGED-rls-lockdown.sql` with per-table notes on what must move server-side first. It is deliberately NOT in `supabase/migrations/` so it is not pasted prematurely.

### Things only you can do (no code substitute)
- Set the new server-only password env vars in the Vercel dashboard and rotate all five gate passwords (they are public in every shipped build today).
- Confirm `SLACK_SIGNING_SECRET`, `SHOPIFY_WEBHOOK_SECRET`, and `SALES_INBOUND_SECRET` are set in Vercel production.
- Verify the `finance-documents` and `tickets` storage buckets are private in the Supabase dashboard.
- Paste the staged RLS SQL groups (only as each matching server-route PR lands).

---

## Original audit findings follow

Status note: items marked DONE above are fixed on the remediation branch; everything else stands as written.

---

## How to use this doc

This is the meeting brief. Read "The headline" and "Root-cause architecture problems" first; everything in Critical and High is downstream of those four root causes. Each finding has a stable ID (C1, H2, etc.), a file reference, the attacker impact, and a fix. The remediation plan at the end is the proposed running order.

---

## The headline

There is one root cause that produces most of the critical findings: the app has no real server-side authentication or authorization, and the database is open to the public.

The login screen, the role system, and the finance passcode are all enforced in the browser only. The Supabase anon key ships in the public JS bundle, and almost every table grants `anon` full read, write, and delete. So an attacker does not need to defeat the login. They can talk to the database directly, or forge the cookie that "protected" API routes trust.

This is live production. Treat the Critical items as current exposure, not theory.

---

## Root-cause architecture problems

1. **Auth is client-side only.** `AuthGate` is a `"use client"` component (`src/components/auth-gate.tsx`). There is no `middleware.ts` anywhere. Nothing on the server decides whether a caller is allowed in.

2. **The role cookie is unsigned and trusted.** `src/lib/auth/role.ts:21` reads `launchpad-role` and believes it. Anyone can run `document.cookie="launchpad-role=admin"` or `curl -H "Cookie: launchpad-role=admin"` and become admin to every route that checks it.

3. **Gate passwords are public.** `NEXT_PUBLIC_ADMIN_PASSWORD`, `NEXT_PUBLIC_CRO_PASSWORD`, `NEXT_PUBLIC_TEAM_PASSWORD`, `NEXT_PUBLIC_FINANCE_PASSCODE`, `NEXT_PUBLIC_COMPANY_PASSWORD`. The `NEXT_PUBLIC_` prefix bundles them into client JS served to every visitor. They also have hardcoded fallbacks in source (`"ecomlanders2025"`, `"cro2025"`, `"finance2026"`, `"team2026"`).

4. **Supabase RLS is open.** With one exception (finance), every table uses `FOR ALL ... USING(true) WITH CHECK(true)` for `anon`. RLS is "on" but allows everything.

---

## CRITICAL (fix immediately)

### C1. Anonymous full account takeover
`src/app/api/admin/set-user-credentials/route.ts:35` gates only on the forgeable `launchpad-role=admin` cookie, then uses the service-role client to create users or reset any existing user's password with `email_confirm: true`. **Verified.**
**Impact:** an anonymous attacker sending that one cookie header can reset the owner's account password and lock them out or take over.
**Fix:** verify a real server-side Supabase Auth session and confirm role server-side. Never trust the unsigned cookie for admin gating.

### C2. Entire database readable, writable, and deletable by the public
The anon key is public and these tables are `anon FOR ALL`:
- `leads` (`033_create_leads.sql`): lead PII, call notes, pipeline.
- `app_users` (`024_create_app_users.sql`): the login allowlist. The update policy is column-unscoped, so anyone can set `role=admin` or re-point `auth_id` (privilege escalation).
- `sales_*` (`028_create_sales_dashboard_tables.sql`): clients, deals, revenue, messages.
- `company_*` (`010_create_company_module.sql`): employee and candidate PII, invoices.
- `company_agreements` (`020_create_agreements.sql`): contracts.
- roughly 30 more business tables (`001`, `003` through `043`). Any of them can be mass-deleted by an anonymous request.

**Impact:** full data exfiltration of leads, clients, staff, contracts, and revenue, plus trivial vandalism (delete-all).
**Fix:** apply the finance migration-016 pattern. Disable anon policies, scope reads/writes to authenticated users, move privileged writes to server routes using the service-role key.

### C3. Finance module is protected by a public secret
`src/lib/finance/server-auth.ts:10` validates the `launchpad-finance` cookie against `NEXT_PUBLIC_FINANCE_PASSCODE`, which is in the client bundle and defaults to `"finance2026"`. The cookie value is the passcode.
**Impact:** anyone reads the passcode from the bundle, sets the cookie, and reaches all `/api/finance/*` routes, which use the service-role key (bypasses RLS) to read and write all invoices, expenses, and company financials and to send invoice emails. The good RLS lockdown (migration 016) is undone by the public secret.
**Fix:** validate against a server-only secret. Better, issue a signed httpOnly session token on gate entry and check that instead.

### C4. Stored XSS on the public client portal
`src/components/branded-report.tsx:47` renders `dangerouslySetInnerHTML` with no sanitizer, on HTML that `mammoth` generates from an uploaded `.docx`, served on the public token route `/portal/[token]`. No DOMPurify exists in the repo.
**Impact:** a crafted .docx becomes stored XSS hitting any client who opens the portal link.
**Fix:** sanitize with `isomorphic-dompurify` before storing or before render, plus a CSP.

### C5. Stored XSS via SVG upload (no auth)
`src/app/api/case-studies/upload/route.ts:14` allows `image/svg+xml`, skips the sharp re-encode for SVG, stores to a public bucket, and has no auth.
**Impact:** upload an SVG containing `<script>`; it executes on your domain for any viewer (stored XSS, phishing host, arbitrary file hosting on your domain).
**Fix:** drop SVG from the allowlist or sanitize server-side; serve user uploads with `Content-Disposition: attachment` or from a separate origin. Add auth.

---

## HIGH

### H1. Unauthenticated paid-API endpoints (cost-drain, financial DoS)
Roughly 85 routes have no auth. The expensive ones call Anthropic, Firecrawl, Apify, Serper, and PageSpeed per request: `api/apify`, `api/research/stream`, `api/scout`, `api/cro-audit-engine/generate`, `api/store-intel`, `api/copy-audit/*`, all `api/calendar/*`.
**Impact:** a loop against these runs up unbounded bills and exhausts quotas. No rate limiting exists anywhere.
**Fix:** auth-gate every internal tool route, add per-IP and per-user rate limiting, add a hard spend ceiling.

### H2. SSRF in the scraping routes
No URL-validation helper exists. `src/app/api/cro-audit-engine/generate/route.ts:157` and `src/app/api/store-intel/route.ts` `fetch()` a user-supplied URL server-side with no host allowlist.
**Impact:** reachable targets include cloud metadata (`169.254.169.254`), internal services (`localhost`), and the response is fed back through the LLM (internal data exfiltration). Unauthenticated.
**Fix:** validate the URL (require https scheme, resolve hostname, reject private, loopback, link-local, and metadata ranges, reject non-default ports). Add auth.

### H3. Slack webhooks fail open if the secret is unset
`src/app/api/slack/interact/route.ts:30` and `src/app/api/slack/ticket/route.ts:25` guard with `if (SIGNING_SECRET && !verify(...))`. If `SLACK_SIGNING_SECRET` is missing in prod, every request is accepted.
**Impact:** forged `approve_portal` actions and ticket injection. No timestamp or replay check either (Slack requires rejecting requests older than 5 minutes).
**Fix:** fail closed when the secret is absent. Add a timestamp window check.

### H4. Single-document stores clobbered by anyone
`src/app/api/tickets/route.ts` and `src/app/api/task-board/route.ts`: an anonymous POST overwrites the entire blob, wiping all records. The task-board "auth" is the public admin password in an `x-admin-key` header.
**Impact:** one request wipes or tampers with all tickets or the whole task board.
**Fix:** require real auth; switch to row-level writes or server-side validated merge.

### H5. `next@16.1.6` has multiple HIGH CVEs
Middleware and proxy bypass, RSC cache poisoning, CSP-nonce XSS, image-optimizer DoS, SSRF via WebSocket upgrade, Server Actions CSRF. `npm audit` shows 16 vulns total (8 high). `undici`, `axios`, and `form-data` also flagged.
**Impact:** internet-facing framework vulnerabilities.
**Fix:** `npm i next@latest` (16.3.x or newer) plus `npm audit fix`, then `npx tsc --noEmit` and `npm run build` before pushing.

### H6. `quiz-leads` GET leaks the full lead list
`src/app/api/quiz-leads/route.ts` returns all submissions to anyone (the "auth is at layout level" comment is false for a direct API hit). PATCH lets anyone edit leads.
**Fix:** auth-gate the read and write.

### H7. No security headers
No CSP, `X-Frame-Options`, `nosniff`, HSTS, or `Referrer-Policy` (neither `next.config.ts` nor `vercel.json` set them).
**Impact:** compounds the XSS findings; clickjacking exposure on public `/portal` and `/audit`.
**Fix:** add an `async headers()` block in `next.config.ts` applied to all routes.

---

## MEDIUM

- **M1. Webhook replay, no idempotency.** `src/app/api/webhooks/whop-payment/route.ts` creates a new portal and posts to #ops on every delivery; a replayed signed event spawns unlimited duplicate portals. No event-id dedupe on Whop or Shopify.
- **M2. Sales inbound webhook fails open** when `SALES_INBOUND_SECRET` is unset (`src/lib/sales-dashboard/verify-signature.ts:37`): anonymous fake-lead injection.
- **M3. Client-controlled `contentType` on public-bucket uploads** (case-studies, company, content-calendar, tickets, audit-portfolio, design-brief, strategy-resources): MIME confusion and XSS; several have no auth. `strategy-resources` and `design-brief` accept any file type.
- **M4. Raw error messages leaked to clients** in roughly 40 routes (for example public `src/app/api/leads/capture/route.ts:61`): exposes DB and library internals.
- **M5. `copy-audit/chat`** lets the caller inject arbitrary `role` and `content` history, overriding system-prompt guardrails (`src/app/api/copy-audit/chat/route.ts:44`).
- **M6. Destructive `saveAll` diff** (`src/lib/supabase-store.ts:117`) deletes any row not in the passed list. This is the pattern from the 2026-05-13 incident; dangerous on shared tables, and with open RLS an attacker can trigger it.
- **M7. Silent catch then localStorage fallback** hides failures. Once RLS is locked down, writes will appear to succeed locally and silently never persist.
- **M8. Shopify HMAC compares base64 strings, not decoded bytes** (`src/app/api/webhooks/shopify-order-paid/route.ts:38`): fail-closed today, but fragile.

---

## LOW

- Unauthenticated third-party proxies (Figma, Twitter, Typefully, ClickUp) let anyone use your scoped tokens.
- Cron routes use plain `!==` for the secret (non-constant-time): minor timing side-channel; otherwise fail-closed.
- `src/app/api/webhooks/email-nurture/route.ts` is an unauthenticated log-only stub.
- `voice_profiles` table is queried by client code but has no migration; RLS state is unverifiable (likely default-off).

---

## What is done right (keep, and use as templates)

- **Finance RLS lockdown** (`supabase/migrations/016_lock_finance_rls.sql`) plus service-role server client behind `import "server-only"`. This is the correct template for fixing C2 and C3.
- **Cron routes verify `CRON_SECRET`** and are fail-closed in prod. The felix-digest dev-cookie path is correctly gated on `NODE_ENV !== "production"`. Verified, not a vuln.
- **Shopify and Whop webhooks verify signatures** against the raw body and fail closed when the secret is missing.
- **Payment amounts are server-derived**, not client-supplied; proposal "paid" state is set only by the verified webhook (no `?paid=1` self-unlock).
- **Service-role key and real API keys handled correctly**: server-only, never logged, never committed. `.env.local` is untracked. No real key literals in the tree. TypeScript compiles clean.
- **No SQL injection, no command injection.** The dynamic `finance/store/[table]` route uses a hardcoded table allowlist.

---

## Remediation plan (proposed running order)

1. **Stand up real server auth.** Verify the Supabase Auth JWT server-side (in `middleware.ts` or per-route via `auth.getUser()`), derive role from `app_users` keyed on `auth.uid()`. Remove all reliance on the `launchpad-role` cookie. Closes C1, H1 write path, and most of C2.
2. **Lock down RLS.** Apply the migration-016 pattern to `app_users`, `leads`, `sales_*`, `company_*`, agreements, client and retention tables, and the `tickets` bucket. Move privileged writes to server routes using the service-role key. Closes C2.
3. **De-NEXT_PUBLIC every password,** validate server-side, remove the hardcoded fallbacks (fail closed), and rotate all five (already public in shipped builds). Closes C3 and H4.
4. **Sanitize HTML** (`isomorphic-dompurify`) in `branded-report`, drop or sanitize SVG uploads, stop trusting client `file.type`. Closes C4, C5, M3.
5. **Upgrade `next`** and run `npm audit fix`, then `tsc --noEmit` and build. Closes H5.
6. **Add auth, rate limiting, and spend caps** to paid-API routes; add an SSRF guard to the scrapers. Closes H1 and H2.
7. **Add security headers** in `next.config.ts`; make Slack and sales secrets mandatory (fail closed); add webhook idempotency; stop leaking raw errors. Closes H3, H7, M1, M2, M4.

---

## One-line severity summary

| ID | Severity | Finding |
|----|----------|---------|
| C1 | Critical | Anonymous account takeover via forgeable admin cookie + service-role |
| C2 | Critical | Whole database open to anon (read, write, delete) |
| C3 | Critical | Finance module gated by a client-bundled passcode |
| C4 | Critical | Stored XSS on public client portal (unsanitized docx HTML) |
| C5 | Critical | Stored XSS via unauthenticated SVG upload |
| H1 | High | Unauthenticated paid-API endpoints (cost-drain) |
| H2 | High | SSRF in scraping routes |
| H3 | High | Slack webhooks fail open if secret unset; no replay check |
| H4 | High | Single-document stores overwritable by anyone |
| H5 | High | next@16.1.6 multiple HIGH CVEs |
| H6 | High | quiz-leads GET leaks full lead list |
| H7 | High | No security headers |
| M1 | Medium | Webhook replay, no idempotency |
| M2 | Medium | Sales inbound webhook fails open |
| M3 | Medium | Client-controlled contentType on public uploads |
| M4 | Medium | Raw error messages leaked to clients |
| M5 | Medium | copy-audit/chat prompt-history injection |
| M6 | Medium | Destructive saveAll diff |
| M7 | Medium | Silent localStorage fallback masks failures |
| M8 | Medium | Shopify HMAC compares base64 strings not bytes |
