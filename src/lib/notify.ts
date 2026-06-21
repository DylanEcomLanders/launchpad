/* ── Notify helper ──
 *
 * Wraps /api/notify/slack so any client surface can fire a
 * notification without thinking about transport. Returns the API
 * response shape; callers can fire-and-forget or await.
 */

export interface NotifyPayload {
  channel?: string;
  text: string;
}

export async function notifySlack(payload: NotifyPayload): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/notify/slack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/* GET the current Slack config - used by the Ops hub to show a
 * "connected / stubbed" badge. */
export async function notifyStatus(): Promise<{ configured: boolean; default_channel: string | null }> {
  try {
    const res = await fetch("/api/notify/slack");
    return await res.json();
  } catch {
    return { configured: false, default_channel: null };
  }
}
