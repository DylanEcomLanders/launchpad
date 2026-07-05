"use client";

/* Outbound - SLA action queue for outbound leads.
 *
 * VISUAL BUILD ONLY. Rows are mock data held in local state; edits (owner /
 * status / deck / loom / feedback / first-responded) mutate local state and
 * persist nowhere yet. Wiring to come:
 *   - outbound_leads_mirror  (one-way reflection of the lead-gen Google Sheet:
 *     date, lead name, job title, company, website, email, campaign, phone,
 *     linkedin)
 *   - outbound_leads_internal (this editable layer, joined on lead email)
 *   - business-hours SLA computed at read time (Mon-Fri 09:00-18:00 London)
 *   - "Create deck" spawns a per-lead outreach deck; "Record loom" opens the
 *     script pre-filled from the row.
 *
 * The sort is the point of the surface, so it's real here: Band 1 "Needs
 * response" (first_responded_at IS NULL) on top, sorted by business-hours
 * elapsed DESCENDING - nearest breach on top. Band 2 "Everything else" below,
 * by recency. SLA colour uses the muted-status tokens, never hardcoded hex.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowTopRightOnSquareIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  VideoCameraIcon,
  PresentationChartBarIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { Table, THead, TBody, TR, TH, TD, Num } from "@/components/ui";

/* ── Model (mirrors the lead-gen sheet + the internal layer) ── */

type Status = "New" | "Responded" | "Awaiting" | "Booked" | "Dead";

interface Lead {
  email: string;
  name: string;
  jobTitle: string;
  company: string;
  website: string;
  campaign: string;
  // Internal, editable layer:
  owner: string; // "" = unassigned
  status: Status;
  deckLink: string; // "" = not created
  loomLink: string; // "" = not recorded
  feedback: string;
  firstRespondedAt: string | null; // null => Band 1 (needs response)
  // Derived/mock timing:
  elapsedMin: number; // business minutes elapsed (meaningful when unresponded)
  respondedAgo: string; // label for Band 2 recency
  respondedRank: number; // smaller = more recent (Band 2 sort)
}

/* ── SLA config (mirrors the real constants to come) ── */

const THRESHOLD_MIN = 5 * 60; // 5 business hours
const AMBER_WINDOW_MIN = 60; // < 1h to breach

type SlaState = "breached" | "amber" | "healthy";

function slaState(elapsedMin: number): SlaState {
  if (elapsedMin >= THRESHOLD_MIN) return "breached";
  if (elapsedMin >= THRESHOLD_MIN - AMBER_WINDOW_MIN) return "amber";
  return "healthy";
}

/* Muted-status palette: calm attention, not loud alerts. Colour carries the
 * SLA state on the age value; the legend decodes it. */
const SLA_META: Record<SlaState, { text: string }> = {
  breached: { text: "text-status-late" },
  amber: { text: "text-status-approaching" },
  healthy: { text: "text-status-ontrack" },
};

