"use client";

/* ── Channel status chip ──
 *
 * Sits in the /sales header showing the per-channel state of the
 * Unipile bridge. One dot per channel - green when wired (real send),
 * amber when stubbed (logs + records touch but no actual dispatch).
 * Tooltip lists the missing env vars so Dylan knows exactly what to
 * add when he provisions Unipile.
 *
 * Fetches /api/sales/channel-status on mount + every 30s so changes
 * to env vars (after a redeploy) surface without a hard refresh.
 */

import { useEffect, useState } from "react";

type Channel = "email" | "whatsapp" | "twitter" | "linkedin";
const CHANNEL_ORDER: Channel[] = ["email", "whatsapp", "linkedin", "twitter"];
const CHANNEL_LABEL: Record<Channel, string> = {
  email: "Email",
  whatsapp: "WhatsApp",
  linkedin: "LinkedIn",
  twitter: "X",
};

interface ChannelStatus {
  live: boolean;
  missing: string[];
}

export function ChannelStatusChip() {
  const [statuses, setStatuses] = useState<Record<Channel, ChannelStatus> | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/sales/channel-status", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          channels: Record<Channel, ChannelStatus>;
        };
        if (!cancelled) setStatuses(data.channels);
      } catch {
        /* silent - the chip is informational, not load-bearing. */
      }
    }
    load();
    const id = window.setInterval(load, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (!statuses) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-border text-[11px] text-subtle">
        <span className="size-1.5 rounded-full bg-border" />
        Channels loading
      </div>
    );
  }

  const liveCount = CHANNEL_ORDER.filter((c) => statuses[c]?.live).length;
  const allStubbed = liveCount === 0;

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-border">
      {CHANNEL_ORDER.map((c) => {
        const s = statuses[c];
        const live = s?.live ?? false;
        const tooltip = live
          ? `${CHANNEL_LABEL[c]} · live`
          : `${CHANNEL_LABEL[c]} · stub${
              s?.missing?.length ? ` (missing: ${s.missing.join(", ")})` : ""
            }`;
        return (
          <span
            key={c}
            title={tooltip}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium"
            style={{ color: live ? "#10B981" : "#9CA3AF" }}
          >
            <span
              className="size-1.5 rounded-full"
              style={{ background: live ? "#10B981" : "#F59E0B" }}
            />
            {CHANNEL_LABEL[c]}
          </span>
        );
      })}
      <span className="text-[10px] text-border ml-1">
        {allStubbed ? "all stubbed" : `${liveCount}/${CHANNEL_ORDER.length} live`}
      </span>
    </div>
  );
}
