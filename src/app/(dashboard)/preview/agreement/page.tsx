"use client";

/* ── Agreement preview ──
 * Internal read-only view of the client Services Agreement with sample
 * data, so the current wording can be reviewed without creating a real
 * checkout. Toggle between the retainer and project variants.
 *
 * Renders via agreementBlob into an iframe (same approach as the client
 * sign step) because @react-pdf/renderer is ESM-only and must be
 * dynamically imported in the browser. */

import { useEffect, useState } from "react";
import type { Checkout, EngagementType } from "@/lib/checkout/types";

function sample(engagementType: EngagementType): Checkout {
  const retainer = engagementType === "retainer";
  return {
    id: "sample",
    token: "sample",
    clientName: "Tyler Brooks",
    company: "Aurum Wear Ltd",
    email: "tyler@aurumwear.com",
    clientAddress: "12 Bridge Street, Leeds, England, LS1 4DJ",
    billingCountry: "GB",
    engagementType,
    planType: retainer ? "renewal" : "one_time",
    amountGross: retainer ? 8400 : 12500,
    currency: "GBP",
    scope: retainer
      ? undefined
      : "a new product detail page and collection page, designed and built from scratch, including copywriting, design, Shopify development, implementation, quality assurance and testing",
    signedName: "Tyler Brooks",
    signatoryPosition: "Director",
    status: "draft",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export default function AgreementPreviewPage() {
  const [type, setType] = useState<EngagementType>("retainer");
  const [url, setUrl] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    let dead = false;
    let objectUrl = "";
    setUrl("");
    setErr("");
    (async () => {
      try {
        const { agreementBlob } = await import("@/lib/checkout/agreement");
        const blob = await agreementBlob(sample(type));
        if (dead) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      } catch (e) {
        if (!dead) setErr(e instanceof Error ? e.message : "Failed to render");
      }
    })();
    return () => {
      dead = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [type]);

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-lg font-semibold text-foreground">Client agreement preview</h1>
        <span className="text-xs text-subtle">Sample data. Nothing here creates a checkout.</span>
        <div className="ml-auto flex gap-1 p-1 bg-surface-raised rounded-lg">
          {(["retainer", "project"] as EngagementType[]).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`px-3 py-1.5 text-[13px] rounded-md capitalize transition-colors ${
                type === t
                  ? "bg-surface text-foreground font-medium shadow-sm"
                  : "text-subtle hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 border border-border rounded-xl overflow-hidden bg-surface">
        {err ? (
          <div className="p-6 text-[13px] text-danger">{err}</div>
        ) : url ? (
          <iframe src={url} title="Services Agreement" className="w-full h-full border-0" />
        ) : (
          <div className="p-6 text-[13px] text-subtle">Rendering agreement...</div>
        )}
      </div>
    </div>
  );
}
