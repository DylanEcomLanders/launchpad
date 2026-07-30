# Build Brief: Sign + Pay + Invoice flow ("Agreement Checkout")

## In one line
Send a client one link. They sign, they pay, they get their invoice to download, all in a single capture. Everything is logged to one internal table. Signature and invoice are built in-house; only the payment step uses Whop (embedded, so the client never leaves Launchpad). VAT is detected by billing address and switched on when we register.

---

## The client-facing flow (one page, three gated steps)

A public token link (`/agreement/[token]`, extends the page that already exists) runs three steps in order. Each step unlocks the next.

**Step 1 - Sign (in-house)**
- Shows the agreement: client + company, engagement (tier / one-time), price (VAT-inclusive), 90-day commitment, scope, terms.
- Captures: typed full name (the signature), an "I agree" confirm, auto date, timestamp + IP.
- On submit: signature saved to the row, a signed-agreement PDF is generated and stored, Step 2 unlocks.

**Step 2 - Pay (Whop, embedded)**
- Server creates a Whop checkout configuration with an inline plan: the client's exact amount and `plan_type` = `one_time` (project) or `renewal` (retainer), plus `metadata: { agreement_id }`.
- Whop's checkout renders inside the page (React/HTML component). The client pays in place; they do not go to whop.com.
- Two confirmation signals:
  - Client-side success callback -> advance the UI immediately (optimistic).
  - Server-side `payment.succeeded` webhook -> the authoritative record: mark paid, store the Whop payment id, generate the invoice, unlock Step 3. Never act on `payment.created`.

**Step 3 - Invoice (in-house)**
- Generates a branded invoice PDF (`@react-pdf/renderer`, already installed): invoice number, date, client, amount, VAT breakdown or "Outside of UK VAT" note (see VAT), payment reference.
- Shown on the page with a Download button; optionally emailed to the client.
- The PDF is saved to a Supabase Storage bucket and the invoice number + path are logged to the row.

Result on one page: sign -> pay -> "Paid" -> invoice with download, and a full internal record.

---

## What we build vs what Whop does

| In-house (us) | Whop |
| --- | --- |
| Token link + wizard page | The embedded payment field only |
| Sign step + signed-agreement PDF | Card processing, one-off + recurring |
| Invoice PDF, download, email, storage | Payment confirmation webhook |
| The internal table + admin list view | |
| VAT logic + tagging | |

---

## Data model (the internal table: `agreements`)

One row per deal, created when the link is generated, updated through the flow.

- `id`, `token` (the link)
- `client_name`, `company`, `email`
- `billing_country`, `billing_address`
- `engagement_type` (`retainer` | `project`), `plan_type` (`renewal` | `one_time`)
- `amount_gross`, `currency` (GBP for now)
- `vat_status` (`uk` | `outside` | `none`), `amount_net`, `amount_vat`
- `signed_name`, `signed_at`, `signed_ip`, `agreement_pdf_path`
- `whop_checkout_id`, `whop_payment_id`, `whop_membership_id` (for retainers)
- `paid` (bool), `paid_at`
- `invoice_number`, `invoice_pdf_path`
- `status` (`draft` | `sent` | `signed` | `paid` | `complete`)
- `created_at`, `updated_at`

Stored in Supabase (same pattern as the rest of the app), so it is shared and shows in the admin table.

---

## VAT logic (config-driven, off until we register)

A single setting: `vatRegistered` (bool, currently **off**), `vatNumber`, `vatRate` (20%).

- **Off (now):** no VAT anywhere. Invoice is just the amount, no VAT number, no breakdown. Nothing else changes until we flip it.
- **On (after we register), UK billing address:** prices are VAT-inclusive, so the 20% is extracted from within the price. £10,000 -> net £8,333.33 + VAT £1,666.67 = £10,000 gross. Invoice shows the breakdown + our VAT number, labelled a VAT invoice.
- **On, non-UK address:** no VAT extracted. Invoice prints "Outside of UK VAT."

Whop always charges the same headline (gross) amount regardless of country; only the invoice accounting differs. Every invoice logs net / VAT / gross / country / status, ready for VAT returns and the existing Finance area.

Assumption to confirm: a non-UK client still pays the same headline amount (it is just all net, no VAT), not the ex-VAT figure.

---

## Whop integration specifics

- **Setup (Dylan's side, one-time):** a Whop business account, one "access pass" to hang plans off, an API key, a webhook secret.
- **Create checkout:** `checkoutConfigurations.create` with an inline plan (custom `initial_price` per client, `plan_type`, `metadata.agreement_id`). No pre-made products needed; the amount and one-off/recurring are set per deal.
- **Webhook:** `/api/whop/webhook`, verified with `whopsdk.webhooks.unwrap()`. Fulfil only on `payment.succeeded`; handle `payment.failed`. For retainers, `membership.went_valid` confirms the subscription is live.
- **To verify before committing:** does Whop's embedded checkout allow a pure guest card payment, or does it force the buyer to create a Whop account mid-flow? That is the one thing that could dent the "one capture, never leaves" goal. Worth a test checkout.

---

## Admin side

- **Agreements table** (a new surface, or folded into Finance): one row per deal - client, amount, signed?, paid?, VAT status, dates, links to the signed agreement + invoice PDFs. Filter by status. Admin/CRO only.
- **Generate an agreement:** from the Sales pipeline (deal won) or a "New agreement" button -> creates the row + token link to send the client.

---

## Sequencing / gating

- Sign before pay; payment confirmed (webhook) before the invoice.
- Optional downstream (phase 2): on paid, auto-send the onboarding form so a signed + paid client flows straight into the Onboarding inbox -> Clients + Delivery. Keeps the whole rail connected: sales -> sign -> pay -> onboard -> deliver.

---

## Recurring (retainers)

- `plan_type: renewal` sets up the Whop subscription; Whop collects monthly. We store the membership id.
- Monthly invoices thereafter (generate + email on each renewal webhook): phase 2.

---

## Suggested build order

1. Data model + admin table + "new agreement" + token route (shell).
2. Sign step + signed-agreement PDF.
3. Invoice generator + download + storage (testable with a "mark paid" stub, no Whop yet).
4. Whop embedded checkout + webhook (needs the Whop account + keys).
5. VAT config (build now, leave off; flip on at registration).
6. Later: recurring monthly invoices, onboarding auto-trigger.

Phases 1-3 and 5 are fully in-house and can start immediately; phase 4 waits on the Whop account.

---

## Open questions / decisions

- Whop guest checkout (no forced account)? Verify with a test.
- Whop fees acceptable vs Stripe/GoCardless? (Whop is the priciest of the three; you chose it knowingly.)
- Non-UK clients pay the same headline amount (assumed) vs ex-VAT.
- Where the admin table lives: new "Agreements" nav item vs inside Finance.
- Single currency (GBP) for now?
- Who can generate agreements (admin/CRO).

## Risks / notes

- Whop is unusual for B2B agency billing - the buyer may end up with a Whop account / "membership." Test the client experience before committing.
- VAT treatment (reverse charge / place-of-supply) is worth a 30-second check with the accountant; the build supports whatever rule you set.
- A typed signature + timestamp + IP + stored PDF is standard and sufficient evidence for B2B service agreements.
