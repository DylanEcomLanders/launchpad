"use client";

/* Day-30 deck - "what we've shipped in your first month". */

import { GiftIcon } from "@heroicons/react/24/outline";
import { ToolShell, DeckShell } from "@/lib/hero-offer/tool-shell";

export default function Day30DeckPage() {
  return (
    <ToolShell
      title="Day 30 deck"
      blurb="The first-month retro: what we shipped, what we learned, what's coming next."
      parentHref="/hero-offer/retention"
      parentLabel="Back to Retention"
      status="shell"
      accent="sky"
      icon={<GiftIcon className="size-5" />}
    >
      <DeckShell
        accent="sky"
        whenToSend="Day 28-32 of an engagement. CSM screen-shares on the Day 30 retro call. Client gets the deck link after."
        notes={"Slide spine:\n1. Cover: client + 'first 30 days'\n2. What we shipped (pages live, tests live)\n3. What we learned (first signal, any winners called)\n4. Headline: the early CR / AOV movement (with caveat)\n5. Where the next 60 days are heading (refreshed roadmap)\n6. Asks: anything we need from them\n7. The renewal clock - 90-day minimum reminder"}
      />
    </ToolShell>
  );
}
