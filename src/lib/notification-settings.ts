/**
 * Server-side notification settings check.
 * Reads from Supabase to determine if a notification type is enabled.
 */

import { supabase } from "@/lib/supabase";

type NotificationType = "payment_received" | "qa_gate_submitted" | "deadline_warnings" | "monday_breakdown" | "friday_digest";

export async function isNotificationEnabled(type: NotificationType): Promise<boolean> {
  try {
    const { data } = await supabase
      .from("business_settings")
      .select("data")
      .eq("id", "business-settings-singleton")
      .limit(1);

    const notifications = data?.[0]?.data?.notifications;
    if (!notifications) return true; // Default to enabled if not configured
    return notifications[type] ?? true;
  } catch {
    return true; // Default to enabled on error
  }
}
