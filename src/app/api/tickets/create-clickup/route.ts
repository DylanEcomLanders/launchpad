import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const CLICKUP_TOKEN = process.env.CLICKUP_API_TOKEN || "";
const TICKET_LIST_ID = "901522309688"; // Project Delivery > Tickets

/**
 * Create a ClickUp task from a triaged ticket.
 * Called when ticket_type is set (design/dev) in Launchpad.
 * Assigns based on ticket type + portal team members.
 */
export async function POST(req: NextRequest) {
  try {
    const { ticketId } = await req.json();
    if (!ticketId || !CLICKUP_TOKEN) {
      return NextResponse.json({ error: "Missing ticketId or ClickUp token" }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }

    // Get the ticket
    const { data: ticketRows } = await supabase
      .from("tickets")
      .select("*")
      .eq("id", ticketId)
      .limit(1);

    const ticketRow = ticketRows?.[0];
    if (!ticketRow) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const ticket = ticketRow.data || ticketRow;
    const ticketType = ticket.ticket_type; // "design" | "dev" | etc.

    // Find the portal by channel_id
    let assignees: number[] = [];
    const channelId = ticket.channel_id;

    if (channelId) {
      const { data: portals } = await supabase
        .from("client_portals")
        .select("team_member_ids")
        .ilike("slack_channel_url", `%${channelId}%`)
        .is("deleted_at", null)
        .limit(1);

      if (portals?.[0]?.team_member_ids?.length) {
        // Get team directory
        const { data: settingsRows } = await supabase
          .from("business_settings")
          .select("data")
          .eq("id", "business-settings-singleton")
          .limit(1);

        const team = settingsRows?.[0]?.data?.team || [];

        // Match team members by role based on ticket type
        for (const memberId of portals[0].team_member_ids) {
          const member = team.find((m: { id: string; role?: string; clickup_id?: string }) => m.id === memberId);
          if (!member?.clickup_id) continue;

          const role = (member.role || "").toLowerCase();

          if (ticketType === "design" && (role.includes("design") || role.includes("coo") || role.includes("founder"))) {
            assignees.push(Number(member.clickup_id));
          } else if (ticketType === "dev" && (role.includes("develop") || role.includes("head of dev") || role.includes("coo") || role.includes("founder"))) {
            assignees.push(Number(member.clickup_id));
          } else if (ticketType === "cro" && (role.includes("cro") || role.includes("coo") || role.includes("founder"))) {
            assignees.push(Number(member.clickup_id));
          }
        }
      }
    }

    // Priority mapping
    const priorityMap: Record<string, number> = { urgent: 1, high: 2, medium: 3, low: 4 };

    // Create ClickUp task
    const res = await fetch(`https://api.clickup.com/api/v2/list/${TICKET_LIST_ID}/task`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: CLICKUP_TOKEN },
      body: JSON.stringify({
        name: `[${ticket.client_name || "Unknown"}] ${ticket.title}`,
        description: `${ticket.description || ""}${ticket.attachment ? `\n\nAttachment: ${ticket.attachment}` : ""}\n\n---\nType: ${ticketType}\nSubmitted by: ${ticket.submitted_by || "Unknown"}\nChannel: #${ticket.channel_name || "unknown"}\nTicket ID: ${ticket.id}`,
        priority: priorityMap[ticket.priority] || 3,
        tags: ["slack-ticket", ticketType || "unassigned"],
        ...(assignees.length > 0 ? { assignees } : {}),
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("ClickUp create failed:", err);
      return NextResponse.json({ error: "ClickUp creation failed" }, { status: 500 });
    }

    const task = await res.json();
    const taskId = task.id;

    // Update ticket with ClickUp task ID
    await supabase
      .from("tickets")
      .update({ data: { ...ticket, clickup_task_id: taskId } })
      .eq("id", ticketId);

    return NextResponse.json({ taskId });
  } catch (err: any) {
    console.error("Create ClickUp error:", err);
    return NextResponse.json({ error: err?.message || "Failed" }, { status: 500 });
  }
}
