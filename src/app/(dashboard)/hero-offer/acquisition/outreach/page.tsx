"use client";

/* Cold outreach templates - email A (observation) + email B (proof) +
 * LinkedIn DM + 4-touch cadence. Copy-paste ready. */

import { useState } from "react";
import {
  EnvelopeIcon,
  ClipboardDocumentIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { ToolShell } from "@/lib/hero-offer/tool-shell";

interface Template {
  id: string;
  label: string;
  subject?: string;
  body: string;
}

const TEMPLATES: Template[] = [
  {
    id: "email-a",
    label: "Email A — observation",
    subject: "Quick CRO observation on [BRAND]",
    body: `Hi [FIRST NAME],

Spent an hour on [BRAND] this week. Noticed [SPECIFIC OBSERVATION - hero hierarchy / cart flow / pricing page].

If we ran a quick A/B on that, my back-of-envelope says you'd lift [METRIC] by [X%]. Happy to share the audit deck I'd build for you - free, no strings.

Worth a 20-minute call?

[YOUR NAME]
Ecom Landers`,
  },
  {
    id: "email-b",
    label: "Email B — proof",
    subject: "[CLIENT] +[X]% conversion in 12 weeks",
    body: `Hi [FIRST NAME],

We took [SIMILAR CLIENT] from [BASELINE CR] to [NEW CR] in 12 weeks. Same channels, same traffic - just a tighter conversion engine.

We have capacity for one more [BRAND TYPE] this quarter. Worth a quick call to see if you're a fit?

(One-pager attached.)

[YOUR NAME]`,
  },
  {
    id: "linkedin",
    label: "LinkedIn DM",
    body: `Hi [FIRST NAME] - we just took [SIMILAR CLIENT] from [BASELINE CR] → [NEW CR] in 12 weeks. We have one slot left this quarter for [BRAND TYPE] brands. Worth 20 mins?`,
  },
];

const CADENCE = [
  { day: "Day 0", action: "Email A (observation) — personalised opener" },
  { day: "Day 3", action: "LinkedIn DM if no reply — short, no link" },
  { day: "Day 7", action: "Email B (proof) — case study + one-pager attached" },
  { day: "Day 14", action: "Final bump — break-up note: 'Closing the loop, happy to revisit Q[N]'" },
];

export default function OutreachPage() {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } catch { /* deny */ }
  }

  return (
    <ToolShell
      title="Cold outreach"
      blurb="The 4-touch cadence + copy-paste templates. Personalise the [BRACKETS] before sending."
      parentHref="/hero-offer/acquisition"
      parentLabel="Back to Acquisition"
      status="shell"
      accent="emerald"
      icon={<EnvelopeIcon className="size-5" />}
    >
      {/* Cadence */}
      <section className="bg-[#0F0F10] rounded-2xl ring-1 ring-white/[0.04] p-5">
        <div className="text-[10px] uppercase tracking-wider font-semibold mb-3 text-emerald-300">
          4-touch cadence
        </div>
        <ul className="space-y-2.5">
          {CADENCE.map((c) => (
            <li key={c.day} className="flex items-baseline gap-3">
              <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-200 w-16 shrink-0">{c.day}</span>
              <span className="text-sm text-[#E5E5EA]">{c.action}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Templates */}
      {TEMPLATES.map((t) => (
        <section key={t.id} className="bg-[#0F0F10] rounded-2xl ring-1 ring-white/[0.04] p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-emerald-300">{t.label}</div>
            <button
              onClick={() => copy(t.id, `${t.subject ? `Subject: ${t.subject}\n\n` : ""}${t.body}`)}
              className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-[#71757D] hover:text-[#E5E5EA]"
            >
              {copied === t.id ? <CheckIcon className="size-3.5" /> : <ClipboardDocumentIcon className="size-3.5" />}
              {copied === t.id ? "Copied" : "Copy"}
            </button>
          </div>
          {t.subject && (
            <div className="text-[12px] text-[#9CA3AF] mb-2">
              <span className="text-[#71757D]">Subject: </span>
              {t.subject}
            </div>
          )}
          <pre className="text-[13px] text-[#E5E5EA] whitespace-pre-wrap font-mono bg-black/40 rounded-lg p-3 ring-1 ring-white/[0.04]">{t.body}</pre>
        </section>
      ))}
    </ToolShell>
  );
}
