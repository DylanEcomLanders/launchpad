/* ── Offer › Info ──
 * The reasoning behind the offer: why it exists, why the tiers are shaped the
 * way they are, why we can stand behind the guarantee, and who owns what.
 * Context for the team so everyone sells + delivers the same story. Prose
 * capped for readability; server component.
 */

const RATIONALE = [
  {
    eyebrow: "Why the offer exists",
    title: "A partnership, not a vendor retainer.",
    body: "Brands already pay for traffic. Most of that spend leaks at the same tired pages. We embed a full conversion team — design, dev, copy, CRO — on a monthly system that turns the traffic they already buy into revenue. It compounds because we own the whole loop, not a single deliverable.",
  },
  {
    eyebrow: "Why three tiers",
    title: "Same team, cadence scales with ambition.",
    body: "Every tier is the same people and the same guarantee. What changes is velocity: how many builds and tests ship per month, and how often we meet. Entry proves the model on a starter rhythm; Core is the default full engine on a weekly beat; VIP runs an aggressive test programme with priority turnaround. Nobody buys a weaker version of us, just a faster one.",
  },
  {
    eyebrow: "Why we guarantee it",
    title: "Measurable CR lift in 90 days, or we keep working free.",
    body: "Conversion rate is the one number we measure ourselves on — CR up means revenue up at the same ad spend. We only take brands where we can move it: Shopify, paid-traffic dependent, £200k/mo+, with the bandwidth to ship what we recommend. That filter is why the guarantee is safe to make.",
  },
  {
    eyebrow: "Who owns what",
    title: "Founder owns the offer, leads own their stage.",
    body: "Dylan owns the offer and the acquisition story. The strategist owns execution. The CSM owns retention. Anyone with admin can edit the surfaces here; the point is one source of truth the whole team sells and delivers from, not scattered docs.",
  },
];

export default function OfferInfoPage() {
  return (
    <div className="max-w-3xl space-y-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Why the offer works</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          The thinking behind the conversion engine, so everyone pitches and delivers the same story.
        </p>
      </header>

      <div className="space-y-3">
        {RATIONALE.map((r) => (
          <section key={r.eyebrow} className="rounded border border-border-faint bg-surface p-6">
            <div className="text-3xs font-semibold uppercase tracking-wider text-subtle">{r.eyebrow}</div>
            <h2 className="mt-2 text-base font-semibold leading-snug text-foreground">{r.title}</h2>
            <p className="mt-2.5 text-sm leading-relaxed text-muted">{r.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
