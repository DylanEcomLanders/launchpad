/* ── Unipile adapter ──
 *
 * Single integration point for outbound + inbound messaging across
 * every channel Unipile bridges (Gmail, WhatsApp, LinkedIn, Instagram,
 * Telegram, X). The launchpad never talks to those networks directly
 * - it talks to Unipile's REST API, which talks to Ajay's linked
 * accounts.
 *
 * Architecture:
 *   Launchpad → Unipile API → Ajay's actual accounts → recipients
 *   recipients → Ajay's accounts → Unipile webhook → Launchpad
 *
 * Config (all optional - missing env vars trigger stub-mode):
 *   UNIPILE_API_KEY              required for any live dispatch
 *   UNIPILE_DSN                  Unipile-assigned API base URL
 *                                (e.g. https://api1.unipile.com:13111)
 *   UNIPILE_WEBHOOK_SECRET       HMAC secret for inbound webhook auth
 *   UNIPILE_EMAIL_ACCOUNT_ID     per-channel account IDs - shown in
 *   UNIPILE_WHATSAPP_ACCOUNT_ID  Unipile's dashboard after you connect
 *   UNIPILE_LINKEDIN_ACCOUNT_ID  each account (Gmail OAuth, WA QR,
 *                                LinkedIn login)
 *
 * Stub-mode (no UNIPILE_API_KEY):
 *   - sendMessage() returns ok:true with stubbed:true
 *   - caller still records the outbound touch so the inbox feels real
 *   - good for dev + while the account is being onboarded
 *
 * Live-mode (UNIPILE_API_KEY set):
 *   - sendMessage() hits the Unipile API
 *   - errors bubble back to the caller with a structured reason
 *   - caller still records the touch so the dashboard is the source
 *     of truth (Unipile is just the transport)
 *
 * Unipile endpoint paths below are placeholders matching their
 * documented v1 shape at the time of writing. Verify against their
 * latest docs (https://developer.unipile.com/) once the account is
 * provisioned - they version their API so the structure is stable
 * but specific paths can shift.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export type UnipileChannel =
  | "email"
  | "whatsapp"
  | "twitter"
  | "linkedin"
  | "instagram"
  | "telegram";

/* The 4 channels the sales dashboard actively wires today. Adding
 * more (instagram, telegram) is just an env var + a new account
 * connection in Unipile - the adapter handles them transparently. */
export const ACTIVE_CHANNELS: UnipileChannel[] = [
  "email",
  "whatsapp",
  "twitter",
  "linkedin",
];

/* ── Config ────────────────────────────────────────────────────── */

function envAccountId(channel: UnipileChannel): string | undefined {
  switch (channel) {
    case "email":
      return process.env.UNIPILE_EMAIL_ACCOUNT_ID;
    case "whatsapp":
      return process.env.UNIPILE_WHATSAPP_ACCOUNT_ID;
    case "linkedin":
      return process.env.UNIPILE_LINKEDIN_ACCOUNT_ID;
    case "twitter":
      return process.env.UNIPILE_TWITTER_ACCOUNT_ID;
    case "instagram":
      return process.env.UNIPILE_INSTAGRAM_ACCOUNT_ID;
    case "telegram":
      return process.env.UNIPILE_TELEGRAM_ACCOUNT_ID;
  }
}

/* "Live" = we have everything needed to send on this channel: the
 * shared API key, the DSN, AND the per-channel account ID. Missing
 * any of those = stub-mode. */
export function isChannelLive(channel: UnipileChannel): boolean {
  return (
    !!process.env.UNIPILE_API_KEY &&
    !!process.env.UNIPILE_DSN &&
    !!envAccountId(channel)
  );
}

/* Summary the UI uses to render the per-channel status chip. Returns
 * a flat object keyed by channel so React components don't have to
 * hit process.env (they can't anyway - this runs server-side). */
export function channelStatuses(): Record<
  UnipileChannel,
  { live: boolean; missing: string[] }
