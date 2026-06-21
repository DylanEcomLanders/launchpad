"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpTrayIcon,
  XMarkIcon,
  ArrowRightCircleIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import {
  PODS,
  LEADS,
  LEAD_STATUS_LABEL,
  capacityUsed,
  BDM,
  A_BUCKET_POINTS,
  type Lead,
  type LeadStatus,
} from "../mock-data";
import { AnnotationStrip, SectionHeader, Card } from "../components";

const STATUS_TONE: Record<LeadStatus, string> = {
  new: "bg-[#222222] text-[#71757D] border-[#2A2A2A]",
  engaged: "bg-blue-50 text-blue-700 border-blue-200",
  call_booked: "bg-purple-50 text-purple-700 border-purple-200",
  proposal_sent: "bg-amber-50 text-amber-800 border-amber-200",
  won: "bg-emerald-50 text-emerald-700 border-emerald-200",
  lost: "bg-rose-50 text-rose-700 border-rose-200",
};

let csvSeq = 0;

export default function GrowthClient() {
  const [leads, setLeads] = useState<Lead[]>(() => LEADS.map((l) => ({ ...l })));
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvText, setCsvText] = useState(
    "company,contact,email,value\nDune Coffee,Ola Berg,ola@dunecoffee.com,8000\nVellum Books,Ros Tan,ros@vellum.com,12000",
  );
  const [toast, setToast] = useState("");

  // Capacity bridge — what the BDM needs: how much delivery headroom is open.
  const bridge = useMemo(() => {
    const rows = PODS.map((p) => {
      const used = capacityUsed(p.id);
      return { pod: p, used, available: Math.max(0, p.capacityTotal - used) };
    });
    const totalAvailable = rows.reduce((s, r) => s + r.available, 0);
    return { rows, totalAvailable, aBuckets: Math.floor(totalAvailable / A_BUCKET_POINTS) };
  }, []);

  function setStatus(id: string, status: LeadStatus) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
  }

  function sendToIntake(id: string) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, sentToIntake: true } : l)));
    const l = leads.find((x) => x.id === id);
    flash(`${l?.company} sent to Monday Protocol intake → lands as a parked client for pod assignment.`);
  }

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  }

  function importCsv() {
    const lines = csvText.trim().split("\n");
    const rows = lines.slice(1).filter(Boolean); // skip header
    const added: Lead[] = rows.map((line) => {
      const [company, contact, email, value] = line.split(",").map((s) => s?.trim() ?? "");
      return {
        id: `csv-${csvSeq++}`,
        company: company || "Untitled",
        contact: contact || "",
        email: email || "",
        status: "new" as LeadStatus,
        estValue: Number(value) || 0,
        source: "CSV import",
      };
    });
    setLeads((prev) => [...added, ...prev]);
    setCsvOpen(false);
    flash(`Imported ${added.length} lead${added.length === 1 ? "" : "s"} from CSV.`);
  }

  const wonValue = leads.filter((l) => l.status === "won").reduce((s, l) => s + l.estValue, 0);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
      <AnnotationStrip title="What changed — Growth Pipeline">
        <p>
          <strong>Deliberately thin.</strong> The BDM ({BDM.name}) runs outbound in her own tool —
          this is not a CRM. It&apos;s a leads table with CSV import, just enough to hold leads and
          hand won deals to intake without dual-keying.
        </p>
        <p>
          <strong>It exists for two connections to delivery:</strong> the capacity bridge (so she
          paces outbound to real pod headroom) and the won→intake handoff (into the Monday
          Protocol). Named &quot;Growth Pipeline&quot; so it never collides with the pod Pipeline or
          Hiring Pipeline.
        </p>
      </AnnotationStrip>

      {/* Capacity bridge */}
      <SectionHeader>Capacity bridge · how much can we sell?</SectionHeader>
      <Card className="mb-7">
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <div className="grid grid-cols-3 gap-3">
            {bridge.rows.map((r) => {
              const pct = Math.min(100, Math.round((r.used / r.pod.capacityTotal) * 100));
              const tone = pct >= 100 ? "bg-rose-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500";
              return (
                <div key={r.pod.id} className="rounded-lg border border-[#2A2A2A] bg-[#181818] p-3">
                  <div className="text-[11px] font-medium text-[#71757D]">{r.pod.tagline}</div>
                  <div className="mt-1 text-lg font-semibold tabular-nums text-[#E5E5EA]">
                    {r.available} <span className="text-[11px] font-normal text-[#71757D]">pts open</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#222222]">
                    <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex flex-col justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-3 text-center">
            <div className="text-3xl font-semibold tabular-nums text-emerald-700">~{bridge.aBuckets}</div>
            <div className="text-[12px] font-medium text-emerald-700">A-buckets sellable</div>
            <div className="mt-0.5 text-[10px] text-emerald-600">
              {bridge.totalAvailable} pts open this month
            </div>
          </div>
        </div>
      </Card>

      {/* Leads table */}
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#71757D]">
          Leads <span className="text-[#71757D]">({leads.length})</span>
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-[#71757D]">
            Won pipeline: <span className="font-semibold text-emerald-700">£{wonValue.toLocaleString()}/mo</span>
          </span>
          <button
            onClick={() => setCsvOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white bg-[#1B1B1B] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#F3F4F6]"
          >
            <ArrowUpTrayIcon className="size-4" /> Import CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#2A2A2A] bg-[#181818] shadow-[var(--shadow-soft)]">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-[#2A2A2A] bg-[#0C0C0C] text-left text-[11px] font-semibold uppercase tracking-wider text-[#71757D]">
              <th className="px-4 py-2.5">Company</th>
              <th className="px-4 py-2.5">Contact</th>
              <th className="px-4 py-2.5">Source</th>
              <th className="px-4 py-2.5 text-right">Est. value</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5 text-right">Handoff</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2A2A2A]">
            {leads.map((l) => (
              <tr key={l.id} className="hover:bg-[#0C0C0C]">
                <td className="px-4 py-2.5 font-medium text-[#E5E5EA]">{l.company}</td>
                <td className="px-4 py-2.5 text-[#71757D]">
                  <div>{l.contact}</div>
                  <div className="text-[11px] text-[#71757D]">{l.email}</div>
                </td>
                <td className="px-4 py-2.5 text-[12px] text-[#71757D]">{l.source}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-[#E5E5EA]">
                  £{l.estValue.toLocaleString()}
                </td>
                <td className="px-4 py-2.5">
                  <select
                    value={l.status}
                    onChange={(e) => setStatus(l.id, e.target.value as LeadStatus)}
                    className={`rounded-md border px-2 py-1 text-[12px] font-medium ${STATUS_TONE[l.status]}`}
                  >
                    {(Object.keys(LEAD_STATUS_LABEL) as LeadStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {LEAD_STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2.5 text-right">
                  {l.status === "won" ? (
                    l.sentToIntake ? (
                      <span className="inline-flex items-center gap-1 text-[12px] font-medium text-emerald-700">
                        <CheckCircleIcon className="size-4" /> In intake
                      </span>
                    ) : (
                      <button
                        onClick={() => sendToIntake(l.id)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[12px] font-medium text-emerald-700 hover:bg-emerald-100"
                      >
                        <ArrowRightCircleIcon className="size-4" /> Send to intake
                      </button>
                    )
                  ) : (
                    <span className="text-[12px] text-[#C5C5C5]">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CSV modal */}
      {csvOpen && (
        <div className="fixed inset-0 z-40 grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setCsvOpen(false)} />
          <div className="relative w-full max-w-lg rounded-xl border border-[#2A2A2A] bg-[#181818] p-6 shadow-[var(--shadow-elevated)]">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-[#E5E5EA]">Import leads from CSV</h3>
                <p className="mt-0.5 text-[12px] text-[#71757D]">
                  Paste rows as <code>company, contact, email, value</code>. First line is the header.
                </p>
              </div>
              <button onClick={() => setCsvOpen(false)} className="text-[#71757D] hover:text-[#E5E5EA]">
                <XMarkIcon className="size-5" />
              </button>
            </div>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={6}
              className="mt-4 w-full rounded-lg border border-[#2A2A2A] bg-[#181818] px-3 py-2.5 font-mono text-[12px] shadow-[var(--shadow-soft)] focus:border-white focus:outline-none focus:ring-1 focus:ring-[#1B1B1B]/10"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setCsvOpen(false)}
                className="rounded-lg border border-[#2A2A2A] px-3 py-1.5 text-sm font-medium text-[#71757D] hover:text-[#E5E5EA]"
              >
                Cancel
              </button>
              <button
                onClick={importCsv}
                className="rounded-lg bg-[#1B1B1B] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#F3F4F6]"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-[#1B1B1B] px-4 py-2.5 text-sm text-white shadow-[var(--shadow-elevated)]">
          {toast}
        </div>
      )}
    </div>
  );
}
