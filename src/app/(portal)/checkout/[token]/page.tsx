"use client";

/* ── Agreement Checkout: public flow ──
 * /checkout/[token]. Public, unauthenticated. One capture, three gated steps:
 *   1. Sign (in-house)  2. Pay (Whop, embedded)  3. Invoice (in-house, download)
 * The token is the row id (unguessable). Everything logs to the checkouts table.
 *
 * STATUS: sign + invoice (with real PDF download) are built. The Pay step shows the
 * placeholder where Whop's embedded checkout mounts, plus a temporary "test paid"
 * control so the flow is walkable before the Whop keys are wired. Swap that for
 * the Whop embed (see docs/agreement-checkout-brief.md, "Whop integration").
 */

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircleIcon, LockClosedIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { Logo } from "@/components/logo";
import { SignaturePad } from "@/components/signature-pad";
import { getCheckoutByToken, saveCheckout } from "@/lib/checkout/data";
import { computeVat, VAT_NUMBER } from "@/lib/checkout/vat";
import type { Checkout } from "@/lib/checkout/types";

const money = (n: number, ccy = "GBP") =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: ccy }).format(n);

type Step = "sign" | "pay" | "invoice";

export default function CheckoutPage() {
  const params = useParams();
  const token = String(params.token ?? "");
  const [checkout, setCheckout] = useState<Checkout | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    getCheckoutByToken(token).then((c) => alive && setCheckout(c));
    return () => {
      alive = false;
    };
  }, [token]);

  async function patch(next: Partial<Checkout>) {
    if (!checkout) return;
    const updated = { ...checkout, ...next, updated_at: new Date().toISOString() } as Checkout;
    setCheckout(updated);
    await saveCheckout(updated);
  }

  if (checkout === undefined) return <Shell><p className="text-subtle">Loading…</p></Shell>;
  if (checkout === null)
    return (
      <Shell>
        <h1 className="text-lg font-semibold text-foreground">Link not found</h1>
        <p className="mt-2 text-sm text-muted">This agreement link is invalid or has expired. Check with your contact at Ecom Landers.</p>
      </Shell>
    );

  const step: Step = !checkout.signedAt ? "sign" : !checkout.paid ? "pay" : "invoice";
  const vat = computeVat(checkout.amountGross, checkout.billingCountry);

  return (
    <Shell>
      <Stepper step={step} />

      {step === "sign" && <SignStep checkout={checkout} onSigned={patch} />}
      {step === "pay" && <PayStep checkout={checkout} vatCountry={checkout.billingCountry} onPaid={patch} />}
      {step === "invoice" && <InvoiceStep checkout={checkout} />}
    </Shell>
  );
}

/* ── Step 1: Sign ── */
function SignStep({ checkout, onSigned }: { checkout: Checkout; onSigned: (p: Partial<Checkout>) => Promise<void> }) {
  const [name, setName] = useState("");
  const [country, setCountry] = useState(checkout.billingCountry ?? "GB");
  const [signature, setSignature] = useState("");
  const [agreed, setAgreed] = useState(false);
  const canSign = name.trim().length > 1 && signature && agreed;

  const vat = computeVat(checkout.amountGross, country);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-foreground">Your agreement</h1>
        <p className="mt-1 text-sm text-muted">Review, sign, then pay. You will get your invoice to download at the end.</p>
      </header>

      <section className="rounded-lg border border-border bg-surface p-5 text-sm">
        <Row label="Client" value={checkout.clientName + (checkout.company ? ` · ${checkout.company}` : "")} />
        <Row label="Engagement" value={checkout.engagementType === "retainer" ? "Retainer (monthly)" : "One-time project"} />
        <Row label="Amount" value={`${money(checkout.amountGross, checkout.currency)}${checkout.engagementType === "retainer" ? " / month" : ""}`} />
        {vat.status === "uk" && <Row label="Includes VAT" value={`${money(vat.vat, checkout.currency)} (20%)`} />}
        {vat.status === "outside" && <Row label="VAT" value="Outside of UK VAT" />}
        {checkout.scope && <Row label="Scope" value={checkout.scope} />}
        <p className="mt-3 border-t border-border-faint pt-3 text-xs text-subtle">
          90-day initial commitment, then rolling monthly. {checkout.termsNote}
        </p>
      </section>

      <section className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-2xs font-medium uppercase tracking-wide text-subtle">Billing country</span>
          <select value={country} onChange={(e) => setCountry(e.target.value)} className={inputCls}>
            <option value="GB">United Kingdom</option>
            <option value="US">United States</option>
            <option value="IE">Ireland</option>
            <option value="OTHER">Other</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-2xs font-medium uppercase tracking-wide text-subtle">Full name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={inputCls} />
        </label>
        <div>
          <span className="mb-1 block text-2xs font-medium uppercase tracking-wide text-subtle">Signature</span>
          <SignaturePad value={signature} onChange={setSignature} label="" />
        </div>
        <label className="flex items-start gap-2 text-sm text-muted">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5" />
          I have read and agree to this engagement and its terms.
        </label>
      </section>

      <button
        disabled={!canSign}
        onClick={() =>
          onSigned({
            signedName: name.trim(),
            signatureImage: signature,
            billingCountry: country,
            signedAt: new Date().toISOString(),
            status: "signed",
          })
        }
        className="w-full rounded-lg bg-foreground py-3 text-sm font-medium text-background transition hover:bg-foreground/90 disabled:opacity-40"
      >
        Sign &amp; continue to payment
      </button>
    </div>
  );
}

