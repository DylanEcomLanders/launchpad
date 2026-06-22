"use client";

/* Day-365 deck - "annual review, multi-year framing". */

import { FlagIcon } from "@heroicons/react/24/outline";
import { ToolShell, DeckShell } from "@/lib/hero-offer/tool-shell";

export default function Day365DeckPage() {
  return (
    <ToolShell
      title="Day 365 deck"
      blurb="One-year annual review. The 'what's the next year look like' conversation. Pitch multi-year for big clients."
      parentHref="/hero-offer/retention"
      parentLabel="Back to Retention"
      status="shell"
      accent="sky"
      icon={<FlagIcon className="size-5" />}
    >
      <DeckShell
        accent="sky"
        whenToSend="Day 360-365. Founder/CMO + your senior. Multi-year framing for VIP-scale clients; second-pod offer if they've outgrown the original cadence."
        notes={"Slide spine:\n1. Cover: 'a year of compounding'\n2. The annual scorecard - tests called, win rate, revenue lift, AOV lift\n3. The body of work (representative wins, the engine running)\n4. What's been learned about this brand's funnel that no one else has\n5. The next year - the macro roadmap\n6. The continuation offer - multi-year, second pod (VIP), referral angle\n7. Thank-you slide - real human note from the team"}
      />
    </ToolShell>
  );
}
