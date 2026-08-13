/* ── Client offer (package + one active priority) ──
 *
 * Lives on the pod_docs client record (jsonb `data`). Not a parallel model.
 * Legacy rows omit these fields; we never invent a package for them.
 */

import type { ClientPackage, CommercialPriority, DocType, RetainerTier } from "./types";

export const CLIENT_PACKAGES: ClientPackage[] = ["partner", "sprint", "audit"];

export const PACKAGE_LABEL: Record<ClientPackage, string> = {
  partner: "Partner",
  sprint: "Sprint",
  audit: "Audit",
};

/** Internal hint under the package chip — commercial facts, not Conversion Engine. */
export const PACKAGE_HINT: Record<ClientPackage, string> = {
  partner: "£5k/mo · 90-day minimum",
  sprint: "£3k · known fix",
  audit: "£1,499 · 7 days · diagnosis",
};

export function normalizePackageType(value: unknown): ClientPackage | undefined {
  return value === "sprint" || value === "audit" || value === "partner" ? value : undefined;
}

export function normalizePriority(value: unknown): CommercialPriority | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as { statement?: unknown; metric?: unknown };
  const statement = typeof raw.statement === "string" ? raw.statement : "";
  const metric = typeof raw.metric === "string" ? raw.metric.trim() : "";
  if (!statement.trim() && !metric) return undefined;
  return metric ? { statement, metric } : { statement };
}

export function focusLabel(pkg: ClientPackage | undefined): string {
  return pkg === "partner" ? "Active priority" : "Current focus";
}

export function focusPlaceholder(pkg: ClientPackage | undefined): string {
  switch (pkg) {
    case "partner":
      return "The one commercial problem after the click";
    case "sprint":
      return "What this sprint is here to fix";
    case "audit":
      return "What this audit is diagnosing";
    default:
      return "Short enough that the client could repeat it";
  }
}

/** Template spine that matches the offer. Callers can still override. */
export function templateForPackage(pkg: ClientPackage): { type: DocType; tier?: RetainerTier } {
  return pkg === "partner" ? { type: "retainer", tier: "core" } : { type: "project" };
}
