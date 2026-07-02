# Staging / Sandbox environment

A deployed duplicate of Launchpad where features can ship, be finetuned live, and
only get promoted to the live build when they're ready. Same code, separate
database, separate URL, separate (or absent) integration secrets.

```
feature branch  →  staging  →  main
  build it        test it live   promote when ready
                 (sandbox URL)   (ecomlanders.app)
```

## Environments

| Env         | Branch    | URL                       | Supabase project | Integration secrets            |
| ----------- | --------- | ------------------------- | ---------------- | ------------------------------ |
| Production  | `main`    | ecomlanders.app           | live project     | real (Slack, Resend, etc.)     |
| Staging     | `staging` | sandbox.ecomlanders.app   | staging project  | none / test only               |
| Local       | any       | localhost:3000            | live (or none)   | whatever is in `.env.local`    |

`NEXT_PUBLIC_APP_ENV` tells the running app which env it is (`production` /
`staging` / `development`). On staging it drives the **SANDBOX** ribbon so the
sandbox can never be mistaken for the live build. See `src/lib/env.ts`.

## Integration isolation (important)

The app is already defensive: every outbound integration no-ops gracefully when
its secret is missing. `/api/notify/slack` returns 503 without `SLACK_BOT_TOKEN`,
`/api/portal/notify` skips email without `RESEND_API_KEY`, and Beeper / Unipile /
ClickUp all return "not configured".

**So the primary isolation is simply: do not put the real integration secrets in
the staging environment.** Give staging only what it needs to run (Supabase +
auth passwords + `NEXT_PUBLIC_APP_ENV=staging`). Every send path then no-ops, and
nothing on the sandbox can ping a real client, channel, or inbox.

Secrets to withhold from staging: `SLACK_BOT_TOKEN`, `SLACK_TOKEN`, `RESEND_API_KEY`,
`TYPEFULLY_API_KEY`, `BEEPER_API_TOKEN`, all `UNIPILE_*`, `CLICKUP_API_TOKEN`,
all `WHOP_*`.

---

## One-time setup (your dashboard steps)

### 1. Supabase - create the staging project
1. Supabase dashboard → New project → name it e.g. `launchpad-staging` (same region as prod).
2. Grab its **Project URL**, **anon/publishable key**, and **service role key** (Settings → API).
3. Link this repo to it and push the schema (from the repo root):
   ```bash
   supabase login              # once, uses your access token
   supabase link --project-ref <staging-project-ref>
   npm run db:push             # applies supabase/migrations/* to staging
   ```
4. Load the test data:
   ```bash
   npm run db:reset:sandbox    # DESTRUCTIVE on the linked (staging) DB:
                               # drops, re-applies migrations, runs seed.sql
   ```
   > Only ever run `db:reset:sandbox` while linked to the **staging** project.
   > Check with `supabase projects list` (linked one is marked) before running.

### 2. Vercel - a second project for the sandbox (recommended)
Cleanest model: one Git repo, two Vercel projects with independent env vars.
1. Vercel → Add New → Project → import the **same** `launchpad` repo again.
2. Name it `launchpad-sandbox`. In Settings → Git, set the **Production Branch**
   to `staging` (so this project deploys the staging branch).
3. Settings → Environment Variables (this project only):
   - `NEXT_PUBLIC_SUPABASE_URL` = staging project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = staging anon key
   - `SUPABASE_SERVICE_ROLE_KEY` = staging service role key
   - `NEXT_PUBLIC_APP_ENV` = `staging`
   - the auth passwords (`ADMIN_PASSWORD`, `NEXT_PUBLIC_COMPANY_PASSWORD`, etc.)
   - **do not** add the integration secrets listed above
4. Deploy.

> Lighter alternative (one project): use Vercel Preview deployments on the
> `staging` branch and scope the staging env vars to that branch. Fewer moving
> parts, but Preview env vars are fiddlier to isolate per-branch. The two-project
> model keeps prod and sandbox secrets cleanly separate.

### 3. Domain
1. In the `launchpad-sandbox` project → Settings → Domains → add
   `sandbox.ecomlanders.app`.
2. Add the CNAME Vercel shows you at your DNS provider. Done.

### 4. Create the branch (code side - already scriptable)
```bash
git checkout main && git pull
git checkout -b staging && git push -u origin staging
```

---

## Day-to-day workflow

```bash
# start a feature off the latest main
git checkout main && git pull
git checkout -b feat/my-thing

# ...build...

# ship it to the sandbox to try live
git checkout staging && git merge feat/my-thing && git push
# → sandbox.ecomlanders.app rebuilds; test + finetune (commit more to the branch,
#   re-merge to staging as needed)

# happy? promote to production
git checkout main && git merge feat/my-thing && git push   # runs the usual tsc + build first
```

Keep `staging` as a throwaway integration branch: it can hold half-done work.
`main` only ever gets clean, finished feature branches. If `staging` drifts messy,
you can hard-reset it to `main` and re-merge the branches you still want.

## Schema changes

Migrations live in `supabase/migrations/`. Apply the same migration to both DBs:
```bash
supabase link --project-ref <staging-ref> && npm run db:push   # staging
supabase link --project-ref <prod-ref>    && npm run db:push   # production
```
`db:push` replaces the old manual copy-paste-into-SQL-editor flow for new
migrations.

## Gotchas

- **Loose SQL files.** A few one-off patches live at `supabase/` root (not in
  `migrations/`): `add_*.sql`, `font_library.sql`, `quiz_submissions.sql`,
  `roadmap_items.sql`, `swipe_file.sql`, etc. `db:push` does **not** apply these.
  If the sandbox is missing a table/column, apply the relevant file manually
  (paste into the staging SQL editor), or fold it into a numbered migration.
- **Migration drift.** Every schema change must land in both DBs (see above), or
  staging and prod diverge.
- **`NEXT_PUBLIC_APP_ENV` must be set to `staging`** in the sandbox Vercel project,
  or the ribbon won't show and the sandbox will look identical to prod.
