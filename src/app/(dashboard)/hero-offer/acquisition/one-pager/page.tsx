"use client";

/* One-pager - mini-pitch leave-behind for cold outreach attachments. */

import { DocumentTextIcon } from "@heroicons/react/24/outline";
import { ToolShell, DeckShell } from "@/lib/hero-offer/tool-shell";

export default function OnePagerPage() {
  return (
    <ToolShell
      title="One-pager"
      blurb="Single-page version of the pitch. PDF you attach to cold outreach emails."
      parentHref="/hero-offer/acquisition"
      parentLabel="Back to Acquisition"
      status="shell"
      accent="emerald"
      icon={<DocumentTextIcon className="size-5" />}
    >
      <DeckShell
        accent="emerald"
        whenToSend="Attached to first cold outreach (email B: proof). Lightest format - the prospect can read it in under a minute without committing to opening a deck."
        notes={"One-page spine:\n- Hero line: 'We turn the traffic you already pay for into revenue'\n- 3 wins (1 per client type)\n- 3-tier price ladder at the bottom\n- CTA: book a free 30-min audit"}
      />
    </ToolShell>
  );
}
