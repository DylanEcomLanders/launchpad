"use client";

/* Outbound - SLA action queue for outbound leads.
 *
 * VISUAL BUILD ONLY. Rows are mock data held in local state; the internal-
 * column edits (owner / status / asset / link / feedback / first-responded)
 * mutate local state and persist nowhere yet. Wiring to come:
 *   - outbound_leads_mirror  (one-way reflection of the lead-gen sheet)
 *   - outbound_leads_internal (this editable layer, joined on lead_email)
 *   - business-hours SLA computed at read time (Mon-Fri 09:00-18:00 London)
 *
 * The sort is the point of the surface, so it's real here: Band 1 "Needs
 * response" (first_responded_at IS NULL) on top, sorted by business-hours
 * elapsed DESCENDING - nearest breach on top; brand-new leads at the bottom.
 * Band 2 "Everything else" below, by recency. SLA colour comes from tokens
 * (--success / --warning / --danger), never hardcoded hex.
 */

import { useMemo, useState } from "react";
import {
  PageHeader,
  StatTile,
  Card,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  Num,
} from "@/components/ui";

/* ── Model ── */

type Status = "New" | "Responded" | "Awaiting" | "Booked" | "Dead";
type AssetType = "Loom" | "Deck" | "Both" | "";

interface Lead {
  email: string;
  brand: string;
  website: string;
  // Internal, editable layer:
  owner: string; // "" = unassigned
  status: Status;
  assetType: AssetType;
  assetLink: string;
  feedback: string;
  firstRespondedAt: string | null; // null => Band 1 (needs response)
  // Derived/mock timing:
  elapsedMin: number; // business minutes elapsed (meaningful when unresponded)
  respondedAgo: string; // label for Band 2 recency
  respondedRank: number; // smaller = more recent (Band 2 sort)
}

/* ── Config (mirrors the real SLA constants to come) ── */

const THRESHOLD_MIN = 5 * 60; // 5 business hours
const AMBER_WINDOW_MIN = 60; // < 1h to breach

type SlaState = "breached" | "amber" | "healthy";

function slaState(elapsedMin: number): SlaState {
  if (elapsedMin >= THRESHOLD_MIN) return "breached";
  if (elapsedMin >= THRESHOLD_MIN - AMBER_WINDOW_MIN) return "amber";
  return "healthy";
}

const SLA_META: Record<SlaState, { label: string; text: string; accent: string }> = {
  breached: { label: "Breached", text: "text-danger", accent: "var(--color-danger)" },
  amber: { label: "<1h to breach", text: "text-warning", accent: "var(--color-warning)" },
  healthy: { label: "Healthy", text: "text-success", accent: "var(--color-success)" },
};

