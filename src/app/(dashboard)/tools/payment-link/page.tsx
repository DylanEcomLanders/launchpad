"use client";

import { useState } from "react";
import { ClipboardDocumentIcon, CheckIcon } from "@heroicons/react/24/outline";
import { inputClass, textareaClass, labelClass } from "@/lib/form-styles";

type PlanType = "one-time" | "recurring";

/* Current conversion-engine tiers (mirrors /pricing + /hero-offer). */
const PRESETS = [
  { name: "Entry", amount: 5000, desc: "Conversion Engine — Entry retainer. 2 page builds + 2 A/B tests per month, biweekly strategy calls + reporting." },
  { name: "Core", amount: 10000, desc: "Conversion Engine — Core retainer. 4 page builds + 4 A/B tests per month, weekly strategy calls + reporting." },
  { name: "VIP", amount: 15000, desc: "Conversion Engine — VIP retainer. 6 page builds + 12 A/B tests per month, weekly calls, priority turnaround, quarterly brand strategy." },
];

export default function PaymentLinkPage() {
  const [planType, setPlanType] = useState<PlanType>("one-time");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const canSubmit = clientName.trim() && amount && parseFloat(amount) > 0;

  function applyPreset(p: (typeof PRESETS)[number]) {
    setPlanType("recurring");
    setAmount(String(p.amount));
    setDescription(p.desc);
  }

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setPaymentUrl(null);

    try {
      const res = await fetch("/api/payment-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: clientName.trim(),
          clientEmail: clientEmail.trim() || undefined,
          amount: parseFloat(amount),
          description: description.trim() || undefined,
          recurring: planType === "recurring",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError((data.error || "Failed to create payment link") + (data.detail ? ` — ${data.detail}` : ""));
        return;
      }

      setPaymentUrl(data.paymentUrl);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!paymentUrl) return;
    navigator.clipboard.writeText(paymentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleReset() {
    setPlanType("one-time");
    setClientName("");
    setClientEmail("");
    setAmount("");
    setDescription("");
    setPaymentUrl(null);
    setError(null);
  }

  return (
    <div className="mx-auto max-w-lg px-6 pb-20 pt-10">
      <header className="mb-8">
        <h1 className="text-xl font-semibold">Payment link</h1>
        <p className="mt-1 text-sm text-muted">Generate a Whop checkout link to send to a client.</p>
      </header>

      <div className="space-y-5 rounded border border-border-faint bg-surface p-6">
        {/* Presets — current tiers */}
        <div>
          <label className={labelClass}>Quick preset</label>
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map((p) => {
              const on = planType === "recurring" && amount === String(p.amount);
              return (
                <button
                  key={p.name}
                  onClick={() => applyPreset(p)}
                  className={`rounded border px-3 py-2.5 text-left transition-colors ${on ? "border-border bg-surface-raised" : "border-border-faint hover:bg-surface-raised"}`}
                >
                  <div className="text-sm font-medium text-foreground">{p.name}</div>
                  <div className="mt-0.5 text-2xs tabular-nums text-subtle">£{(p.amount / 1000)}k/mo</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Plan type */}
        <div>
          <label className={labelClass}>Plan type</label>
          <div className="inline-flex rounded border border-border-faint p-0.5">
            {(["one-time", "recurring"] as PlanType[]).map((type) => (
              <button
                key={type}
                onClick={() => setPlanType(type)}
                className={`rounded-sm px-3 py-1.5 text-sm font-medium transition-colors ${planType === type ? "bg-surface-raised text-foreground" : "text-muted hover:text-foreground"}`}
              >
                {type === "one-time" ? "One-time" : "Monthly"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelClass}>Client name *</label>
          <input type="text" className={inputClass} placeholder="e.g. Harvestory" value={clientName} onChange={(e) => setClientName(e.target.value)} />
        </div>

        <div>
          <label className={labelClass}>Client email</label>
          <input type="email" className={inputClass} placeholder="e.g. client@example.com" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
        </div>

        <div>
          <label className={labelClass}>Amount (GBP) *{planType === "recurring" && <span className="ml-2 text-xs font-normal text-subtle">per month</span>}</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-subtle">£</span>
            <input type="number" min="0.50" step="0.01" className={`${inputClass} pl-7`} placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          {planType === "recurring" && amount && parseFloat(amount) > 0 && (
            <p className="mt-1.5 text-2xs text-subtle">Billed monthly · first payment £{parseFloat(amount).toLocaleString("en-GB")} · renews every 30 days</p>
          )}
        </div>

        <div>
          <label className={labelClass}>Description</label>
          <textarea className={textareaClass} rows={3} placeholder="What's this payment for?" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        {error && (
          <div className="rounded border border-status-late/30 px-3 py-2.5 text-sm text-status-late">{error}</div>
        )}

        {paymentUrl ? (
          <div className="space-y-3">
            <div className="rounded border border-status-ontrack/25 p-4">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-status-ontrack">
                <CheckIcon className="size-4" />{planType === "recurring" ? "Recurring subscription link created" : "Payment link created"}
              </p>
              <div className="flex items-center gap-2">
                <input type="text" readOnly value={paymentUrl} className="flex-1 truncate rounded border border-border bg-surface px-3 py-2 text-sm text-muted" />
                <button onClick={handleCopy} className="flex shrink-0 items-center gap-1.5 rounded bg-accent px-3 py-2 text-sm font-medium text-accent-foreground">
                  {copied ? <><CheckIcon className="size-4" />Copied</> : <><ClipboardDocumentIcon className="size-4" />Copy</>}
                </button>
              </div>
            </div>
            <button onClick={handleReset} className="w-full rounded border border-border py-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface-raised hover:text-foreground">Create another</button>
          </div>
        ) : (
          <button onClick={handleGenerate} disabled={!canSubmit || loading} className="w-full rounded bg-accent py-2.5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
            {loading ? "Creating…" : planType === "recurring" ? "Generate subscription link" : "Generate payment link"}
          </button>
        )}
      </div>
    </div>
  );
}