function fmtElapsed(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

const OWNERS = ["", "Ajay", "Dylan"];
const STATUSES: Status[] = ["New", "Responded", "Awaiting", "Booked", "Dead"];

/* ── Mock rows (shape mirrors the sheet columns) ── */

const SEED: Lead[] = [
  { email: "grace@lumenskin.co", name: "Grace Okafor", jobTitle: "Ecommerce Director", company: "Lumen Skincare", website: "lumenskin.co", campaign: "6/30 Campaign", owner: "Ajay", status: "New", deckLink: "", loomLink: "", feedback: "", firstRespondedAt: null, elapsedMin: 400, respondedAgo: "", respondedRank: 0 },
  { email: "tom@northsail.com", name: "Tom Reilly", jobTitle: "Head of Growth", company: "Northsail Coffee", website: "northsail.com", campaign: "6/30 Campaign", owner: "Dylan", status: "New", deckLink: "", loomLink: "", feedback: "", firstRespondedAt: null, elapsedMin: 312, respondedAgo: "", respondedRank: 0 },
  { email: "priya@verveath.com", name: "Priya Nair", jobTitle: "Founder", company: "Verve Athletic", website: "verveath.com", campaign: "6/30 Campaign", owner: "Ajay", status: "New", deckLink: "", loomLink: "", feedback: "", firstRespondedAt: null, elapsedMin: 265, respondedAgo: "", respondedRank: 0 },
  { email: "sam@oakmere.co.uk", name: "Sam Whitfield", jobTitle: "Marketing Lead", company: "Oakmere Home", website: "oakmere.co.uk", campaign: "6/30 Campaign", owner: "Dylan", status: "New", deckLink: "", loomLink: "", feedback: "", firstRespondedAt: null, elapsedMin: 65, respondedAgo: "", respondedRank: 0 },
  { email: "leah@pikerose.com", name: "Leah Cormac", jobTitle: "Ecommerce Manager", company: "Pike & Rose", website: "pikerose.com", campaign: "6/30 Campaign", owner: "", status: "New", deckLink: "", loomLink: "", feedback: "", firstRespondedAt: null, elapsedMin: 18, respondedAgo: "", respondedRank: 0 },
  { email: "will@brightbottle.com", name: "Will Amara", jobTitle: "Co-founder", company: "Bright Bottle Co", website: "brightbottle.com", campaign: "6/23 Campaign", owner: "Ajay", status: "Responded", deckLink: "", loomLink: "loom.com/s/abc", feedback: "Liked the hook, wants pricing", firstRespondedAt: "set", elapsedMin: 0, respondedAgo: "2h ago", respondedRank: 1 },
  { email: "nina@meadowlark.co", name: "Nina Voss", jobTitle: "Head of Ecommerce", company: "Meadowlark", website: "meadowlark.co", campaign: "6/23 Campaign", owner: "Dylan", status: "Booked", deckLink: "outbound/deck/meadowlark", loomLink: "loom.com/s/mw", feedback: "Call Thu 3pm", firstRespondedAt: "set", elapsedMin: 0, respondedAgo: "1d ago", respondedRank: 2 },
  { email: "rob@cinderco.com", name: "Rob Deakin", jobTitle: "Owner", company: "Cinder & Co", website: "cinderco.com", campaign: "6/16 Campaign", owner: "Ajay", status: "Awaiting", deckLink: "outbound/deck/cinder", loomLink: "", feedback: "Sent deck, chasing", firstRespondedAt: "set", elapsedMin: 0, respondedAgo: "3d ago", respondedRank: 3 },
  { email: "kate@halcyon.com", name: "Kate Lindqvist", jobTitle: "Director", company: "Halcyon Goods", website: "halcyon.com", campaign: "6/16 Campaign", owner: "Dylan", status: "Dead", deckLink: "", loomLink: "", feedback: "No budget this quarter", firstRespondedAt: "set", elapsedMin: 0, respondedAgo: "5d ago", respondedRank: 4 },
];

/* ── Token-styled inline controls ── */

const selectCls =
  "bg-transparent text-xs text-foreground rounded border border-transparent px-2 py-1 -mx-1 cursor-pointer appearance-none hover:border-border focus:border-foreground focus:outline-none";
const inputCls =
  "w-full bg-transparent text-xs text-muted placeholder:text-subtle rounded border border-transparent px-2 py-1 -mx-1 hover:border-border focus:border-foreground focus:text-foreground focus:outline-none";

/* ── Page ── */

export default function OutboundPage() {
  const [leads, setLeads] = useState<Lead[]>(SEED);
  const [query, setQuery] = useState("");
  const [ownerFilter, setOwnerFilter] = useState<"all" | string>("all");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  function update(email: string, patch: Partial<Lead>) {
    setLeads((rows) => rows.map((r) => (r.email === email ? { ...r, ...patch } : r)));
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      if (ownerFilter !== "all" && (l.owner || "Unassigned") !== ownerFilter) return false;
      if (!q) return true;
      return `${l.name} ${l.company} ${l.email} ${l.campaign}`.toLowerCase().includes(q);
    });
  }, [leads, query, ownerFilter]);

  const band1 = useMemo(
    () => filtered.filter((l) => l.firstRespondedAt === null).sort((a, b) => b.elapsedMin - a.elapsedMin),
    [filtered],
  );
  const band2 = useMemo(
    () => filtered.filter((l) => l.firstRespondedAt !== null).sort((a, b) => a.respondedRank - b.respondedRank),
    [filtered],
  );

  const needsResponse = leads.filter((l) => l.firstRespondedAt === null).length;

  return (
    <div className="px-6 md:px-10 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Outbound</h1>
          <p className="text-sm text-subtle mt-1">
            Response queue, mirrored one-way from the lead-gen sheet. Reply, then send a deck or record a loom.
          </p>
        </div>
      </div>

      {/* Actionable signals */}
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Needs response" value={String(needsResponse)} alert={needsResponse > 0} />
        <StatTile label="Avg response · this week" value="3.2h" hint="business hours · Mon-Fri 09:00-18:00" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-subtle tabular-nums mr-1">{filtered.length} of {leads.length}</span>
          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="h-8 px-2.5 rounded border border-border bg-surface text-xs text-muted appearance-none focus:outline-none focus:border-foreground"
          >
            <option value="all">All owners</option>
            <option value="Ajay">Ajay</option>
            <option value="Dylan">Dylan</option>
            <option value="Unassigned">Unassigned</option>
          </select>
        </div>
        <div className="relative w-full md:w-64">
          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-subtle z-10" />
          <input
            placeholder="Search lead, company, campaign"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 w-full pl-8 pr-3 rounded border border-border bg-surface text-xs text-muted placeholder:text-subtle focus:outline-none focus:border-foreground"
          />
        </div>
      </div>

      {/* Queue */}
      <div className="bg-surface border border-border-faint rounded overflow-x-auto">
        <Table>
          <THead>
            <TR hover={false}>
              <TH>Lead</TH>
              <TH>Title</TH>
              <TH>Company</TH>
              <TH>Owner</TH>
              <TH>Status</TH>
              <TH>Outreach</TH>
              <TH>Feedback</TH>
              <TH>Responded</TH>
              <TH align="right">Age</TH>
            </TR>
          </THead>

          {/* Band 1 - Needs response */}
          <TBody>
            <BandRow label="Needs response" count={band1.length} note="business-hours elapsed · nearest breach on top" />
            {band1.map((l) => {
              const meta = SLA_META[slaState(l.elapsedMin)];
              return (
                <TR key={l.email}>
                  <LeadCells lead={l} />
                  <OwnerCell lead={l} onChange={update} />
                  <StatusCell lead={l} onChange={update} />
                  <OutreachCell lead={l} onChange={update} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
                  <FeedbackCell lead={l} onChange={update} />
                  <TD>
                    <button
                      onClick={() => update(l.email, { firstRespondedAt: "set", status: l.status === "New" ? "Responded" : l.status, respondedAgo: "just now", respondedRank: -1 })}
                      className="text-xs text-muted hover:text-foreground rounded border border-transparent hover:border-border px-2 py-1 -mx-1 transition-colors whitespace-nowrap"
                    >
                      Mark responded
                    </button>
                  </TD>
                  <TD align="right">
                    <Num className={meta.text}>{fmtElapsed(l.elapsedMin)}</Num>
                  </TD>
                </TR>
              );
            })}
          </TBody>

          {/* Band 2 - Everything else */}
          <TBody>
            <BandRow label="Everything else" count={band2.length} note="responded · awaiting · booked · dead · by recency" />
            {band2.map((l) => (
              <TR key={l.email}>
                <LeadCells lead={l} dim={l.status === "Dead"} />
                <OwnerCell lead={l} onChange={update} />
                <StatusCell lead={l} onChange={update} />
                <OutreachCell lead={l} onChange={update} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
                <FeedbackCell lead={l} onChange={update} />
                <TD>
                  <span className="text-xs text-muted whitespace-nowrap">{l.respondedAgo}</span>
                </TD>
                <TD align="right">
                  <span className="text-subtle">—</span>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-2xs text-subtle">
        <LegendDot className="bg-status-late" label="Breached SLA" />
        <LegendDot className="bg-status-approaching" label="< 1h to breach" />
        <LegendDot className="bg-status-ontrack" label="On track" />
        <span className="ml-auto">Owner, status, outreach and feedback are inline-editable, writing to the internal layer only.</span>
      </div>
    </div>
  );
}

/* ── Header stat tile ── */

function StatTile({ label, value, hint, alert }: { label: string; value: string; hint?: string; alert?: boolean }) {
  return (
    <div className="bg-surface border border-border-faint rounded p-5">
      <div className="text-2xs uppercase tracking-wider text-subtle font-medium">{label}</div>
      <div className={`mt-2 text-xl font-semibold tabular-nums ${alert ? "text-status-late" : "text-foreground"}`}>{value}</div>
      {hint && <div className="mt-1 text-2xs text-subtle">{hint}</div>}
    </div>
  );
}

/* ── Row / cell pieces ── */

function BandRow({ label, count, note }: { label: string; count: number; note: string }) {
  return (
    <tr>
      <td colSpan={9} className="px-4 py-2.5 border-b border-border bg-surface-raised/30">
        <div className="flex items-center gap-2.5">
          <span className="text-2xs font-semibold uppercase tracking-wider text-foreground">{label}</span>
          <span className="rounded-full bg-surface-raised px-2 text-2xs text-muted tabular-nums">{count}</span>
          <span className="text-2xs text-subtle">{note}</span>
        </div>
      </td>
    </tr>
  );
}

function LeadCells({ lead, dim }: { lead: Lead; dim?: boolean }) {
  return (
    <>
      <TD className="max-w-[170px]">
        <span className={`block truncate ${dim ? "text-muted" : "text-foreground"}`}>{lead.name}</span>
      </TD>
      <TD className="max-w-[150px] text-muted">
        <span className="block truncate">{lead.jobTitle}</span>
      </TD>
      <TD className="max-w-[150px] text-muted">
        <span className="block truncate">{lead.company}</span>
      </TD>
    </>
  );
}

function OwnerCell({ lead, onChange }: { lead: Lead; onChange: (e: string, p: Partial<Lead>) => void }) {
  return (
    <TD>
      <select className={selectCls} value={lead.owner} onChange={(e) => onChange(lead.email, { owner: e.target.value })}>
        {OWNERS.map((o) => (
          <option key={o || "none"} value={o}>{o || "Assign…"}</option>
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
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    </TD>
  );
}

/* One outreach entry point per lead: click "Create" and choose deck or loom.
 * Whatever's been made shows as a view chip; the menu only offers what's left.
 * Wiring (spawn deck / open loom recorder) comes later. */
function OutreachCell({
  lead,
  onChange,
  menuOpen,
  setMenuOpen,
}: {
  lead: Lead;
  onChange: (e: string, p: Partial<Lead>) => void;
  menuOpen: string | null;
  setMenuOpen: (v: string | null) => void;
}) {
  const hasDeck = !!lead.deckLink;
  const hasLoom = !!lead.loomLink;
  const both = hasDeck && hasLoom;
  const open = menuOpen === lead.email;

  const createDeck = () => { onChange(lead.email, { deckLink: `outbound/deck/${lead.email.split("@")[0]}` }); setMenuOpen(null); };
  const recordLoom = () => { onChange(lead.email, { loomLink: "https://loom.com/record" }); setMenuOpen(null); };

  return (
    <TD>
      <div className="relative flex items-center gap-1.5">
        {hasDeck && <AssetChip label="Deck" Icon={PresentationChartBarIcon} link={lead.deckLink} />}
        {hasLoom && <AssetChip label="Loom" Icon={VideoCameraIcon} link={lead.loomLink} />}
        {!both && (
          <button
            onClick={() => setMenuOpen(open ? null : lead.email)}
            className="inline-flex items-center gap-1 h-7 px-2 rounded border border-border-faint bg-surface text-2xs text-muted hover:border-border hover:text-foreground transition-colors"
          >
            <PlusIcon className="size-3" />
            {!hasDeck && !hasLoom && "Create"}
            <ChevronDownIcon className="size-3" />
          </button>
        )}
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
            <div className="absolute top-full left-0 z-20 mt-1 min-w-[9rem] rounded border border-border bg-surface-raised py-1 shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
              {!hasDeck && (
                <button onClick={createDeck} className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-muted hover:bg-surface hover:text-foreground">
                  <PresentationChartBarIcon className="size-3.5" /> Create deck
                </button>
              )}
              {!hasLoom && (
                <button onClick={recordLoom} className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-muted hover:bg-surface hover:text-foreground">
                  <VideoCameraIcon className="size-3.5" /> Record loom
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </TD>
  );
}

function AssetChip({ label, Icon, link }: { label: string; Icon: typeof VideoCameraIcon; link: string }) {
  const href = link.startsWith("http") ? link : `/${link}`;
  return (
    <Link
      href={href}
      target="_blank"
      className="inline-flex items-center gap-1 h-7 px-2 rounded border border-border bg-surface-raised text-2xs font-medium text-foreground hover:border-muted transition-colors"
    >
      <Icon className="size-3.5" />
      {label}
      <ArrowTopRightOnSquareIcon className="size-3 text-subtle" />
    </Link>
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
      <span className={`h-1.5 w-1.5 rounded-full ${className}`} />
      {label}
    </span>
  );
}
