"use client";

/* Day-90 deck - "the wins so far + next quarter's plan". */

import { ChartBarIcon } from "@heroicons/react/24/outline";
import { ToolShell, DeckShell } from "@/lib/hero-offer/tool-shell";

export default function Day90DeckPage() {
  return (
    <ToolShell
      title="Day 90 deck"
      blurb="The first-quarter review: the wins, the pattern that's forming, the case for continuing."
      parentHref="/hero-offer/retention"
      parentLabel="Back to Retention"
      status="shell"
      accent="sky"
      icon={<ChartBarIcon className="size-5" />}
    >
      <DeckShell
        accent="sky"
        whenToSend="Day 88-92. The minimum-term renewal moment. CSM + strategist co-present. End on the explicit renewal ask."
        notes={"Slide spine:\n1. Cover: client + 'the first 90 days'\n2. The wins (specific tests called, headline uplift, revenue impact)\n3. The pattern forming - what we've learned about THIS brand's funnel\n4. The roadmap for next quarter (refreshed ICE list)\n5. The expansion conversation (if signals are there - tier upgrade, second pod)\n6. Continuation: rolling month-to-month from here\n7. Explicit ask: 'can we keep going?'"}
      />
    </ToolShell>
  );
}
