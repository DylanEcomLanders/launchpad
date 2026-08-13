"use client";

/* Package + the one active commercial priority. Sits under the client title
 * so opening a /clients doc shows the offer immediately. Admin/CRO edit in
 * place; team members see the same line read-only. */

import type { ClientPackage, CommercialPriority } from "@/lib/pod-projects/types";
import {
  CLIENT_PACKAGES,
  PACKAGE_HINT,
  PACKAGE_LABEL,
  focusLabel,
  focusPlaceholder,
  normalizePackageType,
} from "@/lib/pod-projects/offer";

export function OfferStrip({
  packageType,
  priority,
  canEdit,
  onPackageChange,
  onPriorityChange,
}: {
  packageType?: ClientPackage;
  priority?: CommercialPriority;
  canEdit: boolean;
  onPackageChange: (next: ClientPackage | undefined) => void;
  onPriorityChange: (next: CommercialPriority | undefined) => void;
}) {
  const pkg = normalizePackageType(packageType);
  const statement = priority?.statement ?? "";
  const metric = priority?.metric ?? "";

  function patchPriority(nextStatement: string, nextMetric: string) {
    const s = nextStatement;
    const m = nextMetric;
    if (!s.trim() && !m.trim()) {
      onPriorityChange(undefined);
      return;
    }
    onPriorityChange(m.trim() ? { statement: s, metric: m } : { statement: s });
  }

  return (
    <div className="flex flex-wrap items-start gap-x-6 gap-y-2 border-b border-border-faint px-6 py-2.5">
      <div className="w-40 shrink-0">
        <div className="font-mono text-4xs font-medium uppercase tracking-widest text-subtle">Package</div>
        {canEdit ? (
          <select
            value={pkg ?? ""}
            onChange={(e) => onPackageChange(normalizePackageType(e.target.value))}
            title="Commercial package"
            className="mt-0.5 w-full cursor-pointer bg-transparent text-sm text-foreground outline-none hover:text-foreground focus:text-foreground"
          >
            <option value="" className="bg-surface-raised text-foreground">
              Unset
            </option>
            {CLIENT_PACKAGES.map((p) => (
              <option key={p} value={p} className="bg-surface-raised text-foreground">
                {PACKAGE_LABEL[p]}
              </option>
            ))}
          </select>
        ) : (
          <p className="mt-0.5 text-sm text-foreground">{pkg ? PACKAGE_LABEL[pkg] : "Unset"}</p>
        )}
        <p className="mt-0.5 text-3xs text-subtle">{pkg ? PACKAGE_HINT[pkg] : "Not classified yet"}</p>
      </div>

      <div className="min-w-[16rem] flex-1">
        <div className="font-mono text-4xs font-medium uppercase tracking-widest text-subtle">
          {focusLabel(pkg)}
        </div>
        {canEdit ? (
          <input
            value={statement}
            onChange={(e) => patchPriority(e.target.value, metric)}
            placeholder={focusPlaceholder(pkg)}
            className="mt-0.5 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-subtle/70 focus:outline-none"
          />
        ) : statement.trim() ? (
          <p className="mt-0.5 text-sm text-foreground">{statement}</p>
        ) : (
          <p className="mt-0.5 text-sm text-subtle">
            {pkg === "partner" ? "No active priority yet." : "None set."}
          </p>
        )}
      </div>

      <div className="w-48 shrink-0">
        <div className="font-mono text-4xs font-medium uppercase tracking-widest text-subtle">Primary metric</div>
        {canEdit ? (
          <input
            value={metric}
            onChange={(e) => patchPriority(statement, e.target.value)}
            placeholder="optional"
            className="mt-0.5 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-subtle/70 focus:outline-none"
          />
        ) : (
          <p className={`mt-0.5 text-sm ${metric.trim() ? "text-foreground" : "text-subtle"}`}>
            {metric.trim() || "—"}
          </p>
        )}
      </div>
    </div>
  );
}
