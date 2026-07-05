/* ── Offer › Info ──
 * The reasoning behind the offer: what it is, why the guarantee holds, who it's
 * for, why the tiers are shaped this way, and who owns what. Editorial layout
 * so the team internalises the story, not just reads it. Server component.
 */

import { CheckIcon, XMarkIcon, ArrowTrendingUpIcon } from "@heroicons/react/24/outline";

const VENDOR = [
  "One-off deliverables, then the outcome is your problem.",
  "Briefs in, files out, and nobody owns the number.",
  "You manage the freelancers and hope it adds up.",
];

const PARTNERSHIP = [
  "A full conversion team (design, dev, copy, CRO) embedded on a monthly system.",
  "We own the whole loop: research, build, copy, test, iterate.",
  "Measured on one metric, compounding month over month.",
];

const GUARANTEE = [
  { n: "01", title: "We qualify hard.", body: "Only Shopify brands at £200k/mo+, paid-traffic dependent, with the bandwidth to ship what we recommend." },
  { n: "02", title: "That filter is the guarantee.", body: "We only sign brands where the levers are ours to pull, so the outcome sits in our hands, not chance." },
  { n: "03", title: "Then we put it in writing.", body: "Measurable CR lift in 90 days, or we keep working free until it lands." },
];

const FIT_FOR = [
  "Shopify, £200k/mo+ in revenue",
  "Paid-traffic dependent: the leak is at the page",
  "Founder or CMO who'll ship what we recommend",
  "Conversion ambition, not just a reskin",
];

const FIT_NOT = [
  "Pre-traffic or pre-product-market-fit",
  "Wants one page, not a system",
  "Looking for a vendor to manage, not a partner",
  "Slow to decide, reluctant to ship changes",
];

const OWNERSHIP = [
  { role: "Founder", owns: "The offer + the acquisition story" },
  { role: "Strategist", owns: "Execution: the month of builds and tests" },
  { role: "CSM", owns: "Retention: reporting, renewals, the relationship" },
];

export default function OfferInfoPage() {
  return (
    <div className="space-y-6">
      {/* ── Thesis ── */}
      <section className="rounded border border-border-faint bg-surface p-8">
        <p className="text-3xs font-semibold uppercase tracking-[0.14em] text-subtle">The thesis</p>
        <h1 className="mt-3 max-w-3xl text-2xl font-semibold leading-tight tracking-tight text-foreground">
          Brands already pay for the traffic. We make it convert.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          Most of that spend leaks at the same tired pages. We embed a full conversion team on a monthly system that turns the traffic a brand already buys into revenue. It compounds because we own the whole loop, not a single deliverable: a partnership, not a vendor retainer.
        </p>
      </section>

      {/* ── Not a vendor / A partnership ── */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded border border-border-faint bg-surface p-6">
          <div className="mb-4 text-3xs font-semibold uppercase tracking-wider text-subtle">What we&apos;re not</div>
          <ul className="space-y-3">
            {VENDOR.map((v) => (
              <li key={v} className="flex items-start gap-2.5 text-sm text-muted">
                <XMarkIcon className="mt-0.5 size-4 shrink-0 text-subtle" />
                <span className="leading-snug">{v}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded border border-border bg-surface-raised p-6">
          <div className="mb-4 text-3xs font-semibold uppercase tracking-wider text-foreground">What we are</div>
          <ul className="space-y-3">
            {PARTNERSHIP.map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-sm text-muted">
                <CheckIcon className="mt-0.5 size-4 shrink-0 text-status-ontrack" />
                <span className="leading-snug">{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── North Star ── */}
      <section className="rounded border border-border-faint bg-surface p-6">
        <div className="flex items-start gap-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded border border-border-faint bg-surface-raised text-status-ontrack">
            <ArrowTrendingUpIcon className="size-4" />
          </span>
          <div>
            <div className="text-3xs font-semibold uppercase tracking-wider text-subtle">The North Star</div>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-foreground">
              One number: <span className="font-semibold">conversion rate</span>. CR up means revenue up at the same ad spend. Every build, test and call is judged against it. Nothing else is a win.
            </p>
          </div>
        </div>
      </section>

      {/* ── Why the guarantee holds ── */}
      <section>
        <p className="mb-3 text-3xs font-semibold uppercase tracking-wider text-subtle">Why the guarantee holds</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {GUARANTEE.map((g) => (
            <div key={g.n} className="rounded border border-border-faint bg-surface p-5">
              <div className="text-sm font-semibold tabular-nums text-subtle">{g.n}</div>
              <div className="mt-3 text-sm font-semibold leading-snug text-foreground">{g.title}</div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">{g.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Fit: for / not for ── */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded border border-border-faint bg-surface p-6">
          <div className="mb-4 flex items-center gap-2 text-3xs font-semibold uppercase tracking-wider text-status-ontrack">
            <span className="size-1.5 rounded-full bg-status-ontrack" />Who it&apos;s for
          </div>
          <ul className="space-y-3">
            {FIT_FOR.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-muted">
                <CheckIcon className="mt-0.5 size-4 shrink-0 text-status-ontrack" />
                <span className="leading-snug">{f}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded border border-border-faint bg-surface p-6">
          <div className="mb-4 flex items-center gap-2 text-3xs font-semibold uppercase tracking-wider text-subtle">
            <span className="size-1.5 rounded-full bg-subtle" />Who it&apos;s not for
          </div>
          <ul className="space-y-3">
            {FIT_NOT.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-muted">
                <XMarkIcon className="mt-0.5 size-4 shrink-0 text-subtle" />
                <span className="leading-snug">{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Why three tiers · Who owns what ── */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded border border-border-faint bg-surface p-6">
          <div className="mb-2 text-3xs font-semibold uppercase tracking-wider text-subtle">Why three tiers</div>
          <div className="text-sm font-semibold text-foreground">Same team, cadence scales with ambition.</div>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Every tier is the same people and the same guarantee: the number just sets velocity. Entry proves the model, Core is the default weekly engine, VIP runs an aggressive programme with priority turnaround. Nobody buys a weaker version of us, only a faster one.
          </p>
        </div>
        <div className="rounded border border-border-faint bg-surface p-6">
          <div className="mb-4 text-3xs font-semibold uppercase tracking-wider text-subtle">Who owns what</div>
          <ul className="divide-y divide-dashed divide-border">
            {OWNERSHIP.map((o) => (
              <li key={o.role} className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                <span className="shrink-0 text-sm font-semibold text-foreground">{o.role}</span>
                <span className="text-right text-xs leading-snug text-muted">{o.owns}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-subtle">
            Anyone with admin can edit these surfaces; the point is one source of truth the whole team sells and delivers from.
          </p>
        </div>
      </section>
    </div>
  );
}
