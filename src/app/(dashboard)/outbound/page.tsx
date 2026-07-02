import { ShareIcon } from "@heroicons/react/24/outline";

/* Outbound — sales outbound tool. Placeholder for now; the tool gets built
   out here. Kept intentionally minimal so the nav structure is in place. */
export default function OutboundPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
      <div className="size-12 rounded-lg bg-surface-raised border border-border flex items-center justify-center mb-4">
        <ShareIcon className="size-5 text-subtle" />
      </div>
      <h1 className="text-lg font-medium text-foreground">Outbound</h1>
      <p className="mt-1.5 text-sm text-muted max-w-sm">
        The outbound tool lives here. Nothing to see yet — this is where we
        build it out.
      </p>
    </div>
  );
}
