/* ── Offer › Resources ──
 * The playbook's working surfaces, grouped by the three stages of the
 * conversion engine: Acquisition · Execution · Retention. Each stage is a
 * section; each tool links to its canonical surface. Stage data is the single
 * source in lib/hero-offer/offer.
 */

import Link from "next/link";
import { ArrowUpRightIcon } from "@heroicons/react/24/outline";
import { STAGES } from "@/lib/hero-offer/offer";

export default function ResourcesPage() {
  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Resources</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Every tool the team runs the offer with, grouped by stage. One canonical surface per job: win the deal, wow on delivery, make it last.
        </p>
      </header>

      {STAGES.map((stage) => (
        <section key={stage.key}>
          <div className="mb-3 flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded border border-border-faint bg-surface-raised text-muted">
              <stage.icon className="size-4" />
            </span>
            <div>
              <div className="text-sm font-semibold text-foreground">{stage.label}</div>
              <div className="text-3xs font-medium uppercase tracking-wider text-subtle">{stage.sub}</div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {stage.tools.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="group flex items-start justify-between gap-3 rounded border border-border-faint bg-surface p-5 transition-colors hover:bg-surface-raised"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">{tool.label}</div>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{tool.sub}</p>
                </div>
                <ArrowUpRightIcon className="size-4 shrink-0 text-subtle transition-colors group-hover:text-foreground" />
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
