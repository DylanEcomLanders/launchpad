/* ── Channel-status reflector ──
 *
 * GET /api/sales/channel-status
 *
 * Returns the live/stubbed state of every Unipile-bridged channel so
 * the dashboard can render a per-channel chip without leaking the env
 * vars to the client. Reads server-side, returns a flat structured
 * summary.
 *
 * Response shape:
 *   {
 *     channels: {
 *       email: { live: false, missing: ["UNIPILE_API_KEY", ...] },
 *       whatsapp: { live: true, missing: [] },
 *       ...
 *     }
 *   }
 *
 * The chip on the dashboard uses `live` for the dot colour and
 * `missing` for the tooltip ("missing: UNIPILE_API_KEY"). */

import { NextResponse } from "next/server";
import { channelStatuses } from "@/lib/sales-dashboard/unipile-adapter";

export async function GET() {
  return NextResponse.json({ channels: channelStatuses() });
}
