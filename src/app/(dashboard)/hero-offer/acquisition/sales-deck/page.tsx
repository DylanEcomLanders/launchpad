"use client";

/* Sales deck - the live-call deck the closer drives during a sales call. */

import { PresentationChartLineIcon } from "@heroicons/react/24/outline";
import { ToolShell, DeckShell } from "@/lib/hero-offer/tool-shell";

export default function SalesDeckPage() {
  return (
    <ToolShell
      title="Sales deck"
      blurb="The live-call deck. Driven by the closer on a sales call to anchor positioning, the offer, and proof."
      parentHref="/hero-offer/acquisition"
      parentLabel="Back to Acquisition"
      status="shell"
      accent="emerald"
      icon={<PresentationChartLineIcon className="size-5" />}
    >
      <DeckShell
        accent="emerald"
        whenToSend="Driven live on a sales call (not a leave-behind). Closer screen-shares from the deck link below. Avoid sending the URL in advance unless the prospect insists."
        notes={"Slide spine (per Hero Offer playbook):\n1. The Conversion Engine in one line\n2. Why this engine vs hiring / CRO tools / agency\n3. The 3 tiers + tier-fit signals\n4. The guarantee\n5. Recent wins (proof deck cut-down)\n6. What week one looks like\n7. The ask + next step"}
      />
    </ToolShell>
  );
}
