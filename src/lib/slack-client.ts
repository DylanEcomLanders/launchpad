/* ── Slack read client ──
 * Wraps @slack/web-api for search + history reads.
 *
 * Auth notes:
 *  - SLACK_TOKEN is a user token (xoxp-...). Required for search.messages
 *    because bot tokens don't have search:read. Also works for everything
 *    else, so we use it as the default.
 *  - SLACK_BOT_TOKEN (xoxb-...) is used by src/lib/slack-bot.ts for posting
 *    messages and is the fallback for read calls if SLACK_TOKEN is missing.
 *    `searchMessages` will explicitly reject when only a bot token is
 *    available because search:read isn't a bot scope.
 */

import { WebClient } from "@slack/web-api";

let cached: { client: WebClient; isUserToken: boolean } | null = null;

function getClient(): { client: WebClient; isUserToken: boolean } {
  if (cached) return cached;
  const userToken = process.env.SLACK_TOKEN;
  const botToken = process.env.SLACK_BOT_TOKEN;
  const token = userToken || botToken;
  if (!token) {
    throw new Error("Missing SLACK_TOKEN (preferred) or SLACK_BOT_TOKEN env var");
  }
  cached = {
    client: new WebClient(token),
    isUserToken: !!userToken,
  };
  return cached;
}

/* ── User name resolution ──
 *
 * conversations.history returns user IDs (U073XYZ...), not names. Without
 * resolving these, an agent has no way to say "Alister posted X" — it's
 * forced to either invent names matching IDs, omit them, or just say "user
 * U073XYZ said X". We resolve once and cache for an hour so name changes
 * eventually propagate without forcing a redeploy / container recycle.
 */
const USER_CACHE_TTL_MS = 60 * 60_000;
let usersCache: { map: Map<string, SlackUser>; loadedAt: number } | null = null;

export interface SlackUser {
  id: string;
  /** Best-effort display name: real_name → display_name → name (handle). */
  name: string;
  is_bot?: boolean;
  is_deleted?: boolean;
}

async function loadUsers(): Promise<Map<string, SlackUser>> {
  const fresh = usersCache && Date.now() - usersCache.loadedAt < USER_CACHE_TTL_MS;
  if (fresh) return usersCache!.map;

  const { client } = getClient();
  const map = new Map<string, SlackUser>();
  let cursor: string | undefined;
  // Paginate fully — agency workspaces rarely exceed a few hundred users
  // but we cap at 10 pages (2000 users) as a safety belt against runaway loops.
  for (let i = 0; i < 10; i++) {
    const res = await client.users.list({ limit: 200, cursor });
    for (const u of res.members ?? []) {
      if (!u.id) continue;
      const name = u.profile?.real_name || u.profile?.display_name || u.name || u.id;
      map.set(u.id, { id: u.id, name, is_bot: u.is_bot, is_deleted: u.deleted });
    }
    cursor = res.response_metadata?.next_cursor;
    if (!cursor) break;
  }
  usersCache = { map, loadedAt: Date.now() };
  return map;
}

/** Resolve a user ID to a friendly name. Returns the ID itself if unknown. */
async function nameForUser(userId: string | undefined): Promise<string | undefined> {
  if (!userId) return undefined;
  const users = await loadUsers();
  return users.get(userId)?.name ?? userId;
}

/** Slack messages embed user mentions as `<@U073XYZ>` and channel
 * mentions as `<#C0XYZ|name>`. Replace with `@DisplayName` and
 * `#channel-name` so the model can reason about who was pinged. */
