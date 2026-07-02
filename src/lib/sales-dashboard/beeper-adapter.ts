/* ── Beeper Desktop API adapter ──
 *
 * Talks to the local Beeper Desktop API exposed at BEEPER_API_URL
 * (default http://127.0.0.1:23373). One backend, all chat networks
 * Ajay has connected in Beeper: WhatsApp, iMessage, Telegram, Slack,
 * Discord, X, Signal, LinkedIn etc.
 *
 * Why Beeper instead of Unipile:
 *   - Real saved contact names baked into chat.title (Unipile only
 *     gave us phone digits unless we hit per-chat attendees endpoint)
 *   - Profile pics via chat.imgURL
 *   - Server-side search via /v1/messages/search
 *   - All networks Ajay uses, not just WhatsApp/LinkedIn/email
 *   - No monthly cost
 *
 * Constraint: Beeper Desktop must be running on a Mac somewhere
 * (initially Dylan's, eventually Ajay's). API is local-only unless
 * "Remote Access" is enabled in Beeper Desktop settings - then it's
 * exposed publicly so Vercel-hosted launchpad can reach it.
 *
 * Auth: Bearer token from Beeper Desktop → Settings → Developers →
 * Approved connections. Token format: bdapi_*
 */

/* ── Config ────────────────────────────────────────────────────── */

export function isBeeperLive(): boolean {
  return !!(process.env.BEEPER_API_URL && process.env.BEEPER_API_TOKEN);
}

