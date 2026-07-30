"use client";

/* ── Agreement Checkout: public flow ──
 * /checkout/[token]. Public, unauthenticated. One capture, three gated steps:
 *   1. Sign (in-house)  2. Pay (Whop, embedded)  3. Invoice (in-house, download)
 * The token is the row id (unguessable). Everything logs to the checkouts table.
 *
 * STATUS: sign + invoice (real PDF downloads) and Pay (Whop embedded checkout)
 * are all wired. The Pay step calls /api/checkout/session to create a Whop
 * checkout, then mounts WhopCheckoutEmbed. If the Whop keys are not set yet, it
 * shows a "not connected" notice plus a [test] control so the flow stays walkable.
 */

import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { CheckCircleIcon, LockClosedIcon, ArrowDownTrayIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import { Logo } from "@/components/logo";
import { SignaturePad } from "@/components/signature-pad";
import { getCheckoutByToken, saveCheckout } from "@/lib/checkout/data";
import { computeVat } from "@/lib/checkout/vat";
import type { Checkout } from "@/lib/checkout/types";
import type { InvoiceIssued, CompanyProfile } from "@/lib/finance/types";

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
      {step === "pay" && <PayStep checkout={checkout} onPaid={patch} />}
      {step === "invoice" && <InvoiceStep checkout={checkout} />}
    </Shell>
  );
}

/* ── Step 1: Sign ── */
function SignStep({ checkout, onSigned }: { checkout: Checkout; onSigned: (p: Partial<Checkout>) => Promise<void> }) {
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [country, setCountry] = useState(checkout.billingCountry ?? "GB");
  const [signature, setSignature] = useState("");
  const [agreed, setAgreed] = useState(false);
  // Local snapshot once signed: hold on this step so a copy can be downloaded
  // before continuing. Persisting (and advancing to Pay) waits for "Continue".
  const [signed, setSigned] = useState<Checkout | null>(null);
  const canSign = name.trim().length > 1 && signature && agreed;

  const vat = computeVat(checkout.amountGross, country);

  function doSign() {
    if (!canSign) return;
    setSigned({
      ...checkout,
      signedName: name.trim(),
      signatoryPosition: position.trim() || undefined,
      signatureImage: signature,
      billingCountry: country,
      signedAt: new Date().toISOString(),
      status: "signed",
    });
  }

  if (signed) return <SignedConfirm signed={signed} onContinue={onSigned} />;

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
          {checkout.engagementType === "retainer"
            ? "90-day initial commitment, then rolling monthly."
            : "One-time project. Fee payable in full."}{" "}
          {checkout.termsNote}
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-2xs font-medium uppercase tracking-wide text-subtle">Full name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1 block text-2xs font-medium uppercase tracking-wide text-subtle">Position</span>
            <input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="e.g. Director" className={inputCls} />
          </label>
        </div>
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
        onClick={doSign}
        className="w-full rounded-lg bg-foreground py-3 text-sm font-medium text-background transition hover:bg-foreground/90 disabled:opacity-40"
      >
        Sign
      </button>
    </div>
  );
}