async function resolveMentionsInText(text: string): Promise<string> {
  if (!text) return text;
  const userMentions = Array.from(text.matchAll(/<@([A-Z0-9]+)>/g));
  if (userMentions.length === 0) return text.replace(/<#[A-Z0-9]+\|([^>]+)>/g, "#$1");

  const users = await loadUsers();
  let out = text;
  for (const m of userMentions) {
    const name = users.get(m[1])?.name ?? m[1];
    out = out.split(m[0]).join(`@${name}`);
  }
  out = out.replace(/<#[A-Z0-9]+\|([^>]+)>/g, "#$1");
  return out;
}

export interface SlackMessageHit {
  channel: string;
  channel_id?: string;
  /** Friendly sender name. Fall-through: search.messages.username (set
   * by Slack when available) → resolved real_name → raw user ID. */
  user?: string;
  user_id?: string;
  text: string;
  ts: string;
  at_iso: string;
  at_uk: string;
  permalink?: string;
}

export interface SearchOpts {
  query: string;
  count?: number;
}

export async function searchMessages(opts: SearchOpts): Promise<SlackMessageHit[]> {
  const { client, isUserToken } = getClient();
  if (!isUserToken) {
    // Bot tokens don't have search:read. Fail loudly so the calling tool
    // returns a clean error to the agent rather than a confusing 403.
    throw new Error(
      "search.messages requires a user token (xoxp-...). Set SLACK_TOKEN; SLACK_BOT_TOKEN can't do search."
    );
  }
  const res = await client.search.messages({ query: opts.query, count: Math.min(opts.count ?? 20, 100) });
  const allHits = res.messages?.matches ?? [];

  // Hard filter: drop any hit from a DM, group DM, or any channel that
  // isn't on our public/private allowlist. Slack's search returns hits
  // from EVERYTHING the user token can see — including DMs — so this
  // filter is the only thing standing between Felix and someone's
  // private conversations.
  const { allowedIds } = await loadChannels(client);
  const hits = allHits.filter((m) => {
    const ch = m.channel;
    if (!ch?.id) return false;
    if (ch.is_im || ch.is_mpim) return false;
    if (typeof ch.id === "string" && /^D[A-Z0-9]+$/.test(ch.id)) return false;
    return allowedIds.has(ch.id);
  });

  await loadUsers();
  return Promise.all(
    hits.map(async (m) => ({
      channel: m.channel?.name ?? m.channel?.id ?? "(unknown)",
      channel_id: m.channel?.id,
      // Slack's search.messages embeds m.username when available; that's
      // the most reliable name source for search hits. Fall back to the
      // users.list resolution if it's missing.
      user: m.username ?? (await nameForUser(m.user)) ?? m.user,
      user_id: m.user,
      text: await resolveMentionsInText(m.text ?? ""),
      ts: m.ts ?? "",
      at_iso: tsToIso(m.ts ?? ""),
      at_uk: tsToUk(m.ts ?? ""),
      permalink: m.permalink,
    }))
  );
}

export interface ChannelHistoryOpts {
  channel: string;
  limit?: number;
  since?: Date;
}

export interface HistoryMessage {
  user?: string;
  user_id?: string;
  text: string;
  ts: string;
  at_iso: string;
  at_uk: string;
  thread_ts?: string;
  reply_count?: number;
  subtype?: string;
}

export async function recentMessagesInChannel(opts: ChannelHistoryOpts): Promise<HistoryMessage[]> {
  const { client } = getClient();
  const channelId = await resolveChannel(client, opts.channel);
  const oldest = opts.since ? (opts.since.getTime() / 1000).toFixed(6) : undefined;
  const res = await client.conversations.history({
    channel: channelId,
    limit: Math.min(opts.limit ?? 30, 200),
    oldest,
  });
  const messages = res.messages ?? [];
  await loadUsers();
  return Promise.all(
    messages.map(async (m) => ({
      user: (await nameForUser(m.user)) ?? m.user,
      user_id: m.user,
      text: await resolveMentionsInText(m.text ?? ""),
      ts: m.ts ?? "",
      at_iso: tsToIso(m.ts ?? ""),
      at_uk: tsToUk(m.ts ?? ""),
      thread_ts: m.thread_ts,
      reply_count: m.reply_count,
      subtype: m.subtype,
    }))
  );
}

/** Replies to a specific thread. Slack's conversations.history returns
 * only top-level messages by default — to see what's been said inside a
 * thread you need conversations.replies with the parent message's ts. */
export interface ThreadRepliesOpts {
  channel: string;
  thread_ts: string;
  limit?: number;
}

export async function threadReplies(opts: ThreadRepliesOpts): Promise<HistoryMessage[]> {
  const { client } = getClient();
  const channelId = await resolveChannel(client, opts.channel);
  const res = await client.conversations.replies({
    channel: channelId,
    ts: opts.thread_ts,
    limit: Math.min(opts.limit ?? 50, 200),
  });
  const messages = res.messages ?? [];
  await loadUsers();
  return Promise.all(
    messages.map(async (m) => {
      // conversations.replies' typed shape (MessageElement) doesn't model
      // subtype, but the runtime payload does include it for system events
      // (joins, etc.). Cast through unknown so we can still filter them.
      const subtype = (m as unknown as { subtype?: string }).subtype;
      return {
        user: (await nameForUser(m.user)) ?? m.user,
        user_id: m.user,
        text: await resolveMentionsInText(m.text ?? ""),
        ts: m.ts ?? "",
        at_iso: tsToIso(m.ts ?? ""),
        at_uk: tsToUk(m.ts ?? ""),
        thread_ts: m.thread_ts,
        reply_count: m.reply_count,
        subtype,
      };
    })
  );
}

function tsToIso(ts: string): string {
  const seconds = Number(ts.split(".")[0]);
  if (!Number.isFinite(seconds)) return "";
  return new Date(seconds * 1000).toISOString();
}

function tsToUk(ts: string): string {
  const seconds = Number(ts.split(".")[0]);
  if (!Number.isFinite(seconds)) return "";
  return new Date(seconds * 1000).toLocaleString("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function aliasMap(): Record<string, string> {
  const map: Record<string, string> = {};
  if (process.env.SLACK_OPS_CHANNEL_ID) map.ops = process.env.SLACK_OPS_CHANNEL_ID;
  return map;
}

/** Channel-list cache. conversations.list is paginated and the cap of
 * 500 per page wasn't enough for an agency with 100+ client channels.
 * We now paginate fully (capped at 10 pages = 5000 channels) and cache
 * the result for an hour so back-to-back tool calls share the result.
 *
 * Only public and private channels are loaded — no DMs, no group DMs.
 * The set of allowed channel IDs is exported so downstream tools (notably
 * slack_search_messages) can hard-filter results to channels that
 * appear here. Any channel ID NOT in this set is treated as off-limits. */
const CHANNELS_CACHE_TTL_MS = 60 * 60_000;

export interface SlackChannel {
  id: string;
  name: string;
  is_private?: boolean;
  is_member?: boolean;
  num_members?: number;
}

interface ChannelsCache {
  full: SlackChannel[];
  byName: Map<string, string>;
  /** Allowlist of channel IDs that are public/private channels. Used to
   * reject DM and group-DM IDs at every entry point. */
  allowedIds: Set<string>;
  loadedAt: number;
}

let channelsCache: ChannelsCache | null = null;

async function loadChannels(client: WebClient): Promise<ChannelsCache> {
  const fresh = channelsCache && Date.now() - channelsCache.loadedAt < CHANNELS_CACHE_TTL_MS;
  if (fresh) return channelsCache!;

  const full: SlackChannel[] = [];
  const byName = new Map<string, string>();
  const allowedIds = new Set<string>();
  let cursor: string | undefined;
  for (let i = 0; i < 10; i++) {
    const list = await client.conversations.list({
      limit: 500,
      exclude_archived: true,
      types: "public_channel,private_channel",
      cursor,
    });
    for (const c of list.channels ?? []) {
      if (!c.name || !c.id) continue;
      // Belt-and-braces: even with types: filter, double-check we're not
      // somehow seeing a DM or group DM here.
      if (c.is_im || c.is_mpim) continue;
      full.push({
        id: c.id,
        name: c.name,
        is_private: c.is_private,
        is_member: c.is_member,
        num_members: c.num_members,
      });
      byName.set(c.name, c.id);
      allowedIds.add(c.id);
    }
    cursor = list.response_metadata?.next_cursor;
    if (!cursor) break;
  }
  channelsCache = { full, byName, allowedIds, loadedAt: Date.now() };
  return channelsCache;
}

/** Public guard so other modules / callers can sanity-check a channel ID
 * before doing anything with it. Returns true only for IDs that came
 * from our public/private-channel-only conversations.list. */
async function isAllowedChannelId(id: string): Promise<boolean> {
  if (!id) return false;
  // Hard reject D-prefix (1:1 DMs) without even hitting Slack — these
  // can never be allowed under our policy.
  if (/^D[A-Z0-9]+$/.test(id)) return false;
  const { client } = getClient();
  const { allowedIds } = await loadChannels(client);
  return allowedIds.has(id);
}

/** Public helper for the slack_list_channels tool. Returns every channel
 * the auth token can see, ordered by membership status (ones Felix can
 * actually read first) then alphabetically. */
export async function listAccessibleChannels(): Promise<SlackChannel[]> {
  const { client } = getClient();
  const { full } = await loadChannels(client);
  return [...full].sort((a, b) => {
    if (!!a.is_member !== !!b.is_member) return a.is_member ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

/** DM / group-DM refusal message — same wording everywhere so tool
 * results are predictable and Felix's prompt can train against it. */
const DM_REFUSED_ERROR =
  "DMs and group DMs are off-limits to Felix. He can only read public and private channels (the internal-* and external-* lanes). Refuse if asked to read a DM.";

async function resolveChannel(client: WebClient, raw: string): Promise<string> {
  const trimmed = raw.replace(/^#/, "").trim();

  // Hard refuse 1:1 DM IDs (D-prefix) before we hit Slack at all.
  if (/^D[A-Z0-9]+$/.test(trimmed)) {
    throw new Error(DM_REFUSED_ERROR);
  }

  // For other channel-ID-shaped inputs, validate against the allowlist
  // built from public/private channels only. Group DMs (mpim) can have
  // C-shaped IDs in modern Slack workspaces, so the prefix isn't enough
  // — the allowlist is the source of truth.
  if (/^[CG][A-Z0-9]{8,}$/.test(trimmed)) {
    const ok = await isAllowedChannelId(trimmed);
    if (!ok) {
      throw new Error(DM_REFUSED_ERROR);
    }
    return trimmed;
  }

  const aliased = aliasMap()[trimmed.toLowerCase()];
  if (aliased) {
    // Aliases come from env (SLACK_OPS_CHANNEL_ID etc) — should always
    // be a normal channel, but verify anyway.
    const ok = await isAllowedChannelId(aliased);
    if (!ok) throw new Error(DM_REFUSED_ERROR);
    return aliased;
  }

  const { byName } = await loadChannels(client);
  const id = byName.get(trimmed);
  if (!id) {
    throw new Error(
      `Slack channel "${raw}" not found. The user/bot token must be a member of the channel for it to appear. Configured aliases: ${Object.keys(aliasMap()).join(", ") || "(none)"}.`
    );
  }
  return id;
}
