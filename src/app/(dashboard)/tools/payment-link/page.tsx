"use client";

import { useState } from "react";
import { ClipboardDocumentIcon, CheckIcon, BoltIcon } from "@heroicons/react/24/outline";
import { DecorativeBlocks } from "@/components/decorative-blocks";
import { inputClass, textareaClass, labelClass } from "@/lib/form-styles";

type PlanType = "one-time" | "recurring";

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

  function applyConversionEnginePreset() {
    setPlanType("recurring");
    setAmount("8000");
    setDescription("Conversion Engine — monthly retainer. Full conversion team managing your post-click revenue system. Audit, roadmap, page builds, testing, AOV optimisation, and monthly reporting.");
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
    <div className="relative min-h-screen">
      <DecorativeBlocks />
      <div className="relative z-10 max-w-lg mx-auto px-6 md:px-12 py-16 md:py-24">
        <div className="mb-12">
          <h1 className="text-[28px] font-bold mb-2">
            Payment Link
          </h1>
          <p className="text-subtle">
            Generate a checkout link to send to a client
          </p>
        </div>

        <div className="space-y-6">
          {/* Presets */}
          <div>
            <label className={labelClass}>Quick Preset</label>
            <button
              onClick={applyConversionEnginePreset}
              className="w-full flex items-center gap-3 px-4 py-3 bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-colors"
            >
              <BoltIcon className="size-4 text-warning" />
              <div className="text-left flex-1">
                <p className="text-sm font-semibold">Conversion Engine</p>
                <p className="text-[10px] text-background/60">£8,000/mo recurring retainer</p>
              </div>
            </button>
          </div>

          {/* Plan type toggle */}
          <div>
            <label className={labelClass}>Plan Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(["one-time", "recurring"] as PlanType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setPlanType(type)}
                  className={`py-2.5 text-sm font-medium rounded-lg border-2 transition-colors ${
                    planType === type
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-subtle hover:border-border"
                  }`}
                >
                  {type === "one-time" ? "One-time" : "Monthly"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass}>Client Name *</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. Ecomlanders"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Client Email</label>
            <input
              type="email"
              className={inputClass}
              placeholder="e.g. client@example.com"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>
              Amount (GBP) *
              {planType === "recurring" && <span className="ml-2 text-subtle font-normal text-xs">per month</span>}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-subtle">
                £
              </span>
              <input
                type="number"
                min="0.50"
                step="0.01"
                className={`${inputClass} pl-7`}
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            {planType === "recurring" && amount && parseFloat(amount) > 0 && (
              <p className="text-[11px] text-subtle mt-1.5">
                Billed monthly • First payment £{parseFloat(amount).toLocaleString("en-GB")} • Renews every 30 days
              </p>
            )}
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea
              className={textareaClass}
              rows={3}
              placeholder="What's this payment for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {error && (
            <div className="px-4 py-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger">
              {error}
            </div>
          )}

          {paymentUrl ? (
            <div className="space-y-4">
              <div className="px-4 py-3 bg-success/10 border border-success/20 rounded-lg">
                <p className="text-sm font-medium text-success mb-2">
                  {planType === "recurring" ? "Recurring subscription link created" : "Payment link created"}
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={paymentUrl}
                    className="flex-1 px-3 py-2 bg-surface border border-border rounded-md text-sm text-subtle truncate"
                  />
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-2 bg-foreground text-background text-sm font-medium rounded-md hover:bg-foreground/90 transition-colors shrink-0"
                  >
                    {copied ? (
                      <>
                        <CheckIcon className="size-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <ClipboardDocumentIcon className="size-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              <button
                onClick={handleReset}
                className="w-full py-2.5 text-sm font-medium text-subtle border border-border rounded-md hover:bg-surface-raised transition-colors"
              >
                Create another
              </button>
            </div>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={!canSubmit || loading}
              className="w-full py-2.5 bg-foreground text-background text-sm font-medium rounded-md hover:bg-foreground/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Creating…" : planType === "recurring" ? "Generate Subscription Link" : "Generate Payment Link"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
