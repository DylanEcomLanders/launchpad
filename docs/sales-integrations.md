# Sales Dashboard messaging integrations

The Sales Dashboard's inbox + outbox are wired to internal API
stubs today. Plug in real channel APIs without touching any UI by
swapping the stub bodies.

## Architecture

```
Channel webhook (e.g. Postmark)
  -> /api/sales/inbound/{whatsapp|twitter|linkedin|email}
  -> processInboundMessage() in src/lib/sales-dashboard/inbound.ts
  -> appends an inbound touch to the matching Lead
  -> dashboard inbox re-renders on next refresh

UI compose-and-send (Ajay clicks Send in inbox)
  -> sendOutbound() in src/lib/sales-dashboard/persistence.ts
  -> POST /api/sales/outbound/send
  -> src/app/api/sales/outbound/send/route.ts (stub today)
  -> records an outbound touch + console-logs intent
```

To go live: each channel needs one small adapter that translates
the provider's payload into the canonical shape, plus an
outbound branch in `route.ts` that calls the provider's send API.

## Inbound canonical shape

Every inbound POST must look like:

```json
{
  "from": "string",
  "body": "string",
  "external_id": "optional - provider message id",
  "subject": "optional - email only"
}
```

`from` matching today: case-insensitive substring against
`lead.email` (exact), then `lead.source` / `lead.notes` /
`lead.touches` (best-effort). When you wire a channel that has a
canonical handle (e.g. Twitter `@handle`), prefer matching on a
dedicated `lead.handles.twitter` field added later; for now,
type the handle into the lead's notes blob.

## Per-channel howto

### Email (Postmark / Resend inbound)

1. Add a Postmark inbound stream pointed at:
   `https://YOUR_DOMAIN/api/sales/inbound/email`
2. Postmark's payload includes `From`, `Subject`, `TextBody`. Map it:

```ts
fetch("/api/sales/inbound/email", {
  method: "POST",
  body: JSON.stringify({
    from: postmarkPayload.From,
    body: postmarkPayload.TextBody,
    subject: postmarkPayload.Subject,
    external_id: postmarkPayload.MessageID,
  }),
});
```

3. For outbound, add a branch to
   `src/app/api/sales/outbound/send/route.ts`:

```ts
case "email":
  if (process.env.POSTMARK_TOKEN) {
    await postmark.sendEmail({
      From: "ajay@ecomlanders.com",
      To: lead.email,
      Subject: "Re: your enquiry",
      TextBody: body,
    });
  } else {
    console.info(`[outbound] Email -> ${lead.email}: ${body}`);
  }
  break;
```

### WhatsApp (Business Cloud API)

1. Set up a Meta WhatsApp Business account, get a Phone Number ID
   and a permanent System User token.
2. Set the webhook URL to:
   `https://YOUR_DOMAIN/api/sales/inbound/whatsapp`
3. Verify the webhook (`hub.challenge`) - you'll need a
   `GET` handler alongside the `POST`. Currently the route only
   has POST; add a GET that returns `hub.challenge` in plain text.
4. Normalise the webhook payload:

```ts
const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
if (message) {
  fetch("/api/sales/inbound/whatsapp", {
    method: "POST",
    body: JSON.stringify({
      from: message.from,                  // E.164 phone number
      body: message.text?.body || "",
      external_id: message.id,
    }),
  });
}
```

5. Outbound:

```ts
case "whatsapp":
  if (process.env.WHATSAPP_PHONE_ID && process.env.WHATSAPP_TOKEN) {
    await fetch(`https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: phoneFromLead, type: "text", text: { body } }),
    });
  }
  break;
```

### Twitter (X) DMs

1. X API v2 with Account Activity API access (Pro tier required
   for webhooks). Set webhook to:
   `https://YOUR_DOMAIN/api/sales/inbound/twitter`
2. CRC challenge response needs a separate GET handler.
3. Normalise:

```ts
const dm = body.direct_message_events?.[0];
if (dm) {
  fetch("/api/sales/inbound/twitter", {
    method: "POST",
    body: JSON.stringify({
      from: `@${body.users[dm.message_create.sender_id].screen_name}`,
      body: dm.message_create.message_data.text,
      external_id: dm.id,
    }),
  });
}
```

4. Outbound uses POST `/2/dm_conversations/with/:participant_id/messages`.

### LinkedIn Messaging

LinkedIn doesn't expose conversations via the public API. Options:
- **Unipile** (third-party): unified inbox API, paid. Webhook + send.
- **Manual paste**: paste inbound message into the dashboard's
  Log Touch field, mark channel as LinkedIn. No webhook needed.

For Unipile:

```ts
// Webhook config: https://YOUR_DOMAIN/api/sales/inbound/linkedin
// Unipile payload -> canonical:
fetch("/api/sales/inbound/linkedin", {
  method: "POST",
  body: JSON.stringify({
    from: unipileEvent.from,
    body: unipileEvent.text,
    external_id: unipileEvent.id,
  }),
});

// Outbound branch:
case "linkedin":
  if (process.env.UNIPILE_TOKEN) {
    await unipile.sendMessage({ chat_id: ..., text: body });
  }
  break;
```

## Security: HMAC signature verification

The inbound endpoints verify a shared HMAC signature when the
`SALES_INBOUND_SECRET` env var is set. Without it (dev / pre-
integration state), requests pass through unauthenticated and a
warning logs once per process so it's visible in Vercel logs.

### Wiring it up

1. Generate a strong secret (e.g. `openssl rand -hex 32`).
2. Set `SALES_INBOUND_SECRET` in Vercel project env vars.
3. Each channel adapter computes `hmac_sha256(rawBody, secret)`
   and sends the hex digest in the `X-Webhook-Signature` header.
   The `sha256=` prefix is accepted but not required.

Example (TypeScript / Node):

```ts
import { createHmac } from "node:crypto";

const secret = process.env.SALES_INBOUND_SECRET!;
const rawBody = JSON.stringify({ from: "sam@acme.com", body: "..." });
const signature = createHmac("sha256", secret).update(rawBody).digest("hex");

fetch("/api/sales/inbound/email", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Webhook-Signature": `sha256=${signature}`,
  },
  body: rawBody,
});
```

The route uses `timingSafeEqual` to compare so timing attacks
can't recover the expected hash byte-by-byte.

### Per-provider quirks

Some providers sign with their own scheme — adapt at the adapter
layer rather than rewriting the route:

- **Postmark**: signs with a basic-auth password header
  (`X-Postmark-Inbound-Auth`). Your adapter verifies that header,
  THEN re-signs with our HMAC before POSTing to the inbound route.
- **WhatsApp / Twitter X**: each has its own HMAC scheme. Same
  pattern — verify, re-sign, forward.
- **Unipile**: shared webhook secret in `Authorization`. Same.

Keeps the route surface single-purpose + every adapter is a tiny
self-contained translator.

## Testing the stubs without a real provider

```sh
# Simulate an inbound email
curl -X POST https://localhost:3000/api/sales/inbound/email \
  -H "Content-Type: application/json" \
  -d '{
    "from": "sam@acme.com",
    "subject": "Re: Discovery audit",
    "body": "Yes - lets book a call next week."
  }'

# Returns: {"matched": true, "leadId": "lead-..."}
# Refresh /sales -> inbox shows the new message
```