/* ── Step 1b: signed, before payment ── */
function SignedConfirm({ signed, onContinue }: { signed: Checkout; onContinue: (p: Partial<Checkout>) => Promise<void> }) {
  const [downloading, setDownloading] = useState(false);

  async function downloadSigned() {
    setDownloading(true);
    try {
      const { downloadAgreementPdf } = await import("@/lib/checkout/agreement");
      await downloadAgreementPdf(signed);
    } catch (err) {
      console.error("[checkout] agreement download failed:", err);
      alert("Could not generate the signed copy. Please contact Ecom Landers.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-status-ontrack">
        <CheckCircleIcon className="size-6" />
        <h1 className="text-xl font-semibold text-foreground">Agreement signed</h1>
      </div>
      <p className="text-sm text-muted">
        Download a copy for your records. You can also get it again after payment, so nothing is lost if you continue now.
      </p>

      <button
        onClick={downloadSigned}
        disabled={downloading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface py-3 text-sm font-medium text-foreground transition hover:bg-surface-raised disabled:opacity-50"
      >
        <ArrowDownTrayIcon className="size-4" /> {downloading ? "Preparing…" : "Download signed agreement (PDF)"}
      </button>

      <button
        onClick={() =>
          onContinue({
            signedName: signed.signedName,
            signatoryPosition: signed.signatoryPosition,
            signatureImage: signed.signatureImage,
            billingCountry: signed.billingCountry,
            signedAt: signed.signedAt,
            status: "signed",
          })
        }
        className="w-full rounded-lg bg-foreground py-3 text-sm font-medium text-background transition hover:bg-foreground/90"
      >
        Continue to payment
      </button>
    </div>
  );
}

/* ── Step 2: Pay (Whop embedded checkout) ── */
// Mounts client-side only (it renders an iframe and talks to Whop's SDK).
const WhopCheckoutEmbed = dynamic(() => import("@whop/checkout/react").then((m) => m.WhopCheckoutEmbed), { ssr: false });

type Session = { sessionId: string; planId: string };

function PayStep({
  checkout,
  onPaid,
}: {
  checkout: Checkout;
  onPaid: (p: Partial<Checkout>) => Promise<void>;
}) {
  // undefined = still loading; null = Whop unavailable (no keys yet); Session = ready
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [reason, setReason] = useState("");

  useEffect(() => {
    let alive = true;
    fetch("/api/checkout/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: checkout.token }),
    })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!alive) return;
        if (ok && j.planId && j.sessionId) setSession({ planId: j.planId, sessionId: j.sessionId });
        else {
          setReason(String(j?.error ?? "unavailable"));
          setSession(null);
        }
      })
      .catch((e) => {
        if (!alive) return;
        setReason(String(e?.message ?? "network error"));
        setSession(null);
      });
    return () => {
      alive = false;
    };
  }, [checkout.token]);

  function markPaid(whopPaymentId?: string) {
    // Optimistic UI advance only. The Whop webhook writes the authoritative
    // paid flag, invoice number, VAT and Finance invoice record server-side.
    return onPaid({ paid: true, paidAt: new Date().toISOString(), whopPaymentId, status: "paid" });
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

      {session === undefined && (
        <section className="grid place-items-center rounded-lg border border-dashed border-border bg-surface p-10 text-center">
          <LockClosedIcon className="size-6 text-subtle" />
          <p className="mt-2 text-sm text-muted">Loading secure checkout…</p>
        </section>
      )}

      {session && (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <WhopCheckoutEmbed
            planId={session.planId}
            sessionId={session.sessionId}
            theme="light"
            prefill={{ email: checkout.email }}
            onComplete={(_planId: string, receiptId?: string) => {
              void markPaid(receiptId);
            }}
          />
        </div>
      )}

      {session === null && (
        <>
          <section className="rounded-lg border border-dashed border-border bg-surface p-6 text-center">
            <LockClosedIcon className="mx-auto size-6 text-subtle" />
            <p className="mt-2 text-sm text-muted">Payment isn&apos;t connected yet.</p>
            <p className="mt-1 text-2xs text-subtle">Add the Whop keys to enable live checkout ({reason}).</p>
          </section>
          {/* Fallback so the flow stays walkable before Whop keys are wired. Remove once live. */}
          <button
            onClick={() => markPaid()}
            className="w-full rounded-lg border border-border bg-surface py-2.5 text-xs font-medium text-muted transition hover:bg-surface-raised hover:text-foreground"
          >
            [test] simulate successful payment
          </button>
        </>
      )}
    </div>
  );
}

/* ── Step 3: Invoice ──
 * Invoice is generated + recorded by the Finance module server-side (via the
 * Whop webhook). We fetch that record and render its PDF (finance-invoice-pdf)
 * client-side. The signed agreement is generated in-house from the checkout. */
