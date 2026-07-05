/* ── Offer › Price list ──
 * The clean, shareable price sheet. Same three tiers as the Hero Offer tab
 * (single source in lib/hero-offer/offer), presented as a reference: full
 * inclusions per tier + the commitment terms. Server component — static data,
 * no interactivity.
 */

import { CheckIcon } from "@heroicons/react/24/outline";
import { TIERS, TERMS, fmtK } from "@/lib/hero-offer/offer";

export default function PriceListPage() {
  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Price list</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Three retainers, one conversion engine. Every tier is the same team and the same guarantee; the cadence and test volume scale with the number.
        </p>
      </header>

      <section>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`flex flex-col rounded border p-5 ${tier.featured ? "border-border bg-surface-raised" : "border-border-faint bg-surface"}`}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-foreground">{tier.name}</h2>
                {tier.featured && tier.badge && (
                  <span className="rounded border border-border-faint bg-surface px-2 py-0.5 text-2xs font-semibold uppercase tracking-wider text-muted">{tier.badge}</span>
                )}
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">{fmtK(tier.monthly)}</span>
                <span className="text-sm text-subtle">/mo</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted">{tier.blurb}</p>
              <div className="my-5 border-t border-dashed border-border" />
              <ul className="space-y-2.5">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-muted">
                    <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-status-ontrack" />
                    <span className="leading-snug">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── Terms ── */}
      <section>
        <p className="mb-3 text-3xs font-semibold uppercase tracking-wider text-subtle">Terms</p>
        <div className="rounded border border-border-faint bg-surface p-5">
          <ul className="space-y-3">
            {TERMS.map((t) => (
              <li key={t} className="flex items-start gap-2.5 text-sm text-muted">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-subtle" />
                <span className="leading-snug">{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
