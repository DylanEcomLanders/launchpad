"use client";

/* Day-180 deck - "case study angle, renewal anchor". */

import { SparklesIcon } from "@heroicons/react/24/outline";
import { ToolShell, DeckShell } from "@/lib/hero-offer/tool-shell";

export default function Day180DeckPage() {
  return (
    <ToolShell
      title="Day 180 deck"
      blurb="Six-month milestone. The programme is mature - compounding wins, case-study territory."
      parentHref="/hero-offer/retention"
      parentLabel="Back to Retention"
      status="shell"
      accent="sky"
      icon={<SparklesIcon className="size-5" />}
    >
      <DeckShell
        accent="sky"
        whenToSend="Day 175-185. The 'we've earned the right to ask for a case study + a referral' moment."
        notes={"Slide spine:\n1. Cover: 'six months in'\n2. Cumulative results (CR lift, revenue uplift, tests called, win rate)\n3. The story arc - where we started, where we are\n4. Case study draft (we frame it; they approve / anonymise / amend)\n5. The referral ask (one similar brand they'd recommend us to)\n6. Renewal anchor - next 6 months' plan"}
      />
    </ToolShell>
  );
}
