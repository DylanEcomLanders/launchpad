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

## Security TODO before going live

The inbound endpoints are currently unauthenticated for v1
simplicity. Before pointing real providers at them:

- **Email**: Postmark adds a `X-Postmark-Inbound-Auth` header if
  you set a basic-auth password. Verify it in the route handler.
- **WhatsApp / Twitter**: verify the HMAC signature header against
  your app secret.
- **Unipile**: shared webhook secret in `Authorization` header.

Reject any request that fails verification before it touches
`processInboundMessage()`.

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
