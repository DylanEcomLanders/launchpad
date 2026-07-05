"use client";

import { useState } from "react";
import { addEngagement, listClients, getResponsibilities } from "@/lib/command-centre/store";
import type { EngType, Tier } from "@/lib/command-centre/model";

const input = "w-full rounded border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-subtle outline-none transition-colors focus:border-foreground/30";
const TIER_VALUE: Record<Tier, number> = { "5k": 5000, "10k": 10000, "15k": 15000 };

function todayISO() { return new Date().toISOString().slice(0, 10); }
function plusDays(iso: string, d: number) { return new Date(new Date(iso).getTime() + d * 86_400_000).toISOString().slice(0, 10); }

export function NewEngagementModal({ presetClientId, onClose, onCreated }: { presetClientId?: string; onClose: () => void; onCreated: (id: string) => void }) {
  const clients = listClients();
  const resp = getResponsibilities();
  const [clientId, setClientId] = useState(presetClientId ?? (clients[0]?.id ?? "new"));
  const [clientName, setClientName] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<EngType>("retainer");
  const [tier, setTier] = useState<Tier>("10k");
  const [value, setValue] = useState("");
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(plusDays(todayISO(), 90));
  const [csm, setCsm] = useState(resp.reporting ?? "");
  const [pod, setPod] = useState("");

  const isNew = !presetClientId && clientId === "new";
  const canSubmit = name.trim() !== "" && (isNew ? clientName.trim() !== "" : true) && (type === "retainer" || Number(value) > 0);

  function submit() {
    if (!canSubmit) return;
    const id = addEngagement({
      clientId: isNew ? undefined : clientId,
      clientName: isNew ? clientName : undefined,
      name, type, tier: type === "retainer" ? tier : undefined,
      value: type === "retainer" ? TIER_VALUE[tier] : Number(value),
      startDate,
      renewalDate: type === "retainer" ? endDate : undefined,
      targetEndDate: type === "project" ? endDate : undefined,
      goal: type === "retainer" ? "renew" : "convert",
      csm: csm || undefined, pod: pod || undefined,
    });
    onCreated(id);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded border border-border bg-surface-raised p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-sm font-semibold">New engagement</h2>

        <div className="mt-4 space-y-3">
          <Field label="Client">
            {presetClientId ? (
              <div className="text-sm text-foreground">{clients.find((c) => c.id === presetClientId)?.name ?? "This client"}</div>
            ) : (
              <select className={input} value={clientId} onChange={(e) => setClientId(e.target.value)}>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                <option value="new">+ New client…</option>
              </select>
            )}
          </Field>

          {isNew && <Field label="Client name"><input className={input} value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Acme Skincare" /></Field>}

          <Field label="Engagement name"><input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Conversion partnership · Full site build" /></Field>

          <Field label="Type"><Seg value={type} onChange={(v) => setType(v as EngType)} options={[["retainer", "Retainer"], ["project", "Project"]]} /></Field>

          {type === "retainer" ? (
            <Field label="Tier"><Seg value={tier} onChange={(v) => setTier(v as Tier)} options={[["5k", "£5k"], ["10k", "£10k"], ["15k", "£15k"]]} /></Field>
          ) : (
            <Field label="Project value (£)"><input className={input} type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="4500" /></Field>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Start date"><input className={input} type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setEndDate(plusDays(e.target.value, 90)); }} /></Field>
            <Field label={type === "retainer" ? "Renewal date" : "Target end"}><input className={input} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="CSM"><input className={input} value={csm} onChange={(e) => setCsm(e.target.value)} placeholder="Priya" /></Field>
            <Field label="Pod"><input className={input} value={pod} onChange={(e) => setPod(e.target.value)} placeholder="Pod 1" /></Field>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded border border-border px-3 py-2 text-xs text-muted transition-colors hover:text-foreground">Cancel</button>
          <button onClick={submit} disabled={!canSubmit} className="rounded bg-accent px-3 py-2 text-xs font-medium text-accent-foreground transition-opacity disabled:opacity-40">Create engagement</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1 block text-2xs font-medium uppercase tracking-wider text-subtle">{label}</label>{children}</div>;
}
function Seg({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div className="inline-flex rounded border border-border-faint p-0.5">
      {options.map(([v, l]) => (
        <button key={v} onClick={() => onChange(v)} className={`rounded-sm px-2.5 py-1 text-xs transition-colors ${value === v ? "bg-surface text-foreground" : "text-muted hover:text-foreground"}`}>{l}</button>
      ))}
    </div>
  );
}
