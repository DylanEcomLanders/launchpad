"use client";

/* ── Checkout (admin) ──
 * Create a sign+pay+invoice link for a client and track its status. Each row is
 * a Checkout; "New" generates the token link you send. Admin/CRO only.
 * The client-facing flow lives at /checkout/[token].
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { PlusIcon, XMarkIcon, LinkIcon, CheckIcon } from "@heroicons/react/24/outline";
import { loadCheckouts, saveCheckout, newCheckout, checkoutUrl } from "@/lib/checkout/data";
import { STATUS_LABEL } from "@/lib/checkout/types";
import type { Checkout, EngagementType } from "@/lib/checkout/types";

const money = (n: number, ccy = "GBP") => new Intl.NumberFormat("en-GB", { style: "currency", currency: ccy }).format(n);
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

const STATUS_TONE: Record<string, string> = {
  draft: "text-subtle",
  sent: "text-muted",
  signed: "text-status-approaching",
  paid: "text-status-ontrack",
  complete: "text-status-ontrack",
};

export default function CheckoutsPage() {
  const [rows, setRows] = useState<Checkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    loadCheckouts().then((r) => {
      if (!alive) return;
      setRows(r);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const onCreated = useCallback((c: Checkout) => {
    setRows((prev) => [c, ...prev]);
    setAdding(false);
  }, []);

  const copyLink = useCallback((c: Checkout) => {
    const url = checkoutUrl(c.token);
    void navigator.clipboard?.writeText(url);
    setCopied(c.id);
    setTimeout(() => setCopied((cur) => (cur === c.id ? null : cur)), 1500);
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-border-faint px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Checkout</h1>
          <p className="text-2xs text-subtle">Sign + pay + invoice links for clients · {rows.length}</p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 rounded border border-border bg-surface-raised px-3 py-1.5 text-xs font-medium text-foreground hover:opacity-90"
        >
          <PlusIcon className="size-4" /> New checkout
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4">
        {loading ? (
          <p className="text-sm text-subtle">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-16 text-center text-sm text-subtle">
            No checkouts yet. Create one to generate a link.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-surface-hover text-2xs font-semibold uppercase tracking-wide text-subtle">
                  <th className="px-3 py-2 font-semibold">Client</th>
                  <th className="px-3 py-2 font-semibold">Amount</th>
                  <th className="px-3 py-2 font-semibold">Type</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Created</th>
                  <th className="px-3 py-2 font-semibold text-right">Link</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="border-t border-border-faint">
                    <td className="px-3 py-2.5 text-sm text-foreground">
                      {c.clientName}
                      {c.company && <span className="text-subtle"> · {c.company}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-sm tabular-nums text-muted">
                      {money(c.amountGross, c.currency)}
                      {c.engagementType === "retainer" && <span className="text-subtle">/mo</span>}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-muted capitalize">{c.engagementType}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-sm font-medium ${STATUS_TONE[c.status] ?? "text-muted"}`}>{STATUS_LABEL[c.status]}</span>
                    </td>
                    <td className="px-3 py-2.5 text-sm tabular-nums text-subtle">{fmtDate(c.created_at)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        onClick={() => copyLink(c)}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-2xs text-muted hover:bg-surface-hover hover:text-foreground"
                      >
                        {copied === c.id ? <CheckIcon className="size-3.5 text-status-ontrack" /> : <LinkIcon className="size-3.5" />}
                        {copied === c.id ? "Copied" : "Copy"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {adding && <NewCheckoutModal onClose={() => setAdding(false)} onCreated={onCreated} />}
    </div>
  );
}

function NewCheckoutModal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: Checkout) => void }) {
  const [clientName, setClientName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [engagementType, setEngagementType] = useState<EngagementType>("retainer");
  const [amount, setAmount] = useState("");
  const [scope, setScope] = useState("");
  const [saving, setSaving] = useState(false);

  const amountNum = Number(amount.replace(/[^0-9.]/g, ""));
  const valid = clientName.trim() && email.trim() && amountNum > 0;

  const submit = useMemo(
    () => async () => {
      if (!valid) return;
      setSaving(true);
      const c = newCheckout({ clientName, company, email, clientAddress, engagementType, amountGross: amountNum, scope });
      await saveCheckout(c);
      setSaving(false);
      onCreated(c);
    },
    [valid, clientName, company, email, clientAddress, engagementType, amountNum, scope, onCreated],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[8vh]" onClick={onClose}>
      <div className="w-full max-w-md overflow-hidden rounded border border-border bg-surface" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border-faint px-4 py-3">
          <span className="text-2xs font-semibold uppercase tracking-wide text-subtle">New checkout</span>
          <button onClick={onClose} className="rounded p-1 text-subtle hover:bg-surface-raised hover:text-foreground">
            <XMarkIcon className="size-4" />
          </button>
        </div>
        <div className="space-y-3 px-4 py-4">
          <Field label="Client name">
            <input autoFocus value={clientName} onChange={(e) => setClientName(e.target.value)} className={inputCls} placeholder="Jane Doe" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Company">
              <input value={company} onChange={(e) => setCompany(e.target.value)} className={inputCls} placeholder="Acme Ltd" />
            </Field>
            <Field label="Email">
              <input value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="jane@acme.com" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Engagement">
              <select value={engagementType} onChange={(e) => setEngagementType(e.target.value as EngagementType)} className={inputCls}>
                <option value="retainer">Retainer (monthly)</option>
                <option value="project">One-time project</option>
              </select>
            </Field>
            <Field label={`Amount (£, VAT-incl${engagementType === "retainer" ? "/mo" : ""})`}>
              <input value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} placeholder="10000" inputMode="decimal" />
            </Field>
          </div>
          <Field label="Client registered address (for the agreement)">
            <input value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} className={inputCls} placeholder="12 Example Road, London, EC1A 1BB" />
          </Field>
          <Field label="Scope (optional)">
            <input value={scope} onChange={(e) => setScope(e.target.value)} className={inputCls} placeholder="What's included" />
          </Field>
        </div>
        <div className="flex justify-end border-t border-border-faint px-4 py-3">
          <button
            onClick={submit}
            disabled={!valid || saving}
            className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:opacity-90 disabled:opacity-40"
          >
            {saving ? "Creating…" : "Create + get link"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded border border-border bg-surface-raised px-2.5 py-1.5 text-sm text-foreground outline-none placeholder:text-subtle/60 focus:border-ring";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-2xs font-medium uppercase tracking-wide text-subtle">{label}</span>
      {children}
    </label>
  );
}
