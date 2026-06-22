"use client";

/* Proof deck - the wins-and-case-studies reel. */

import { TrophyIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { ToolShell, DeckShell } from "@/lib/hero-offer/tool-shell";

export default function ProofDeckPage() {
  return (
    <ToolShell
      title="Proof deck"
      blurb="The wins reel - case studies, uplift numbers, before/afters. Top-of-funnel proof."
      parentHref="/hero-offer/acquisition"
      parentLabel="Back to Acquisition"
      status="shell"
      accent="emerald"
      icon={<TrophyIcon className="size-5" />}
    >
      <DeckShell
        accent="emerald"
        whenToSend="Sent to warm leads after the first call, or attached when the prospect asks 'do you have proof?'. Updated quarterly as new wins land."
        notes={"Source content: every winning test in /tools/test-wins gets considered for promotion here. Format the slides as: hero metric (big), client/category, hypothesis, control vs variant, uplift, what we learned."}
      />
      <div className="text-[11px] text-[#71757D] mt-2">
        Source pipeline: <Link href="/tools/test-wins" className="text-emerald-300 hover:text-emerald-200">/tools/test-wins</Link>
      </div>
    </ToolShell>
  );
}