function fmtElapsed(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

const OWNERS = ["", "Ajay", "Dylan"];
const STATUSES: Status[] = ["New", "Responded", "Awaiting", "Booked", "Dead"];
const ASSET_TYPES: AssetType[] = ["", "Loom", "Deck", "Both"];

/* ── Mock rows ── */

const SEED: Lead[] = [
  { email: "grace@lumenskin.co", brand: "Lumen Skincare", website: "lumenskin.co", owner: "Ajay", status: "New", assetType: "", assetLink: "", feedback: "", firstRespondedAt: null, elapsedMin: 400, respondedAgo: "", respondedRank: 0 },
  { email: "tom@northsail.com", brand: "Northsail Coffee", website: "northsail.com", owner: "Dylan", status: "New", assetType: "", assetLink: "", feedback: "", firstRespondedAt: null, elapsedMin: 312, respondedAgo: "", respondedRank: 0 },
  { email: "priya@verveath.com", brand: "Verve Athletic", website: "verveath.com", owner: "Ajay", status: "New", assetType: "", assetLink: "", feedback: "", firstRespondedAt: null, elapsedMin: 265, respondedAgo: "", respondedRank: 0 },
  { email: "sam@oakmere.co.uk", brand: "Oakmere Home", website: "oakmere.co.uk", owner: "Dylan", status: "New", assetType: "", assetLink: "", feedback: "", firstRespondedAt: null, elapsedMin: 65, respondedAgo: "", respondedRank: 0 },
  { email: "leah@pikerose.com", brand: "Pike & Rose", website: "pikerose.com", owner: "", status: "New", assetType: "", assetLink: "", feedback: "", firstRespondedAt: null, elapsedMin: 18, respondedAgo: "", respondedRank: 0 },
  { email: "will@brightbottle.com", brand: "Bright Bottle Co", website: "brightbottle.com", owner: "Ajay", status: "Responded", assetType: "Loom", assetLink: "loom.com/s/abc", feedback: "Liked the hook, wants pricing", firstRespondedAt: "set", elapsedMin: 0, respondedAgo: "responded 2h ago", respondedRank: 1 },
  { email: "nina@meadowlark.co", brand: "Meadowlark", website: "meadowlark.co", owner: "Dylan", status: "Booked", assetType: "Both", assetLink: "cal.com/mw", feedback: "Call Thu 3pm", firstRespondedAt: "set", elapsedMin: 0, respondedAgo: "responded 1d ago", respondedRank: 2 },
  { email: "rob@cinderco.com", brand: "Cinder & Co", website: "cinderco.com", owner: "Ajay", status: "Awaiting", assetType: "Deck", assetLink: "", feedback: "Sent deck, chasing", firstRespondedAt: "set", elapsedMin: 0, respondedAgo: "responded 3d ago", respondedRank: 3 },
  { email: "kate@halcyon.com", brand: "Halcyon Goods", website: "halcyon.com", owner: "Dylan", status: "Dead", assetType: "", assetLink: "", feedback: "No budget this quarter", firstRespondedAt: "set", elapsedMin: 0, respondedAgo: "responded 5d ago", respondedRank: 4 },
];

/* ── Token-styled inline controls ── */

const selectCls =
  "bg-transparent text-xs text-foreground rounded-md border border-transparent px-2 py-1 -mx-1 cursor-pointer hover:border-border focus:border-border focus:outline-none focus:ring-1 focus:ring-ring";
const inputCls =
  "w-full bg-transparent text-xs text-muted placeholder:text-subtle rounded-md border border-transparent px-2 py-1 -mx-1 hover:border-border focus:border-border focus:text-foreground focus:outline-none focus:ring-1 focus:ring-ring";

/* ── Page ── */

export default function OutboundPage() {
  const [leads, setLeads] = useState<Lead[]>(SEED);

  function update(email: string, patch: Partial<Lead>) {
    setLeads((rows) => rows.map((r) => (r.email === email ? { ...r, ...patch } : r)));
  }

  const band1 = useMemo(
    () =>
      leads
        .filter((l) => l.firstRespondedAt === null)
        .sort((a, b) => b.elapsedMin - a.elapsedMin), // business-hours elapsed DESC
    [leads],
  );
  const band2 = useMemo(
    () =>
      leads
        .filter((l) => l.firstRespondedAt !== null)
        .sort((a, b) => a.respondedRank - b.respondedRank), // recency
    [leads],
  );

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-12 py-12">
      <PageHeader
        className="mb-8"
        title="Outbound"
        subtitle="SLA action queue · mirrored one-way from the lead-gen sheet"
        actions={
          <StatTile
            className="min-w-[13rem]"
            label="Avg response · this week"
            value="3.2h"
            context="business hours · Mon-Fri 09:00-18:00"
          />
        }
      />

      <Card className="overflow-hidden">
        <Table>
          <THead>
            <TR hover={false}>
              <TH>Lead</TH>
              <TH>Owner</TH>
              <TH>Status</TH>
              <TH>Asset</TH>
              <TH>Feedback</TH>
              <TH>First responded</TH>
              <TH align="right">SLA</TH>
            </TR>
          </THead>

          {/* Band 1 - Needs response */}
          <TBody>
            <BandRow label="Needs response" count={band1.length} note="sorted by business-hours elapsed · nearest breach on top" />
            {band1.map((l) => {
              const s = slaState(l.elapsedMin);
              const meta = SLA_META[s];
              return (
                <TR key={l.email} style={{ boxShadow: `inset 2px 0 0 ${meta.accent}` }}>
                  <LeadCell lead={l} />
                  <OwnerCell lead={l} onChange={update} />
                  <StatusCell lead={l} onChange={update} />
                  <AssetCell lead={l} onChange={update} />
                  <FeedbackCell lead={l} onChange={update} />
                  <TD>
                    <button
                      onClick={() => update(l.email, { firstRespondedAt: "set", status: l.status === "New" ? "Responded" : l.status, respondedAgo: "responded just now", respondedRank: -1 })}
                      className="text-xs text-muted hover:text-foreground rounded-md border border-transparent hover:border-border px-2 py-1 -mx-1 transition-colors"
                    >
                      Mark responded
                    </button>
                  </TD>
                  <TD align="right">
                    <div className="flex flex-col items-end gap-1">
                      <Num className={meta.text}>{fmtElapsed(l.elapsedMin)}</Num>
                      <span className={`text-2xs font-medium ${meta.text}`}>{meta.label}</span>
                    </div>
                  </TD>
                </TR>
              );
            })}
          </TBody>

          {/* Band 2 - Everything else */}
          <TBody>
            <BandRow label="Everything else" count={band2.length} note="responded · awaiting · booked · dead · sorted by recency" />
            {band2.map((l) => (
              <TR key={l.email}>
                <LeadCell lead={l} dim={l.status === "Dead"} />
                <OwnerCell lead={l} onChange={update} />
                <StatusCell lead={l} onChange={update} />
                <AssetCell lead={l} onChange={update} />
                <FeedbackCell lead={l} onChange={update} />
                <TD>
                  <span className="text-xs text-muted">{l.respondedAgo}</span>
                </TD>
                <TD align="right">
                  <span className="text-subtle">-</span>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-2xs text-subtle">
        <LegendDot className="bg-danger" label="Breached SLA" />
        <LegendDot className="bg-warning" label="< 1h to breach" />
        <LegendDot className="bg-success" label="Healthy" />
        <span className="ml-auto">Owner · status · asset · feedback are inline-editable · writes to the internal layer only.</span>
      </div>
    </div>
  );
}

/* ── Row / cell pieces ── */

function BandRow({ label, count, note }: { label: string; count: number; note: string }) {
  return (
    <tr className="bg-surface-raised/40">
      <td colSpan={7} className="px-5 py-2.5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <span className="text-2xs font-semibold uppercase tracking-wider text-foreground">{label}</span>
          <span className="rounded-full bg-surface-raised px-2 text-2xs text-muted tabular-nums">{count}</span>
          <span className="text-2xs text-subtle">{note}</span>
        </div>
      </td>
    </tr>
  );
}

function LeadCell({ lead, dim }: { lead: Lead; dim?: boolean }) {
  return (
    <TD>
      <div className={dim ? "text-muted" : "text-foreground"}>{lead.brand}</div>
      <div className="text-2xs text-subtle">{lead.email}</div>
    </TD>
  );
}

function OwnerCell({ lead, onChange }: { lead: Lead; onChange: (e: string, p: Partial<Lead>) => void }) {
  return (
    <TD>
      <select className={selectCls} value={lead.owner} onChange={(e) => onChange(lead.email, { owner: e.target.value })}>
        {OWNERS.map((o) => (
          <option key={o || "none"} value={o}>
            {o || "Assign…"}
          </option>
        ))}
      </select>
    </TD>
  );
}

function StatusCell({ lead, onChange }: { lead: Lead; onChange: (e: string, p: Partial<Lead>) => void }) {
  return (
    <TD>
      <select className={selectCls} value={lead.status} onChange={(e) => onChange(lead.email, { status: e.target.value as Status })}>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </TD>
  );
}

function AssetCell({ lead, onChange }: { lead: Lead; onChange: (e: string, p: Partial<Lead>) => void }) {
  return (
    <TD>
      <div className="flex flex-col gap-0.5">
        <select className={selectCls} value={lead.assetType} onChange={(e) => onChange(lead.email, { assetType: e.target.value as AssetType })}>
          {ASSET_TYPES.map((a) => (
            <option key={a || "none"} value={a}>
              {a || "Type"}
            </option>
          ))}
        </select>
        <input
          className={inputCls}
          value={lead.assetLink}
          placeholder="asset link"
          onChange={(e) => onChange(lead.email, { assetLink: e.target.value })}
        />
      </div>
    </TD>
  );
}

function FeedbackCell({ lead, onChange }: { lead: Lead; onChange: (e: string, p: Partial<Lead>) => void }) {
  return (
    <TD className="min-w-[11rem]">
      <input
        className={inputCls}
        value={lead.feedback}
        placeholder="add feedback…"
        onChange={(e) => onChange(lead.email, { feedback: e.target.value })}
      />
    </TD>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-sm ${className}`} />
      {label}
    </span>
  );
}