type InvoiceData = { invoice: InvoiceIssued; profile: CompanyProfile };

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function InvoiceStep({ checkout }: { checkout: Checkout }) {
  // undefined = loading; "pending" = webhook not done; "error"; else the data
  const [inv, setInv] = useState<InvoiceData | "pending" | "error" | undefined>(undefined);
  const [busy, setBusy] = useState<null | "invoice" | "agreement">(null);

  const fetchInvoice = useCallback(() => {
    setInv(undefined);
    fetch(`/api/checkout/invoice-data?token=${encodeURIComponent(checkout.token)}`)
      .then(async (r) => {
        if (r.status === 202) return setInv("pending");
        if (!r.ok) return setInv("error");
        setInv((await r.json()) as InvoiceData);
      })
      .catch(() => setInv("error"));
  }, [checkout.token]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const ready = inv && typeof inv !== "string" ? inv : null;

  async function downloadInvoice() {
    if (!ready) return;
    setBusy("invoice");
    try {
      const [{ pdf }, { FinanceInvoicePdf }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/finance/finance-invoice-pdf"),
      ]);
      const blob = await pdf(<FinanceInvoicePdf invoice={ready.invoice} profile={ready.profile} />).toBlob();
      triggerDownload(blob, `Invoice-${ready.invoice.invoice_number}.pdf`);
    } catch (err) {
      console.error("[checkout] invoice download failed:", err);
      alert("Could not generate the invoice. Please contact Ecom Landers.");
    } finally {
      setBusy(null);
    }
  }

  async function downloadAgreement() {
    setBusy("agreement");
    try {
      const { downloadAgreementPdf } = await import("@/lib/checkout/agreement");
      await downloadAgreementPdf(checkout);
    } catch (err) {
      console.error("[checkout] agreement download failed:", err);
      alert("Could not generate the agreement. Please contact Ecom Landers.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-status-ontrack">
        <CheckCircleIcon className="size-6" />
        <h1 className="text-xl font-semibold text-foreground">Paid, thank you</h1>
      </div>

      {ready ? (
        <section className="rounded-lg border border-border bg-surface p-5 text-sm">
          <Row label="Invoice" value={ready.invoice.invoice_number} />
          <Row label="Billed to" value={ready.invoice.client_name} />
          <div className="my-3 border-t border-border-faint" />
          <Row label="Total" value={money(ready.invoice.gross_amount, ready.invoice.currency)} strong />
        </section>
      ) : inv === "pending" ? (
        <section className="rounded-lg border border-dashed border-border bg-surface p-5 text-center text-sm text-muted">
          Your invoice is being finalised. This can take a few seconds after payment.
          <button onClick={fetchInvoice} className="mt-2 block w-full text-2xs text-subtle underline hover:text-foreground">
            Refresh
          </button>
        </section>
      ) : inv === "error" ? (
        <section className="rounded-lg border border-dashed border-border bg-surface p-5 text-center text-sm text-muted">
          Could not load your invoice.
          <button onClick={fetchInvoice} className="mt-2 block w-full text-2xs text-subtle underline hover:text-foreground">
            Try again
          </button>
        </section>
      ) : (
        <section className="rounded-lg border border-border bg-surface p-5 text-center text-sm text-subtle">Loading your invoice…</section>
      )}

      <div className="space-y-2">
        <button
          onClick={downloadInvoice}
          disabled={busy !== null || !ready}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-foreground py-3 text-sm font-medium text-background transition hover:bg-foreground/90 disabled:opacity-50"
        >
          <ArrowDownTrayIcon className="size-4" /> {busy === "invoice" ? "Preparing…" : "Download invoice (PDF)"}
        </button>
        <button
          onClick={downloadAgreement}
          disabled={busy !== null}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface py-3 text-sm font-medium text-foreground transition hover:bg-surface-raised disabled:opacity-50"
        >
          <ArrowDownTrayIcon className="size-4" /> {busy === "agreement" ? "Preparing…" : "Download signed agreement (PDF)"}
        </button>
      </div>
      <p className="text-center text-2xs text-subtle">We keep a copy of your invoice and agreement on file. Just ask if you need them again.</p>

      {/* Next step: onboarding. Prefilled with what we already know. */}
      <div className="rounded-lg border border-border bg-surface-raised p-5">
        <p className="text-sm font-semibold text-foreground">Last step: onboarding</p>
        <p className="mt-1 text-2xs text-subtle">
          Tell us about your brand and store so we can kick off. Takes about 10 minutes.
        </p>
        <a
          href={`/onboard?company=${encodeURIComponent(checkout.company || checkout.clientName)}&contact=${encodeURIComponent(checkout.clientName)}`}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-foreground py-3 text-sm font-medium text-background transition hover:bg-foreground/90"
        >
          Start onboarding <ArrowRightIcon className="size-4" />
        </a>
      </div>
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