> {
  const result = {} as Record<UnipileChannel, { live: boolean; missing: string[] }>;
  for (const channel of ACTIVE_CHANNELS) {
    const missing: string[] = [];
    if (!process.env.UNIPILE_API_KEY) missing.push("UNIPILE_API_KEY");
    if (!process.env.UNIPILE_DSN) missing.push("UNIPILE_DSN");
    if (!envAccountId(channel)) {
      missing.push(`UNIPILE_${channel.toUpperCase()}_ACCOUNT_ID`);
    }
    result[channel] = { live: missing.length === 0, missing };
  }
  return result;
}

/* ── Outbound send ─────────────────────────────────────────────── */

export interface SendInput {
  channel: UnipileChannel;
  /* recipient handle - shape varies by channel:
   *   email: 'foo@bar.com'
   *   whatsapp: '+447123456789' (E.164)
   *   linkedin: provider URN or profile URL
   *   twitter: @handle or user_id */
  recipient: string;
  body: string;
  subject?: string; // email only
}

export interface SendResult {
  ok: boolean;
  stubbed: boolean;
  providerMessageId?: string;
  error?: string;
}

export async function sendMessage(input: SendInput): Promise<SendResult> {
  if (!isChannelLive(input.channel)) {
    /* Stub-mode: log + return ok so callers continue recording the
     * outbound touch. Real dispatch happens when env vars are set. */
    console.info(
      `[unipile/stub] ${input.channel} → ${input.recipient}: ${input.body.slice(0, 80)}`,
    );
    return { ok: true, stubbed: true };
  }

  const apiKey = process.env.UNIPILE_API_KEY!;
  const dsn = process.env.UNIPILE_DSN!.replace(/\/+$/, "");
  const accountId = envAccountId(input.channel)!;

  /* Unipile's send endpoint - per their v1 docs, send shape is
   * channel-agnostic at the protocol level; the api routes the
   * payload to the right network based on account_id. Worth
   * double-checking against their latest docs once the account is
   * provisioned. */
  const url = `${dsn}/api/v1/messages`;
  const payload: Record<string, unknown> = {
    account_id: accountId,
    recipient: input.recipient,
    body: input.body,
  };
  if (input.subject) payload.subject = input.subject;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(
        `[unipile] send ${input.channel} failed: ${res.status} ${text.slice(0, 200)}`,
      );
      return {
        ok: false,
        stubbed: false,
        error: `Unipile responded ${res.status}: ${text.slice(0, 200)}`,
      };
    }
    const json = (await res.json().catch(() => ({}))) as {
      id?: string;
      message_id?: string;
    };
    return {
      ok: true,
      stubbed: false,
      providerMessageId: json.id ?? json.message_id,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[unipile] send ${input.channel} threw:`, message);
    return { ok: false, stubbed: false, error: message };
  }
}

/* ── Inbound webhook ───────────────────────────────────────────── */

/* Webhook auth. Unipile's dashboard doesn't expose webhook signing
 * (no HMAC option, no per-webhook secret) so the canonical approach
 * is a URL-secret: append ?key=<long-random> to the callback URL and
 * compare server-side. The URL itself becomes the bearer token -
 * equivalent security guarantee to HMAC for this use case since
 * the key never appears anywhere a third party would see (HTTPS
 * encrypts the URL path + query in transit, Unipile stores it
 * encrypted at rest).
 *
 * Two env vars supported, either is enough:
 *   UNIPILE_WEBHOOK_KEY     URL-secret (recommended; matches against
 *                           ?key=... on the callback URL)
 *   UNIPILE_WEBHOOK_SECRET  HMAC SHA256 secret (used IF Unipile ever
 *                           adds webhook signing later; checks
 *                           X-Unipile-Signature header)
 */
export interface UnipileAuthCheck {
  ok: boolean;
  reason?: string;
}

/* HMAC verifier - present for future-proofing if Unipile adds
 * webhook signing. Today it falls through to "no header" since they
 * don't sign. */
export function verifyUnipileSignature(
  rawBody: string,
  signatureHeader: string | null,
): UnipileAuthCheck {
  const secret = process.env.UNIPILE_WEBHOOK_SECRET;
  if (!secret) return { ok: false, reason: "no_hmac_secret_configured" };
  if (!signatureHeader) return { ok: false, reason: "missing_signature_header" };
  const provided = signatureHeader.replace(/^sha256=/i, "").trim();
  if (!/^[0-9a-f]+$/i.test(provided) || provided.length !== 64) {
    return { ok: false, reason: "invalid_signature_format" };
  }
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const providedBuf = Buffer.from(provided, "hex");
  if (expectedBuf.length !== providedBuf.length) {
    return { ok: false, reason: "signature_length_mismatch" };
  }
  return timingSafeEqual(expectedBuf, providedBuf)
    ? { ok: true }
    : { ok: false, reason: "signature_mismatch" };
}

/* URL-secret verifier. Constant-time compare against UNIPILE_WEBHOOK_KEY
 * env var. Fails CLOSED in production when the env var isn't set
 * (means the webhook URL is unprotected - rather drop messages than
 * accept unauthenticated ones). In dev we accept so local curl tests
 * keep working. */
export function verifyUnipileUrlKey(
  providedKey: string | null,
): UnipileAuthCheck {
  const expected = process.env.UNIPILE_WEBHOOK_KEY;
  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      return { ok: false, reason: "unipile_webhook_key_not_configured" };
    }
    return { ok: true };
  }
  if (!providedKey) return { ok: false, reason: "missing_key_query_param" };
  const expectedBuf = Buffer.from(expected, "utf8");
  const providedBuf = Buffer.from(providedKey, "utf8");
  if (expectedBuf.length !== providedBuf.length) {
    return { ok: false, reason: "key_length_mismatch" };
  }
  return timingSafeEqual(expectedBuf, providedBuf)
    ? { ok: true }
    : { ok: false, reason: "key_mismatch" };
}

/* Canonical normalised inbound shape - matches what processInboundMessage
 * in lib/sales-dashboard/inbound.ts expects. */
export interface NormalisedInbound {
  channel: UnipileChannel;
  from: string;
  body: string;
  external_id?: string;
  subject?: string;
  /* Optional historical timestamp - set by fetchChatHistory so backfilled
   * touches keep their original send time instead of "right now". Webhooks
   * leave this undefined (live messages are always "now"). */
  sent_at?: string;
  /* Direction the historical message went. Webhook-delivered messages
   * are always inbound (someone replied to us); history backfill needs
   * both so we don't lose outbound context (our own past messages). */
  direction?: "inbound" | "outbound";
}

/* ── Chat history backfill ─────────────────────────────────────── */

export interface BackfillResult {
  ok: boolean;
  messages: NormalisedInbound[];
  error?: string;
}

/* Pull conversation history for a specific recipient from Unipile.
 * Two-step against their API:
 *   1. GET /api/v1/chats?account_id=...  -- list chats on this account
 *   2. Find the chat whose attendee matches the recipient (WA phone,
 *      LinkedIn handle, etc.)
 *   3. GET /api/v1/chats/{chat_id}/messages?limit=100  -- pull history
 *
 * The caller dedupes against existing touches by external_id so this
 * is safe to re-run. */
export async function fetchChatHistory(
  channel: UnipileChannel,
  recipient: string,
  limit = 100,
): Promise<BackfillResult> {
  if (!isChannelLive(channel)) {
    return {
      ok: false,
      messages: [],
      error: `Channel ${channel} is not live (missing env vars)`,
    };
  }
  const apiKey = process.env.UNIPILE_API_KEY!;
  const dsn = process.env.UNIPILE_DSN!.replace(/\/+$/, "");
  const accountId = envAccountId(channel)!;

  try {
    /* Step 1: find the chat. Unipile lists chats per account; we
     * filter client-side by attendee match since their dashboard's
     * filter param isn't documented uniformly across channels. */
    const chatsRes = await fetch(
      `${dsn}/api/v1/chats?account_id=${encodeURIComponent(accountId)}&limit=200`,
      {
        method: "GET",
        headers: { "X-API-KEY": apiKey, Accept: "application/json" },
      },
    );
    if (!chatsRes.ok) {
      const text = await chatsRes.text().catch(() => "");
      return {
        ok: false,
        messages: [],
        error: `chats list failed: ${chatsRes.status} ${text.slice(0, 200)}`,
      };
    }
    const chatsJson = (await chatsRes.json().catch(() => ({}))) as {
      items?: Array<Record<string, unknown>>;
    };
    const chats = chatsJson.items ?? [];

    /* Match the recipient to a chat. WhatsApp recipients arrive as
     * "+447..."; Unipile sometimes stores them as "447...@s.whatsapp.net"
     * or similar - normalise to digits-only for the compare. */
    const recipientDigits = recipient.replace(/\D/g, "");
    const matched = chats.find((c) => {
      const attendeeId = String(
        c.attendee_id ?? c.attendee_provider_id ?? c.id ?? "",
      );
      const attendeeName = String(c.attendee_name ?? c.name ?? "");
      return (
        attendeeId.replace(/\D/g, "").includes(recipientDigits) ||
        attendeeName.replace(/\D/g, "").includes(recipientDigits)
      );
    });

    if (!matched) {
      return {
        ok: true,
        messages: [],
        error: `No chat found for ${recipient} on ${channel}`,
      };
    }

    /* Step 2: pull messages. */
    const chatId = String(matched.id);
    const msgsRes = await fetch(
      `${dsn}/api/v1/chats/${encodeURIComponent(chatId)}/messages?limit=${limit}`,
      {
        method: "GET",
        headers: { "X-API-KEY": apiKey, Accept: "application/json" },
      },
    );
    if (!msgsRes.ok) {
      const text = await msgsRes.text().catch(() => "");
      return {
        ok: false,
        messages: [],
        error: `chat messages failed: ${msgsRes.status} ${text.slice(0, 200)}`,
      };
    }
    const msgsJson = (await msgsRes.json().catch(() => ({}))) as {
      items?: Array<Record<string, unknown>>;
    };
    const rawMessages = msgsJson.items ?? [];

    /* Normalise each message into NormalisedInbound. Sender direction
     * is determined by Unipile's is_sender flag (true = we sent it,
     * false = they sent it). Different channels nest things slightly
     * differently so we sniff defensively. */
    const messages: NormalisedInbound[] = rawMessages
      .map((m) => normaliseHistoryMessage(channel, m, recipient))
      .filter((m): m is NormalisedInbound => m !== null);

    return { ok: true, messages };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, messages: [], error: message };
  }
}

/* ── Chat list (orphan inbox feed) ──
 *
 * Returns every chat for a given channel - the "Beeper feed" view.
 * Used by /api/sales/chats to render the unmatched inbox section
 * (chats that don't map to an existing Lead yet) and the matched
 * section (chats whose attendee phone / handle ties to a Lead). */

export interface ChatSummary {
  /* Unipile's internal chat id - used to pull messages later. */
  id: string;
  /* Attendee handle - normalised to phone digits for WhatsApp,
   * profile slug for LinkedIn, email for mail. Used to match
   * against Lead.phone / Lead.email. */
  attendee_handle: string;
  /* Human-readable name from Unipile (whatsapp profile name,
   * LinkedIn full name, etc). Used as the default Lead name on
   * promote-to-lead. */
  attendee_name?: string;
  /* Preview shown in the inbox conversation list - first 80 chars
   * of the most-recent message body. */
  last_message_preview?: string;
  /* ISO timestamp of the most recent message. Drives sort order. */
  last_message_at?: string;
  /* Direction of the most recent message - "outbound" means we
   * sent last (waiting on them), "inbound" means they sent last
   * (waiting on us / unread). Used for the "unread" indicator. */
  last_message_direction?: "inbound" | "outbound";
}

export interface ListChatsResult {
  ok: boolean;
  chats: ChatSummary[];
  error?: string;
}

/* List every chat on a given channel. Doesn't pull messages -
 * just the metadata for the inbox list view. Use fetchChatHistory
 * to pull a specific chat's messages once the user opens it. */
export async function listChats(
  channel: UnipileChannel,
  limit = 200,
): Promise<ListChatsResult> {
  if (!isChannelLive(channel)) {
    return {
      ok: false,
      chats: [],
      error: `Channel ${channel} is not live (missing env vars)`,
    };
  }
  const apiKey = process.env.UNIPILE_API_KEY!;
  const dsn = process.env.UNIPILE_DSN!.replace(/\/+$/, "");
  const accountId = envAccountId(channel)!;

  try {
    const res = await fetch(
      `${dsn}/api/v1/chats?account_id=${encodeURIComponent(accountId)}&limit=${limit}`,
      {
        method: "GET",
        headers: { "X-API-KEY": apiKey, Accept: "application/json" },
      },
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        chats: [],
        error: `chats list failed: ${res.status} ${text.slice(0, 200)}`,
      };
    }
    const json = (await res.json().catch(() => ({}))) as {
      items?: Array<Record<string, unknown>>;
    };
    const items = json.items ?? [];

    const chats: ChatSummary[] = items
      .map((c) => normaliseChatSummary(channel, c))
      .filter((c): c is ChatSummary => c !== null)
      /* Sort newest-first so unread / recent threads bubble to the
       * top of the inbox list, matching what users expect. */
      .sort((a, b) =>
        (b.last_message_at ?? "").localeCompare(a.last_message_at ?? ""),
      );

    return { ok: true, chats };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, chats: [], error: message };
  }
}

/* Convert one Unipile chat record into a ChatSummary, aligned to
 * their actual v1 response shape (verified live against Dylan's
 * account 2026-06-24):
 *
 *   id                          chat id
 *   name                        null for 1-on-1, set for groups
 *   type                        0 = 1-on-1, 1 = group, 2 = broadcast
 *   provider_id                 own-side WhatsApp JID
 *   attendee_provider_id        sometimes present (looks like ...@lid)
 *   attendee_public_identifier  the other party's JID (...@s.whatsapp.net)
 *   timestamp                   ISO of last activity
 *   unread_count                int
 *
 * Notably absent: no last_message_preview, no attendee_name. Unipile
 * doesn't return them on the chat list. To get message text we'd
 * have to call /chats/{id}/messages per chat - too expensive for the
 * inbox list view. We surface what we have + skip group chats since
 * those aren't leads. */
function normaliseChatSummary(
  channel: UnipileChannel,
  c: Record<string, unknown>,
): ChatSummary | null {
  const id = pickString(c, ["id", "chat_id"]);
  if (!id) return null;

  /* Drop group chats from the inbox - WhatsApp groups (type=1) are
   * almost always personal noise, not sales leads. Only 1-on-1
   * conversations flow through. */
  const type = typeof c.type === "number" ? c.type : 0;
  if (type !== 0) return null;

  /* For WhatsApp: prefer attendee_public_identifier (the other
   * party's JID), fall back to provider_id. Strip @s.whatsapp.net
   * + @lid suffix and keep only digits. The resulting phone (e.g.
   * "447712345678") is what we'll match against Lead.phone. */
  const rawHandle = pickString(c, [
    "attendee_public_identifier",
    "attendee_provider_id",
    "provider_id",
    "attendee_id",
    "attendee_email",
  ]);
  if (!rawHandle) return null;
  const attendee_handle =
    channel === "whatsapp"
      ? rawHandle.replace(/@.*$/, "").replace(/\D/g, "")
      : rawHandle;

  /* Name: only meaningful for groups (which we already filtered),
   * so for individuals fall back to a formatted phone preview. The
   * Lead promote flow uses this as the default Lead name, so
   * "+44 7712..." is more useful than empty. */
  const name = pickString(c, ["name"]);
  const attendee_name =
    name ??
    (channel === "whatsapp"
      ? formatPhonePreview(attendee_handle)
      : undefined);

  /* Use the chat's top-level timestamp - it tracks last-activity
   * regardless of who sent. Already ISO, no parsing needed. */
  const last_message_at = pickString(c, ["timestamp", "last_message_at"]);

  return {
    id,
    attendee_handle,
    attendee_name,
    /* No preview available from the chat list - leave undefined.
     * The list UI handles missing preview gracefully. */
    last_message_preview: undefined,
    last_message_at,
    last_message_direction: undefined,
  };
}

/* Format a digits-only phone as a readable preview. Tries to inject
 * a + before the country code so the UI shows "+44 7712 345 678"
 * style instead of a wall of digits. Best-effort - falls back to
 * the raw string if it doesn't look like a phone. */
function formatPhonePreview(digits: string): string {
  if (!digits || digits.length < 7) return digits;
  /* UK numbers come through as "447..." - re-add the leading + */
  if (digits.startsWith("44") && digits.length >= 11) {
    const cc = digits.slice(0, 2);
    const rest = digits.slice(2);
    return `+${cc} ${rest.slice(0, 4)} ${rest.slice(4, 7)} ${rest.slice(7)}`;
  }
  return `+${digits}`;
}

/* Convert a single Unipile chat message into our canonical shape,
 * aligned to their actual messages endpoint response (verified live
 * 2026-06-24):
 *
 *   text         message text, OR null for media-only messages
 *   is_sender    1 = we sent it, 0 = they sent it (INTEGER not boolean)
 *   is_event     1 = system event (kicked from group, etc), skip these
 *   timestamp    ISO string
 *   attachments  array of media attachments
 *   id           Unipile message id
 *
 * Media messages with text:null are kept as touches with an
 * "[Image]" / "[Attachment]" placeholder rather than dropped, so
 * the thread chronology stays intact and the user knows there was
 * a media exchange. */
function normaliseHistoryMessage(
  channel: UnipileChannel,
  m: Record<string, unknown>,
  fallbackFrom: string,
): NormalisedInbound | null {
  /* Skip system events - kicks, joins, name changes etc. */
  if (m.is_event === 1 || m.is_event === true) return null;

  let body = pickString(m, ["text", "body", "message", "content"]);

  /* Media-only message: text is null but there's an attachment.
   * Surface as a placeholder so the chronology is preserved. */
  if (!body && Array.isArray(m.attachments) && m.attachments.length > 0) {
    const first = m.attachments[0] as Record<string, unknown>;
    const type = typeof first.type === "string" ? first.type : "media";
    const label =
      type === "img"
        ? "Image"
        : type === "video"
          ? "Video"
          : type === "audio"
            ? "Voice note"
            : "Attachment";
    body = `[${label}]`;
  }

  if (!body) return null;

  /* Unipile uses integers 1/0 for is_sender (not booleans). Defend
   * against both shapes in case their type changes later. */
  const isSender =
    m.is_sender === 1 ||
    m.is_sender === true ||
    m.from_self === true ||
    m.sender === "self";

  const external_id = pickString(m, ["id", "provider_id", "message_id"]);
  const sent_at = pickString(m, ["timestamp", "sent_at", "created_at", "date"]);

  return {
    channel,
    from: fallbackFrom,
    body,
    external_id,
    sent_at,
    direction: isSender ? "outbound" : "inbound",
  };
}

/* Unipile's webhook payload nests differently per channel - email
 * carries headers + subject, WhatsApp carries phone + media, etc.
 * Normalise into our canonical shape here so the inbound route
 * handler stays channel-agnostic. Verify against the actual Unipile
 * payload schema once the first webhook lands. */
export function normalizeInboundPayload(
  channel: UnipileChannel,
  payload: unknown,
): NormalisedInbound | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;

  /* Common fields across Unipile's payloads. Their docs show a
   * "data" envelope around the actual message - peel one layer if
   * present, fall back to the root otherwise. */
  const data = (p.data && typeof p.data === "object" ? p.data : p) as Record<
    string,
    unknown
  >;

  const from = pickString(data, ["from", "sender", "from_handle", "from_email"]);
  const body = pickString(data, ["body", "text", "message", "content"]);
  const subject = pickString(data, ["subject"]);
  const external_id = pickString(data, ["id", "message_id", "external_id"]);

  if (!from || !body) return null;
  return { channel, from, body, external_id, subject };
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return undefined;
}
