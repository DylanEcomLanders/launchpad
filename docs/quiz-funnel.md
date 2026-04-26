# Quiz Funnel — Setup & Env Vars

## Routes

| Route | Purpose |
|---|---|
| `/quiz` | Landing screen — hook + start CTA |
| `/quiz/[step]` | Quiz steps 1–6 (URL-driven) |
| `/quiz/results/[id]` | Personalised result page (id = `result_page_id`, not the row id) |
| `/api/quiz/submit` | POST — validate, compute tier, save row, fire Slack + email-nurture webhook |
| `/api/webhooks/email-nurture` | Stub — logs the payload, ready to wire to Klaviyo / Customer.io |
| `/api/quiz-leads` | Admin GET — list all submissions newest first |
| `/api/quiz-leads/[id]` | Admin PATCH — `{ contacted: boolean, contactedBy?: string }` |
| `/sales-engine/quiz-leads` | Internal admin dashboard |

## One-time Supabase setup

Run [`supabase/quiz_submissions.sql`](../supabase/quiz_submissions.sql) in the Supabase SQL editor. Creates the `quiz_submissions` table + RLS policies. The schema mirrors the originally-spec'd Prisma model field-for-field, just translated to SQL.

## Env vars

All optional except where noted. Quiz works without Slack / WhatsApp configured — those features just no-op.

```bash
# Required (already used elsewhere in the app)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Optional — Slack ops notifications on each new lead
SLACK_BOT_TOKEN=xoxb-...
SLACK_OPS_CHANNEL_ID=C0123456789

# Optional — public dashboard URL embedded in Slack messages
NEXT_PUBLIC_APP_URL=https://ecomlanders.app

# Optional — adds a "Message on WhatsApp" CTA on Tier A/B result pages.
# Pass full international format including country code; non-digits are stripped.
NEXT_PUBLIC_TEAM_WHATSAPP_NUMBER=447000000000
```

## Lead tiering (per spec)

- **Tier A** — Q2 = £100k+ AND Q5 ≠ "Never" (high fit)
- **Tier B** — Q2 = £30k–£500k OR (Q2 = £100k+ AND Q5 = "Never")
- **Tier C** — Q2 = Under £30k (free resource only, no call CTA)

Implementation: `src/lib/quiz/tier.ts`

## Priority matrix

`src/lib/quiz/priority-matrix.ts` is a pure data file. Edit entries directly as we see real submissions — UI re-renders against the data, no code change needed in components.

Matching rules: most-specific first (`trafficSource × painPoint`), then wildcard `trafficSource × *`, then `* × painPoint`, then default `* × *`. So a new `(meta_cold × cart_abandonment)` entry can be added without touching anything else.

`{vertical}` is interpolated at render time using a small label map in the same file.

## Side-effects on submit

`/api/quiz/submit` returns the `resultUrl` immediately and runs both side-effects in the background (`void` calls):

1. **Slack** — `postSlackMessage(SLACK_OPS_CHANNEL_ID, formatted)`. Success → marks `slack_sent = true`.
2. **Email nurture** — POSTs the payload to `/api/webhooks/email-nurture`. Success → marks `email_sent = true`.

Failures are logged but don't block the user. The flags surface in the admin dashboard so missed notifications are visible.

## Drop-off tracking

Each step renders a view event via `/api/leads/track` with `funnel: "quiz"` + `source: "step-N"`. The submission event fires after a successful POST. Plumbs into the existing `funnel_events` table so the analytics dashboard at `/sales-engine` aggregates audit + quiz views in one place.

## Storage / hydration

- **Step number**: in the URL (`/quiz/3`). Refresh + back-button safe.
- **Answers**: localStorage (`launchpad-quiz-answers`). Persist between steps; cleared on successful submit OR when landing back on `/quiz`.
- **Deep-link guard**: hitting `/quiz/4` with no Q1 answer redirects to `/quiz/1` so users can't skip ahead.

## Testing the flow locally

1. Run the migration in Supabase
2. Set env vars (Slack optional)
3. `npm run dev` → visit `/quiz`
4. Walk through 6 steps → land on `/quiz/results/[id]`
5. Open `/sales-engine/quiz-leads` to see the submission

If Slack is wired, you'll see a notification within ~1s of submission. If not, the row still saves with `slack_sent = false` so you can mark it manually.