/* ── Step 2: Pay (Whop embed goes here) ── */
function PayStep({
  checkout,
  vatCountry,
  onPaid,
}: {
  checkout: Checkout;
  vatCountry?: string;
  onPaid: (p: Partial<Checkout>) => Promise<void>;
}) {
  const vat = computeVat(checkout.amountGross, vatCountry);

  function markPaid(whopPaymentId?: string) {
    const now = new Date().toISOString();
    // Invoice number is provisional; final numbering handled server-side later.
    const invoiceNumber = `EL-${Date.now().toString(36).toUpperCase()}`;
    return onPaid({
      paid: true,
      paidAt: now,
      whopPaymentId,
      status: "paid",
      vatStatus: vat.status,
      amountNet: vat.net,
      amountVat: vat.vat,
      invoiceNumber,
    });
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-foreground">Payment</h1>
        <p className="mt-1 text-sm text-muted">
          {money(checkout.amountGross, checkout.currency)}
          {checkout.engagementType === "retainer" ? " / month" : ""} · signed by {checkout.signedName}
        </p>
      </header>

      {/* WHOP EMBEDDED CHECKOUT MOUNTS HERE.
          Server creates a checkout configuration (inline plan: initial_price =
          checkout.amountGross, plan_type = checkout.planType, metadata.agreement_id
          = checkout.id) and returns a session id; render Whop's embedded checkout
          with it. On the client-side success callback, call markPaid(paymentId).
          The authoritative flip is the payment.succeeded webhook (server). */}
      <section className="grid place-items-center rounded-lg border border-dashed border-border bg-surface p-10 text-center">
        <LockClosedIcon className="size-6 text-subtle" />
        <p className="mt-2 text-sm text-muted">Whop secure checkout mounts here.</p>
        <p className="mt-1 text-2xs text-subtle">Card details are handled by Whop; you stay on this page.</p>
      </section>

      {/* TEMPORARY: walk the flow before Whop keys are wired. Remove once the embed is live. */}
      <button
        onClick={() => markPaid()}
        className="w-full rounded-lg border border-border bg-surface py-2.5 text-xs font-medium text-muted transition hover:bg-surface-raised hover:text-foreground"
      >
        [test] simulate successful payment
      </button>
    </div>
  );
}

/* ── Step 3: Invoice ── */
function InvoiceStep({ checkout }: { checkout: Checkout }) {
  const ccy = checkout.currency;
  const [downloading, setDownloading] = useState(false);

  async function download() {
    setDownloading(true);
    try {
      const { downloadInvoicePdf } = await import("@/lib/checkout/invoice");
      await downloadInvoicePdf(checkout);
    } catch (err) {
      console.error("[checkout] invoice download failed:", err);
      alert("Could not generate the invoice. Please contact Ecom Landers.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-status-ontrack">
        <CheckCircleIcon className="size-6" />
        <h1 className="text-xl font-semibold text-foreground">Paid — thank you</h1>
      </div>

      <section className="rounded-lg border border-border bg-surface p-5 text-sm">
        <Row label="Invoice" value={checkout.invoiceNumber ?? "—"} />
        <Row label="Billed to" value={checkout.clientName + (checkout.company ? ` · ${checkout.company}` : "")} />
        <div className="my-3 border-t border-border-faint" />
        {checkout.vatStatus === "uk" ? (
          <>
            <Row label="Net" value={money(checkout.amountNet ?? checkout.amountGross, ccy)} />
            <Row label={`VAT (20%)${VAT_NUMBER ? ` · ${VAT_NUMBER}` : ""}`} value={money(checkout.amountVat ?? 0, ccy)} />
            <Row label="Total" value={money(checkout.amountGross, ccy)} strong />
          </>
        ) : (
          <>
            <Row label="Total" value={money(checkout.amountGross, ccy)} strong />
            {checkout.vatStatus === "outside" && <p className="mt-1 text-xs text-subtle">Outside of UK VAT.</p>}
          </>
        )}
      </section>

      <button
        onClick={download}
        disabled={downloading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-foreground py-3 text-sm font-medium text-background transition hover:bg-foreground/90 disabled:opacity-50"
      >
        <ArrowDownTrayIcon className="size-4" /> {downloading ? "Preparing…" : "Download invoice (PDF)"}
      </button>
      <p className="text-center text-2xs text-subtle">A copy has been saved and emailed to {checkout.email}.</p>
    </div>
  );
}

/* ── chrome ── */
const inputCls =
  "w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none placeholder:text-subtle focus:border-ring";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-lg px-5 py-10">
        <div className="mb-8 text-foreground">
          <Logo />
        </div>
        {children}
      </div>
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "sign", label: "Sign" },
    { key: "pay", label: "Pay" },
    { key: "invoice", label: "Invoice" },
  ];
  const idx = steps.findIndex((s) => s.key === step);
  return (
    <div className="mb-8 flex items-center gap-2">
      {steps.map((s, i) => (
        <div key={s.key} className="flex flex-1 items-center gap-2">
          <span
            className={`grid size-6 shrink-0 place-items-center rounded-full text-2xs font-semibold ${
              i <= idx ? "bg-foreground text-background" : "bg-surface-raised text-subtle"
            }`}
          >
            {i + 1}
          </span>
          <span className={`text-xs ${i === idx ? "font-medium text-foreground" : "text-subtle"}`}>{s.label}</span>
          {i < steps.length - 1 && <span className="h-px flex-1 bg-border" />}
        </div>
      ))}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1">
      <span className="shrink-0 text-2xs uppercase tracking-wide text-subtle">{label}</span>
      <span className={`text-right ${strong ? "text-base font-semibold text-foreground" : "text-sm text-foreground"}`}>{value}</span>
    </div>
  );
}
