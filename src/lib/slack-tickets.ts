/* ── Slack Ticket System ──
 * Maps Slack channels to clients. Stores tickets in Supabase.
 */

import { createStore } from "@/lib/supabase-store";

export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketStatus = "open" | "in_progress" | "quoted" | "resolved";
export type TicketType = "design" | "dev" | "cro" | "other" | "unassigned";

export interface Ticket {
  id: string;
  client_name: string;
  channel_id: string;
  channel_name: string;
  submitted_by: string;
  submitted_by_id: string;
  title: string;
  description: string;
  priority: TicketPriority;
  ticket_type: TicketType; // Set internally by team, not by client
  attachment_url: string;
  status: TicketStatus;
  assignee_id?: string; // Team member ID from settings
  notes: string; // internal notes
  clickup_task_id?: string; // Created on triage, not on submission
  deleted_at?: string; // Soft delete
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

export interface ChannelMapping {
  channel_id: string;
  client_name: string;
}

const ticketStore = createStore<Ticket>({
  table: "tickets",
  lsKey: "launchpad-tickets",
});

const mappingStore = createStore<ChannelMapping & { id: string }>({
  table: "channel_mappings",
  lsKey: "launchpad-channel-mappings",
});

/* ── Tickets ── */

export async function getTickets(): Promise<Ticket[]> {
  return ticketStore.getAll();
}

export async function getTicketsByClient(clientName: string): Promise<Ticket[]> {
  const all = await ticketStore.getAll();
  return all.filter((t) => t.client_name === clientName);
}

export async function saveTicket(ticket: Ticket): Promise<void> {
  const updated = { ...ticket, updated_at: new Date().toISOString() };

  // Direct Supabase upsert for reliability (bypass store's bulk saveAll)
  try {
    const { isSupabaseConfigured, supabase } = await import("@/lib/supabase");
    if (isSupabaseConfigured()) {
      const { id, ...rest } = updated;
      const { error } = await supabase.from("tickets").upsert({
        id,
        data: rest,
        created_at: ticket.created_at || new Date().toISOString(),
      });
      if (error) console.error("Ticket save error:", error.message);
    }
  } catch (err) {
    console.error("Ticket save exception:", err);
  }

  // Also update localStorage cache
  const all = await ticketStore.getAll();
  const idx = all.findIndex((t) => t.id === updated.id);
  if (idx >= 0) all[idx] = updated;
  else all.push(updated);
  if (typeof window !== "undefined") {
    localStorage.setItem("launchpad-tickets", JSON.stringify(all));
  }
}

export async function updateTicketStatus(id: string, status: TicketStatus): Promise<void> {
  const all = await ticketStore.getAll();
  const idx = all.findIndex((t) => t.id === id);
  if (idx >= 0) {
    all[idx] = {
      ...all[idx],
      status,
      updated_at: new Date().toISOString(),
      ...(status === "resolved" ? { resolved_at: new Date().toISOString() } : {}),
    };
    await ticketStore.saveAll(all);
  }
}

/* ── Channel Mappings ── */

export async function getChannelMappings(): Promise<ChannelMapping[]> {
  const all = await mappingStore.getAll();
  return all.map(({ channel_id, client_name }) => ({ channel_id, client_name }));
}

export async function getClientForChannel(channelId: string): Promise<string | null> {
  // First check explicit mappings
  const mappings = await mappingStore.getAll();
  const found = mappings.find((m) => m.channel_id === channelId);
  if (found) return found.client_name;

  // Then check portal slack_channel_url fields (contains channel ID in URL)
  try {
    const { isSupabaseConfigured, supabase } = await import("@/lib/supabase");
    if (isSupabaseConfigured()) {
      const { data } = await supabase
        .from("client_portals")
        .select("client_name, slack_channel_url")
        .is("deleted_at", null);
      if (data) {
        for (const portal of data) {
          const url = portal.slack_channel_url || "";
          // Slack channel URLs contain the channel ID, or the field might just be the channel ID
          if (url.includes(channelId) || url === channelId) {
            return portal.client_name;
          }
        }
      }
    }
  } catch { /* fall through */ }

  return null;
}

export async function saveChannelMapping(mapping: ChannelMapping): Promise<void> {
  const all = await mappingStore.getAll();
  const idx = all.findIndex((m) => m.channel_id === mapping.channel_id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...mapping };
  } else {
    all.push({ id: mapping.channel_id, ...mapping });
  }
  await mappingStore.saveAll(all);
}

export async function deleteChannelMapping(channelId: string): Promise<void> {
  const all = await mappingStore.getAll();
  await mappingStore.saveAll(all.filter((m) => m.channel_id !== channelId));
}

/* ── Helpers ── */

export const TICKET_STATUSES: { key: TicketStatus; label: string; color: string }[] = [
  { key: "open", label: "Open", color: "#EF4444" },
  { key: "in_progress", label: "In Progress", color: "#F59E0B" },
  { key: "quoted", label: "Quoted", color: "#8B5CF6" },
  { key: "resolved", label: "Resolved", color: "#10B981" },
];

export function ticketAge(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "< 1h";
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