function beeperFetch(path: string, init?: RequestInit) {
  const base = (process.env.BEEPER_API_URL ?? "http://127.0.0.1:23373").replace(
    /\/+$/,
    "",
  );
  const token = process.env.BEEPER_API_TOKEN!;
  return fetch(`${base}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });
}

/* ── Types matching Beeper's OpenAPI schemas ───────────────────── */

export interface BeeperChat {
  id: string;
  accountID: string;
  network: string;          // "WhatsApp", "LinkedIn" etc - human readable
  title: string;            // contact name OR group name - already resolved
  description?: string | null;
  imgURL?: string | null;   // local filesystem path to avatar
  type: "single" | "group";
  isReadOnly: boolean;
  isArchived?: boolean;
  isMuted?: boolean;
  isPinned?: boolean;
  unreadCount?: number;
  lastActivity?: string;    // ISO timestamp
  participants?: {
    items?: Array<{ id: string; name?: string }>;
    hasMore?: boolean;
  };
}

export interface BeeperMessage {
  id: string;
  chatID: string;
  accountID: string;
  text?: string;
  isSender: boolean;
  isUnread?: boolean;
  isDeleted?: boolean;
  timestamp: string;
  editedTimestamp?: string | null;
  senderID?: string;
  senderName?: string;
  type?: string;            // "message" / "event" etc
  attachments?: Array<{
    id?: string;
    type?: string;          // "img" / "video" / "audio" / "file"
    mimeType?: string;
    srcURL?: string;        // mxc:// or localmxc:// - serve via /v1/assets/serve
    width?: number;
    height?: number;
    size?: number;
  }>;
}

/* ── Chats ─────────────────────────────────────────────────────── */

export interface ListChatsBeeperResult {
  ok: boolean;
  chats: BeeperChat[];
  error?: string;
}

/* Paginate GET /v1/chats up to maxChats. Beeper uses cursor +
 * direction=before|after; default before (older). */
export async function listChatsBeeper(
  maxChats = 500,
): Promise<ListChatsBeeperResult> {
  if (!isBeeperLive()) {
    return {
      ok: false,
      chats: [],
      error: "Beeper not configured (missing BEEPER_API_URL or BEEPER_API_TOKEN)",
    };
  }
  try {
    const items: BeeperChat[] = [];
    let cursor: string | undefined;
    let pages = 0;
    const maxPages = Math.ceil(maxChats / 50) + 2;
    while (items.length < maxChats && pages < maxPages) {
      const qs = cursor
        ? `?cursor=${encodeURIComponent(cursor)}&direction=before`
        : "";
      const res = await beeperFetch(`/v1/chats${qs}`);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        if (items.length === 0) {
          return {
            ok: false,
            chats: [],
            error: `beeper /v1/chats ${res.status}: ${text.slice(0, 200)}`,
          };
        }
        break;
      }
      /* Beeper returns { items, hasMore, oldestCursor, newestCursor }
       * — paginate older via oldestCursor + direction=before. */
      const json = (await res.json().catch(() => ({}))) as {
        items?: BeeperChat[];
        hasMore?: boolean;
        oldestCursor?: string;
      };
      const page = json.items ?? [];
      items.push(...page);
      if (!json.hasMore || !json.oldestCursor || page.length === 0) break;
      cursor = json.oldestCursor;
      pages++;
    }
    /* Newest-first by lastActivity. */
    items.sort((a, b) =>
      (b.lastActivity ?? "").localeCompare(a.lastActivity ?? ""),
    );
    return { ok: true, chats: items };
  } catch (err) {
    return {
      ok: false,
      chats: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/* ── Messages ──────────────────────────────────────────────────── */

export interface PreviewChatBeeperResult {
  ok: boolean;
  chat?: BeeperChat;
  messages: BeeperMessage[];
  error?: string;
}

/* Get full thread for a chat. Paginated; default 500 messages. */
export async function previewChatBeeper(
  chatId: string,
  maxMessages = 500,
): Promise<PreviewChatBeeperResult> {
  if (!isBeeperLive()) {
    return {
      ok: false,
      messages: [],
      error: "Beeper not configured",
    };
  }
  try {
    /* Fetch chat metadata in parallel with first message page. */
    const [chatRes, messages] = await Promise.all([
      beeperFetch(`/v1/chats/${encodeURIComponent(chatId)}`),
      paginateMessages(chatId, maxMessages),
    ]);
    let chat: BeeperChat | undefined;
    if (chatRes.ok) {
      chat = (await chatRes.json().catch(() => undefined)) as BeeperChat | undefined;
    }
    if (!messages.ok) {
      return {
        ok: false,
        chat,
        messages: [],
        error: messages.error,
      };
    }
    /* Beeper returns newest-first per page. We want oldest-first for
     * display so flip after collecting. */
    const sorted = [...messages.items].sort((a, b) =>
      (a.timestamp ?? "").localeCompare(b.timestamp ?? ""),
    );
    return { ok: true, chat, messages: sorted };
  } catch (err) {
    return {
      ok: false,
      messages: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function paginateMessages(
  chatId: string,
  maxMessages: number,
): Promise<{ ok: boolean; items: BeeperMessage[]; error?: string }> {
  const items: BeeperMessage[] = [];
  let cursor: string | undefined;
  let pages = 0;
  /* Beeper doesn't expose a configurable limit on this endpoint -
   * server-decided page size, walk via oldestCursor until hasMore
   * goes false. Cap by pages so a runaway chat can't loop forever. */
  const maxPages = Math.ceil(maxMessages / 50) + 4;
  while (items.length < maxMessages && pages < maxPages) {
    const qs = cursor
      ? `?cursor=${encodeURIComponent(cursor)}&direction=before`
      : "";
    const res = await beeperFetch(
      `/v1/chats/${encodeURIComponent(chatId)}/messages${qs}`,
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (items.length === 0) {
        return {
          ok: false,
          items: [],
          error: `beeper messages ${res.status}: ${text.slice(0, 200)}`,
        };
      }
      break;
    }
    const json = (await res.json().catch(() => ({}))) as {
      items?: BeeperMessage[];
      hasMore?: boolean;
      oldestCursor?: string;
    };
    const page = json.items ?? [];
    items.push(...page);
    if (!json.hasMore || !json.oldestCursor || page.length === 0) break;
    cursor = json.oldestCursor;
    pages++;
  }
  return { ok: true, items };
}

/* ── Chat actions: read + archive ──────────────────────────────── */

export async function markBeeperChatRead(
  chatId: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!isBeeperLive()) return { ok: false, error: "Beeper not configured" };
  try {
    const res = await beeperFetch(
      `/v1/chats/${encodeURIComponent(chatId)}/read`,
      { method: "POST", body: "{}" },
    );
    if (!res.ok) {
      return { ok: false, error: `beeper read ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function archiveBeeperChat(
  chatId: string,
  archived = true,
): Promise<{ ok: boolean; error?: string }> {
  if (!isBeeperLive()) return { ok: false, error: "Beeper not configured" };
  try {
    const res = await beeperFetch(
      `/v1/chats/${encodeURIComponent(chatId)}/archive`,
      { method: "POST", body: JSON.stringify({ archived }) },
    );
    if (!res.ok) {
      return { ok: false, error: `beeper archive ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/* ── Send ──────────────────────────────────────────────────────── */

export async function sendBeeperMessage(
  chatId: string,
  body: string,
): Promise<{ ok: boolean; pendingMessageID?: string; error?: string }> {
  if (!isBeeperLive()) return { ok: false, error: "Beeper not configured" };
  try {
    const res = await beeperFetch(
      `/v1/chats/${encodeURIComponent(chatId)}/messages`,
      {
        method: "POST",
        body: JSON.stringify({ text: body }),
      },
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        error: `beeper send ${res.status}: ${text.slice(0, 200)}`,
      };
    }
    const json = (await res.json().catch(() => ({}))) as {
      pendingMessageID?: string;
    };
    return { ok: true, pendingMessageID: json.pendingMessageID };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/* ── Assets (images / attachments) ─────────────────────────────── */

/* Pipe an asset (avatar OR message attachment) through to our caller.
 * Beeper serves the asset bytes via /v1/assets/serve - takes the
 * mxc://, localmxc://, or file:// URL as the `url` query param
 * (per their OpenAPI spec). */
export async function fetchBeeperAsset(
  src: string,
): Promise<{ ok: boolean; bytes?: ArrayBuffer; contentType?: string; error?: string }> {
  if (!isBeeperLive()) return { ok: false, error: "Beeper not configured" };
  try {
    const res = await beeperFetch(
      `/v1/assets/serve?url=${encodeURIComponent(src)}`,
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        error: `beeper asset ${res.status}: ${text.slice(0, 200)}`,
      };
    }
    const bytes = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") ?? "application/octet-stream";
    return { ok: true, bytes, contentType };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/* ── Search ────────────────────────────────────────────────────── */

export interface BeeperSearchResult {
  ok: boolean;
  results: Array<{ chat: BeeperChat; message: BeeperMessage }>;
  error?: string;
}

export async function searchBeeperMessages(
  query: string,
  limit = 50,
): Promise<BeeperSearchResult> {
  if (!isBeeperLive()) return { ok: false, results: [], error: "Beeper not configured" };
  try {
    const res = await beeperFetch(
      `/v1/messages/search?query=${encodeURIComponent(query)}&limit=${limit}`,
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        results: [],
        error: `beeper search ${res.status}: ${text.slice(0, 200)}`,
      };
    }
    const json = (await res.json().catch(() => ({}))) as {
      items?: Array<{ chat: BeeperChat; message: BeeperMessage }>;
    };
    return { ok: true, results: json.items ?? [] };
  } catch (err) {
    return {
      ok: false,
      results: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
