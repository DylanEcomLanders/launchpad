import { isStaging } from "@/lib/env";

/* ── Sandbox ribbon ──
 *
 * A small fixed marker that only renders on the staging sandbox
 * (NEXT_PUBLIC_APP_ENV=staging), so the deployed sandbox can never be
 * mistaken for the live build at a glance. Renders nothing in
 * production or local dev.
 */
export function SandboxRibbon() {
  if (!isStaging()) return null;

  return (
    <div
      aria-hidden
      className="fixed bottom-3 left-3 z-[9999] pointer-events-none select-none rounded-full border border-warning/40 bg-warning/15 px-2.5 py-1 text-4xs font-semibold uppercase tracking-wider text-warning backdrop-blur-sm"
    >
      Sandbox
    </div>
  );
}
