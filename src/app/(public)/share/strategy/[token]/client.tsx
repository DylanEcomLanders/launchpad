"use client";

/* Branded share page for a strategy resource.
 *
 * Fetches the resource by id, renders it inside an Ecom Landers wrapper:
 *   - Header: brand mark + "Strategic resource"
 *   - Title: resource.title (the strategist's chosen name)
 *   - Body:
 *       file  → signed URL download + inline preview where possible
 *       doc   → "Open Google Doc" button
 *       loom  → embedded iframe
 *       link  → "Open link" button
 *   - Footer: brand line
 *
 * No auth. The token (resource id) is effectively unguessable but
 * anyone with the link can open it, so the strategist should only
 * generate this for resources they're comfortable sharing.
 */

import { useEffect, useState } from "react";
import {
  ArrowTopRightOnSquareIcon,
  DocumentTextIcon,
  PaperClipIcon,
} from "@heroicons/react/24/outline";
import { getResource, signedUrlForResource } from "@/lib/strategy/data";
import type { StrategyResource } from "@/lib/strategy/types";

export default function StrategyShareClient({ token }: { token: string }) {
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "missing" }
    | { kind: "ok"; resource: StrategyResource; signedUrl?: string }
  >({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const resource = await getResource(token);
      if (!resource) {
        if (!cancelled) setState({ kind: "missing" });
        return;
      }
      let signedUrl: string | undefined;
      if (resource.kind === "file" && resource.file_path) {
        signedUrl = (await signedUrlForResource(resource.file_path, 3600)) ?? undefined;
      }
      if (!cancelled) setState({ kind: "ok", resource, signedUrl });
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-surface-raised text-foreground">
      {/* Brand header */}
      <header className="border-b border-foreground bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div className="flex items-baseline gap-3">
            <span className="text-[14px] font-semibold tracking-tight">
              Ecomlanders
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
              Strategy
            </span>
          </div>
          <span className="text-[10px] text-muted">
            Conversion Partnership
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        {state.kind === "loading" && (
          <div className="rounded-xl border border-foreground bg-surface p-8 text-center text-sm text-subtle">
            Loading…
          </div>
        )}

        {state.kind === "missing" && (
          <div className="rounded-xl border border-foreground bg-surface p-8 text-center">
            <h1 className="text-xl font-medium">Not found</h1>
            <p className="mt-2 text-sm text-subtle">
              This link may have expired or been removed. Ask the strategist
              for a fresh link.
            </p>
          </div>
        )}

        {state.kind === "ok" && (
          <ResourceShow resource={state.resource} signedUrl={state.signedUrl} />
        )}
      </main>

      <footer className="mx-auto max-w-3xl px-6 py-6 text-center text-[10px] uppercase tracking-[0.18em] text-muted">
        Ecomlanders · Conversion Partnership
      </footer>
    </div>
  );
}

function ResourceShow({
  resource,
  signedUrl,
}: {
  resource: StrategyResource;
  signedUrl?: string;
}) {
  return (
    <article className="overflow-hidden rounded-xl border border-foreground bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="bg-gradient-to-br from-[#0F1115] to-[#1F2430] px-6 py-8 text-white">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">
          {resource.kind === "file"
            ? "Document"
            : resource.kind === "doc"
              ? "Google Doc"
              : resource.kind === "loom"
                ? "Loom walkthrough"
                : "Reference"}
        </div>
        <h1 className="mt-2 text-2xl font-medium tracking-tight">
          {resource.title}
        </h1>
        <div className="mt-2 text-[11px] text-white/60">
          Shared {new Date(resource.added_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
        </div>
      </div>

      <div className="p-6">
        {resource.kind === "file" && (
          <FileShow signedUrl={signedUrl} title={resource.title} />
        )}
        {resource.kind === "doc" && resource.url && (
          <LinkOut url={resource.url} label="Open Google Doc" />
        )}
        {resource.kind === "loom" && resource.url && (
          <LoomEmbed url={resource.url} />
        )}
        {resource.kind === "link" && resource.url && (
          <LinkOut url={resource.url} label="Open link" />
        )}

        <div className="mt-8 rounded-md border border-foreground bg-surface-raised p-4 text-[12px] text-subtle">
          Questions? Reply to the strategist who sent you this link.
        </div>
      </div>
    </article>
  );
}

function FileShow({ signedUrl, title }: { signedUrl?: string; title: string }) {
  if (!signedUrl) {
    return (
      <div className="rounded-md border border-warning/20 bg-warning/10 p-4 text-sm text-warning">
        Unable to generate download link. Please ask the strategist for a fresh share.
      </div>
    );
  }
  const isPdf = title.toLowerCase().endsWith(".pdf");
  return (
    <div>
      <a
        href={signedUrl}
        target="_blank"
        rel="noreferrer"
        download
        className="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90"
      >
        <PaperClipIcon className="h-4 w-4" />
        Download {title}
      </a>
      {isPdf && (
        <div className="mt-6 overflow-hidden rounded-md border border-foreground">
          <iframe
            src={signedUrl}
            title={title}
            className="h-[640px] w-full"
          />
        </div>
      )}
    </div>
  );
}

function LinkOut({ url, label }: { url: string; label: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90"
    >
      <ArrowTopRightOnSquareIcon className="h-4 w-4" />
      {label}
    </a>
  );
}

function LoomEmbed({ url }: { url: string }) {
  // Loom URLs come in as https://loom.com/share/<id> — swap to /embed/<id>
  const embedUrl = url.includes("/share/")
    ? url.replace("/share/", "/embed/")
    : url;
  return (
    <div className="overflow-hidden rounded-md border border-foreground">
      <div className="relative" style={{ paddingTop: "56.25%" }}>
        <iframe
          src={embedUrl}
          title="Loom"
          allow="fullscreen"
          className="absolute inset-0 h-full w-full"
        />
      </div>
      <div className="border-t border-foreground bg-surface-raised px-3 py-2 text-right">
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground hover:underline"
        >
          Open in Loom
          <ArrowTopRightOnSquareIcon className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
