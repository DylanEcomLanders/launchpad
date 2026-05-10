"use client";

import Image from "next/image";
import type { Agent, AgentStatus } from "@/lib/agents/types";

interface PixelPortraitProps {
  /** Either pass a full agent (preferred — enables status-driven sprite swap
   * and ambient animation) or just src+alt for static use (e.g. a chat bubble
   * avatar where animation would be distracting). */
  agent?: Agent;
  src?: string;
  alt?: string;
  /** Force a status when only src/alt is passed. Defaults to no animation. */
  status?: AgentStatus;
  /** Rendered size in CSS pixels. The source asset stays low-res. */
  size?: number;
  /** Disable the ambient idle/working bob — use for the chat bubble avatars
   * and the recent-activity feed where 10 bobbing NPCs is visual noise. */
  static?: boolean;
  className?: string;
}

/* Cheap deterministic hash so each agent gets a stable per-instance bob
 * offset. Same id always returns the same number — no hydration mismatch. */
function hashOffset(id: string, modSeconds: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  const norm = Math.abs(h % 1000) / 1000; // 0–1
  return Math.round(norm * modSeconds * 100) / 100;
}

export function PixelPortrait({
  agent,
  src,
  alt,
  status,
  size = 64,
  static: isStatic = false,
  className = "",
}: PixelPortraitProps) {
  const resolvedStatus: AgentStatus | undefined = status ?? agent?.status;
  const useWorking = resolvedStatus === "WORKING" && !!agent?.workingAvatarUrl;
  const resolvedSrc = useWorking ? agent!.workingAvatarUrl! : (src ?? agent?.avatarUrl ?? "");
  const resolvedAlt = alt ?? agent?.name ?? "agent";

  // Pick animation class. OFFLINE stays still. BLOCKED stays still (signals
  // something's wrong, shouldn't be cheerfully bobbing). IDLE bobs gently.
  // WORKING bobs faster.
  let animClass = "";
  if (!isStatic && resolvedStatus) {
    if (resolvedStatus === "IDLE") animClass = "agent-anim-idle";
    if (resolvedStatus === "WORKING") animClass = "agent-anim-working";
  }

  // Stagger ambient idle bob across NPCs so they look alive, not synchronised.
  const animationDelay = !isStatic && agent && resolvedStatus === "IDLE"
    ? `-${hashOffset(agent.id, 2.6)}s`
    : undefined;

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-md ${animClass} ${className}`}
      style={{ width: size, height: size, imageRendering: "pixelated", animationDelay }}
    >
      <Image
        src={resolvedSrc}
        alt={resolvedAlt}
        width={size}
        height={size}
        unoptimized
        priority={size >= 128}
        style={{ imageRendering: "pixelated", width: "100%", height: "100%" }}
      />
    </div>
  );
}
