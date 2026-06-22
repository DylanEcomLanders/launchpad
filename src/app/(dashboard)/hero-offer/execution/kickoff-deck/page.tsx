"use client";

/* Kickoff deck - first-week presentation for new clients. */

import { RocketLaunchIcon } from "@heroicons/react/24/outline";
import { ToolShell, DeckShell } from "@/lib/hero-offer/tool-shell";

export default function KickoffDeckPage() {
  return (
    <ToolShell
      title="Kickoff deck"
      blurb="First-week presentation. Anchors the engagement: who's involved, what the cadence is, what week-one + the first 90 days look like."
      parentHref="/hero-offer/execution"
      parentLabel="Back to Execution"
      status="shell"
      accent="cyan"
      icon={<RocketLaunchIcon className="size-5" />}
    >
      <DeckShell
        accent="cyan"
        whenToSend="Day 1-3 of a new engagement. CSM screen-shares on the kickoff call. Client gets the deck link after for reference."
        notes={"Slide spine:\n1. Welcome - the pod meeting them, by face\n2. The Conversion Engine - one-slide refresher\n3. The 90-day plan: discovery → first roadmap → first test\n4. Cadence: standup, weekly call, weekly report\n5. Communication channel + SLA\n6. What we need from you (access, decision-maker, response time)\n7. The guarantee + how we'll know we hit it\n8. Q&A + next call"}
      />
    </ToolShell>
  );
}
