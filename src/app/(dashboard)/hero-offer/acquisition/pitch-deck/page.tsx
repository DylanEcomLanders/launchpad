"use client";

/* Pitch deck - the leave-behind PDF/link sent ahead of a sales call. */

import { DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import { ToolShell, DeckShell } from "@/lib/hero-offer/tool-shell";

export default function PitchDeckPage() {
  return (
    <ToolShell
      title="Pitch deck"
      blurb="The leave-behind deck. Self-explaining; sits in the prospect's inbox between calls."
      parentHref="/hero-offer/acquisition"
      parentLabel="Back to Acquisition"
      status="shell"
      accent="emerald"
      icon={<DocumentDuplicateIcon className="size-5" />}
    >
      <DeckShell
        accent="emerald"
        whenToSend="Sent ahead of a sales call (warm leads) or post-call as a 'send to the partner / co-founder' asset. Reads alone, no closer needed."
        notes={"Slide spine - same as sales deck but written for a cold reader:\n1. What we do (no jargon)\n2. The problem we solve\n3. The 3 tiers + what's included\n4. The guarantee\n5. Wins from like-for-like brands\n6. Process: how week one + first 90 days look\n7. How to engage us + price ranges"}
      />
    </ToolShell>
  );
}
