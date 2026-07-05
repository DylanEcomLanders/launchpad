"use client";

/* ── Client profile ──
 * The reference surface. Ten-second test: what do I chase, who do I email,
 * where's the evidence. Header + the engagement's checklist (editable, owners
 * + evidence, overdue flagged) + files + prior engagements. No health scoring,
 * no stat cards, no duplication — the outstanding item IS the next action.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeftIcon, CheckCircleIcon, PaperClipIcon, ArrowUpRightIcon, PlusIcon } from "@heroicons/react/24/outline";
import { getEngagementView, getResponsibilities, toggleItem, type EngagementView } from "@/lib/command-centre/store";
import { ROLE_LABEL, GROUP_LABEL, GROUP_ORDER, engagementTitle, engagementBilled, itemDone, itemDueISO, itemDueDay, itemOverdue, daysUntil, type ChecklistItem, type Responsibilities } from "@/lib/command-centre/model";
import { NewEngagementModal } from "../_new-engagement";

function fmtDate(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
function fmtWD(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export default function ClientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);
  const [view, setView] = useState<EngagementView | null | undefined>(undefined);
  const [resp, setResp] = useState<Responsibilities | null>(null);

  const reload = () => { setView(getEngagementView(id)); setResp(getResponsibilities()); };
  useEffect(reload, [id]);

  if (view === undefined) return <div className="px-6 pt-10 md:px-10" />;
  if (view === null) return <div className="px-6 pt-10 text-sm text-muted md:px-10">Engagement not found. <Link href="/clients" className="underline">Back to clients</Link></div>;

  const { engagement: e, client, prior } = view;
  const all = [e, ...prior].sort((a, b) => (a.status === "active" ? 0 : 1) - (b.status === "active" ? 0 : 1) || (a.startDate < b.startDate ? 1 : -1));
  const recurring = all.filter((x) => x.type === "retainer" && x.status === "active").reduce((s, x) => s + x.value, 0);
  const billed = all.reduce((s, x) => s + engagementBilled(x), 0);
  const active = e.status === "active";
  // A finished engagement's cadence stops at its end — don't keep generating occurrences against today.
  const clock = active ? new Date() : new Date(e.targetEndDate ?? e.renewalDate ?? e.startDate);
  const endDays = daysUntil(e.type === "project" ? e.targetEndDate : e.renewalDate);
  const onToggle = (key: string) => { toggleItem(e.id, key); reload(); };
  const groups = GROUP_ORDER.map((g) => ({ g, items: e.items.filter((i) => i.group === g) })).filter((x) => x.items.length);

  return (
    <div className="space-y-6 px-6 pb-20 pt-8 md:px-10">
      <Link href="/clients" className="inline-flex items-center gap-1.5 text-xs text-subtle transition-colors hover:text-muted">
        <ArrowLeftIcon className="size-3.5" />Clients
      </Link>

      {/* ── client header ── */}
      <div className="rounded border border-border-faint bg-surface p-5">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-xl font-semibold">{client.name}</h1>
            <p className="mt-1 text-sm text-muted">
              {recurring > 0 && <><span className="font-medium tabular-nums text-foreground">£{recurring.toLocaleString()}</span>/mo recurring · </>}
              <span className="font-medium tabular-nums text-foreground">£{billed.toLocaleString()}</span> billed to date · {all.length} engagement{all.length > 1 ? "s" : ""}
            </p>
          </div>
          <div className="text-right text-xs text-muted">
            {client.contactName && <div className="text-foreground">{client.contactName} <span className="text-subtle">· {client.contactRole}</span></div>}
            {client.contactEmail && <div>{client.contactEmail}</div>}
          </div>
        </div>
      </div>

      {/* ── engagements switcher ── */}
      <div>
        <p className="mb-2 text-3xs font-medium uppercase tracking-wider text-subtle">Engagements</p>
        <div className="flex flex-wrap gap-2">
          {all.map((x) => (
            <button
              key={x.id}
              onClick={() => x.id !== e.id && router.push(`/clients/${x.id}`)}
              className={`rounded border px-3 py-2 text-left transition-colors ${x.id === e.id ? "border-border bg-surface-raised" : "border-border-faint hover:bg-surface-raised"}`}
            >
              <div className="flex items-center gap-2 text-sm">
                <span className={`size-1.5 rounded-full ${x.status === "active" ? "bg-status-ontrack" : "bg-subtle"}`} />
                <span className={x.id === e.id ? "font-medium text-foreground" : "text-muted"}>{engagementTitle(x)}</span>
              </div>
              <div className="mt-1 text-2xs text-subtle">{x.type === "retainer" ? `£${x.tier}/mo` : `£${x.value.toLocaleString()}`} · {x.status}</div>
            </button>
          ))}
          <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-1 rounded border border-dashed border-border px-3 text-2xs text-subtle transition-colors hover:text-muted"><PlusIcon className="size-3" />New engagement</button>
        </div>
      </div>

      {/* ── selected engagement ── */}
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          <span className="text-sm font-medium text-foreground">{engagementTitle(e)}</span>
          <span>{e.type === "retainer" ? `£${e.tier}/mo` : `£${e.value.toLocaleString()}`}</span>
          <span>Goal: {e.goal === "renew" ? "renewal" : "convert"}</span>
          <Kv k="Started" v={fmtDate(e.startDate)} />
          <Kv k={!active ? "Ended" : e.type === "project" ? "Ends" : "Renews"} v={!active ? fmtDate(e.type === "project" ? e.targetEndDate : e.renewalDate) : `${fmtDate(e.type === "project" ? e.targetEndDate : e.renewalDate)}${endDays !== null ? ` · ${endDays}d` : ""}`} tone={active && endDays !== null && endDays <= 14 ? "warn" : undefined} />
          <Kv k="Pod" v={e.pod ?? "—"} />
          <Kv k="CSM" v={e.csm ?? "—"} />
        </div>

        <div className="space-y-6">
          {groups.map(({ g, items }) => (
            <div key={g}>
              <p className="mb-2 text-3xs font-medium uppercase tracking-wider text-subtle">{GROUP_LABEL[g]}</p>
              <div className="rounded border border-border-faint bg-surface">
                {items.map((item, i) => (
                  <ChecklistRow key={item.key} item={item} startDate={e.startDate} clock={clock} active={active} owner={resp?.[item.ownerRole]} first={i === 0} onToggle={() => onToggle(item.key)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── files (stub until Files ships) ── */}
      <div>
        <p className="mb-2 text-3xs font-medium uppercase tracking-wider text-subtle">Files</p>
        <div className="rounded border border-border-faint bg-surface p-5 text-center">
          <p className="text-sm text-subtle">No files uploaded yet.</p>
          <button className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-foreground"><PaperClipIcon className="size-3.5" />Upload agreement, invoice or report</button>
        </div>
      </div>

      {showNew && <NewEngagementModal presetClientId={client.id} onClose={() => setShowNew(false)} onCreated={(newId) => router.push(`/clients/${newId}`)} />}
    </div>
  );
}

/* ── pieces ── */

function Kv({ k, v, tone }: { k: string; v: string; tone?: "warn" }) {
  return <div className="flex items-baseline gap-2"><span className="text-subtle">{k}</span><span className={tone === "warn" ? "text-status-approaching" : "text-foreground"}>{v}</span></div>;
}

function ChecklistRow({ item, startDate, clock, active, owner, first, onToggle }: { item: ChecklistItem; startDate: string; clock: Date; active: boolean; owner?: string; first: boolean; onToggle: () => void }) {
  const recurring = item.cadence !== "once";
  const done = itemDone(item, startDate, clock);
  const overdue = active && itemOverdue(item, startDate, clock);
  const dueISO = itemDueISO(item, startDate, clock);
  const dayN = recurring && (item.cadence === "monthly" || item.cadence === "quarterly") ? itemDueDay(item, startDate, clock) : null;
  const dayPrefix = dayN != null ? `Day ${dayN} · ` : "";
  const evidenceSmell = done && !recurring && item.needsEvidence && !item.evidence;

  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${first ? "" : "border-t border-border"}`}>
      <button onClick={onToggle} className="shrink-0" aria-label={done ? "Mark not done" : "Mark done"}>
        {done ? (
          <CheckCircleIcon className="size-5 text-status-ontrack" />
        ) : (
          <span className={`block size-[18px] rounded-full border ${overdue ? "border-status-late" : "border-border"}`} />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className={`text-sm ${done && !recurring ? "text-muted" : "text-foreground"}`}>{item.label}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-subtle">
          <span>{owner ? `${owner} · ${ROLE_LABEL[item.ownerRole]}` : ROLE_LABEL[item.ownerRole]}</span>
          {recurring ? (
            !active
              ? <><span>·</span><span>cadence ended</span></>
              : done
                ? <><span>·</span><span>done this cycle</span><span>·</span><span className="text-muted">next {dayPrefix}{fmtWD(dueISO)}</span></>
                : <><span>·</span><span className={overdue ? "text-status-late" : ""}>{overdue ? "overdue" : "due"} {dayPrefix}{fmtDate(dueISO)}</span></>
          ) : done && item.completedAt ? (
            <><span>·</span><span>done {fmtDate(item.completedAt)}</span></>
          ) : dueISO ? (
            <><span>·</span><span className={overdue ? "text-status-late" : ""}>{overdue ? "overdue" : "due"} {fmtDate(dueISO)}</span></>
          ) : null}
        </div>
      </div>

      {done && item.evidence ? (
        <a href="#" className="inline-flex shrink-0 items-center gap-1.5 rounded border border-border px-2 py-1 text-xs text-muted transition-colors hover:text-foreground"><PaperClipIcon className="size-3" />{item.evidence}</a>
      ) : evidenceSmell ? (
        <button className="inline-flex shrink-0 items-center gap-1.5 rounded border border-dashed border-status-approaching/40 px-2 py-1 text-xs text-status-approaching"><ArrowUpRightIcon className="size-3" />Attach evidence</button>
      ) : null}
    </div>
  );
}
