"use client";

/* ── Delivery ──
 * A deliberately simple, Trello-style board for the isolated client-experience
 * area. Cards move across stage columns by drag - no gates. The current column
 * highlights the assignee that owns it (display only). A per-stage "expected
 * done" date flags late (red) or due-today (orange). The first column, Tickets,
 * holds quick client requests classified ticket / bug / fire on an SLA.
 *
 * Filter by client or by person (your own tasks). Assignees come from a small
 * roster (People manager), never typed. Card moves are recorded in the activity
 * log. Fresh `cx_*` data (lib/cx) - shares nothing with the legacy /kanban.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { PlusIcon, TrashIcon, XMarkIcon, UsersIcon, ClockIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import {
  loadCards,
  saveCard,
  removeCard,
  newCard,
  withStage,
  loadPeople,
  savePerson,
  removePerson,
  newPerson,
  loadActivity,
  logMove,
} from "@/lib/cx/data";
import {
  CX_STAGES,
  SCHEDULE_STAGES,
  ROLE_ORDER,
  ROLE_LABEL,
  ROLE_SOURCE,
  PERSON_ROLE_LABEL,
  TICKET_META,
  activeOwner,
  activeRoleForStage,
  stageLabel,
  cardPeople,
  cardDue,
  dueTone,
  ticketBreached,
  peopleByRole,
} from "@/lib/cx/stages";
import type { CxCard, CxStage, CxRole, CxPerson, PersonRole, TicketType, CxActivity } from "@/lib/cx/types";
import { loadDocs } from "@/lib/pod-projects/data";
import type { PodDoc } from "@/lib/pod-projects/types";
import { useCurrentUser, useRole } from "@/components/auth-gate";
import { importLegacyKanban } from "@/lib/cx/import-legacy";

type ClientOption = { id: string; name: string };

const TICKET_TYPES: TicketType[] = ["ticket", "bug", "fire"];

/* ── date helpers (local, no deps) ── */
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
function fmtDue(iso?: string): string {
  if (!iso) return "";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
function fmtWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase() || name.slice(0, 2).toUpperCase();
}

export default function DeliveryPage() {
  const me = useCurrentUser();
  const role = useRole();
  const isAdmin = role === "admin" || role === "cro";
  const [cards, setCards] = useState<CxCard[]>([]);
  const [clients, setClients] = useState<PodDoc[]>([]);
  const [people, setPeople] = useState<CxPerson[]>([]);
  const [importing, setImporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<CxStage | null>(null);
  const [editing, setEditing] = useState<CxCard | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [filterClient, setFilterClient] = useState("");
  const [filterPerson, setFilterPerson] = useState("");
  const [showPeople, setShowPeople] = useState(false);
  const [showActivity, setShowActivity] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [cs, docs, ppl] = await Promise.all([loadCards(), loadDocs(), loadPeople()]);
      if (!alive) return;
      setCards(cs);
      setClients(docs.filter((d) => !d.isTemplate));
      setPeople(ppl);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    return cards.filter((c) => {
      if (filterClient && c.clientId !== filterClient) return false;
      if (filterPerson && !cardPeople(c).includes(filterPerson)) return false;
      return true;
    });
  }, [cards, filterClient, filterPerson]);

  /* Clients on the board = Clients docs + any client already on a card (e.g.
   * imported from the legacy board). Delivery is standalone, so it doesn't
   * depend on a matching Clients doc existing. */
  const clientOptions = useMemo<ClientOption[]>(() => {
    const map = new Map<string, string>();
    for (const d of clients) map.set(d.id, d.title);
    for (const c of cards) if (c.clientId) map.set(c.clientId, c.clientName || "Unnamed client");
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [clients, cards]);

  const runImport = useCallback(async () => {
    if (!confirm("Import cards and people from the legacy kanban? This reads the old board (never changes it) and is safe to run more than once.")) return;
    setImporting(true);
    try {
      const res = await importLegacyKanban();
      const [cs, ppl] = await Promise.all([loadCards(), loadPeople()]);
      setCards(cs);
      setPeople(ppl);
      alert(`Imported ${res.cards} cards and created ${res.docsCreated} client areas across ${res.clients} clients, added ${res.peopleAdded} people.`);
    } catch (err) {
      alert(`Import failed: ${err instanceof Error ? err.message : "unknown error"}`);
    }
    setImporting(false);
  }, []);

  const byStage = useMemo(() => {
    const map = new Map<CxStage, CxCard[]>();
    for (const s of CX_STAGES) map.set(s.value, []);
    for (const c of filtered) map.get(c.stage)?.push(c);
    return map;
  }, [filtered]);

  const move = useCallback(
    (id: string, stage: CxStage) => {
      setCards((prev) => {
        const card = prev.find((c) => c.id === id);
        if (!card || card.stage === stage) return prev;
        const next = withStage(card, stage);
        void saveCard(next);
        void logMove(next, card.stage, stage, me?.name);
        return prev.map((c) => (c.id === id ? next : c));
      });
    },
    [me],
  );

  const openNew = useCallback(() => {
    const first = clientOptions.find((c) => c.id === filterClient) ?? clientOptions[0];
    setEditing(newCard(first?.id ?? "", first?.name ?? "", ""));
    setIsNew(true);
  }, [clientOptions, filterClient]);

  const persistEdit = useCallback(async () => {
    if (!editing) return;
    if (!editing.title.trim()) {
      setEditing(null);
      setIsNew(false);
      return;
    }
    await saveCard(editing);
    setCards((prev) =>
      prev.some((c) => c.id === editing.id) ? prev.map((c) => (c.id === editing.id ? editing : c)) : [...prev, editing],
    );
    setEditing(null);
    setIsNew(false);
  }, [editing]);

  const del = useCallback(async () => {
    if (!editing) return;
    await removeCard(editing.id);
    setCards((prev) => prev.filter((c) => c.id !== editing.id));
    setEditing(null);
    setIsNew(false);
  }, [editing]);

  if (loading) {
    return <div className="grid h-full place-items-center text-sm text-subtle">Loading board…</div>;
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border-faint px-6 py-3">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-foreground">Delivery</h1>
          <div className="flex items-center gap-2">
            <FilterSelect value={filterClient} onChange={setFilterClient} allLabel="All clients">
              {clientOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect value={filterPerson} onChange={setFilterPerson} allLabel="Everyone">
              {people.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </FilterSelect>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button onClick={runImport} disabled={importing} className={ghostBtn + " disabled:opacity-50"}>
              <ArrowDownTrayIcon className="size-4" /> {importing ? "Importing…" : "Import legacy"}
            </button>
          )}
          <button onClick={() => setShowActivity(true)} className={ghostBtn}>
            <ClockIcon className="size-4" /> Activity
          </button>
          {isAdmin && (
            <button onClick={() => setShowPeople(true)} className={ghostBtn}>
              <UsersIcon className="size-4" /> People
            </button>
          )}
          {isAdmin && (
            <button onClick={openNew} className={primaryBtn}>
              <PlusIcon className="size-4" /> New card
            </button>
          )}
        </div>
      </div>

      {/* Board */}
      <div className="flex flex-1 gap-2.5 overflow-x-auto overflow-y-hidden px-6 py-4 scrollbar-thin">
        {CX_STAGES.map((s) => {
          const list = byStage.get(s.value) ?? [];
          const isOver = overStage === s.value;
          return (
            <div
              key={s.value}
              onDragOver={(e) => {
                e.preventDefault();
                if (overStage !== s.value) setOverStage(s.value);
              }}
              onDragLeave={() => setOverStage((cur) => (cur === s.value ? null : cur))}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedId) move(draggedId, s.value);
                setDraggedId(null);
                setOverStage(null);
              }}
              className={`flex w-[236px] shrink-0 flex-col rounded border bg-surface ${
                isOver ? "border-ring" : "border-border-faint"
              }`}
            >
              <div className="flex items-center justify-between px-2.5 py-2">
                <span className="text-2xs font-semibold uppercase tracking-wide text-subtle">{s.label}</span>
                <span className="text-2xs tabular-nums text-subtle">{list.length}</span>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto px-2 pb-2 scrollbar-thin">
                {list.map((c) => (
                  <CardFace
                    key={c.id}
                    card={c}
                    onOpen={() => {
                      setEditing(c);
                      setIsNew(false);
                    }}
                    onDragStart={() => setDraggedId(c.id)}
                    onDragEnd={() => {
                      setDraggedId(null);
                      setOverStage(null);
                    }}
                  />
                ))}
                {list.length === 0 && <div className="py-2" aria-hidden />}
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <CardEditor
          card={editing}
          isNew={isNew}
          clients={clientOptions}
          people={people}
          canEdit={isAdmin}
          onChange={setEditing}
          onSave={persistEdit}
          onDelete={del}
          onClose={() => {
            setEditing(null);
            setIsNew(false);
          }}
        />
      )}
      {showPeople && (
        <PeopleManager people={people} onPeople={setPeople} onClose={() => setShowPeople(false)} />
      )}
      {showActivity && <ActivityPanel onClose={() => setShowActivity(false)} />}
    </div>
  );
}

/* ── shared button styles ── */
const ghostBtn =
  "inline-flex items-center gap-1.5 rounded border border-border-faint bg-surface px-2.5 py-1.5 text-xs text-muted hover:bg-surface-raised hover:text-foreground";
const primaryBtn =
  "inline-flex items-center gap-1.5 rounded border border-border bg-surface-raised px-3 py-1.5 text-xs font-medium text-foreground hover:opacity-90";

function FilterSelect({
  value,
  onChange,
  allLabel,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  allLabel: string;
  children: ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded border bg-surface px-2 py-1.5 text-xs outline-none focus:border-ring ${
        value ? "border-ring text-foreground" : "border-border-faint text-muted"
      }`}
    >
      <option value="">{allLabel}</option>
      {children}
    </select>
  );
}

/* ── One card on the board ── */
function CardFace({
  card,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  card: CxCard;
  onOpen: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const isTicket = card.stage === "tickets";
  const owner = activeOwner(card, card.stage);
  const due = cardDue(card);
  const tone = dueTone(due, todayISO());
  const breached = isTicket && ticketBreached(card, Date.now());
  const tm = card.ticketType ? TICKET_META[card.ticketType] : null;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      className="cursor-grab select-none rounded border border-border bg-surface-raised px-2.5 py-2 active:cursor-grabbing hover:border-border-strong"
    >
      {isTicket && tm && (
        <span className={`mb-1 inline-flex items-center gap-1 text-2xs font-medium ${tm.tone}`}>
          <span className={`size-1.5 rounded-full ${tm.dot}`} />
          {tm.label}
          {breached && <span className="text-status-late">· SLA passed</span>}
        </span>
      )}
      <p className="text-sm font-medium leading-snug text-foreground">{card.title}</p>
      {card.clientName && <p className="mt-0.5 text-2xs text-subtle">{card.clientName}</p>}
      <div className="mt-2 flex items-center justify-between gap-2">
        {owner ? (
          <span className="inline-flex items-center gap-1.5 text-2xs text-muted">
            <span className="grid size-5 place-items-center rounded-full bg-accent text-[9px] font-semibold text-accent-foreground">
              {initials(owner.name)}
            </span>
            {owner.name}
          </span>
        ) : (
          <span className="text-2xs text-subtle/70">{isTicket ? "Unassigned" : ""}</span>
        )}
        {!isTicket && due && (
          <span
            className={`shrink-0 rounded px-1.5 py-0.5 text-2xs tabular-nums ${
              tone === "late"
                ? "bg-status-late/10 text-status-late"
                : tone === "today"
                  ? "bg-status-approaching/10 text-status-approaching"
                  : "text-subtle"
            }`}
          >
            {tone === "late" ? "Late · " : tone === "today" ? "Today · " : ""}
            {fmtDue(due)}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Card editor (create + edit) ── */
function CardEditor({
  card,
  isNew,
  clients,
  people,
  canEdit = true,
  onChange,
  onSave,
  onDelete,
  onClose,
}: {
  card: CxCard;
  isNew: boolean;
  clients: ClientOption[];
  people: CxPerson[];
  canEdit?: boolean;
  onChange: (c: CxCard) => void;
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const set = (patch: Partial<CxCard>) => onChange({ ...card, ...patch });
  const setDue = (stage: CxStage, iso: string) =>
    set({ dueByStage: { ...(card.dueByStage ?? {}), [stage]: iso || undefined } });
  const isTicket = card.stage === "tickets";
  const activeRole = activeRoleForStage(card.stage);

  return (
    <Overlay onClose={onClose} title={isNew ? "New card" : canEdit ? "Edit card" : "Card"}>
      <fieldset disabled={!canEdit} className="contents">
      <div className="space-y-4 px-4 py-4">
        <Field label="Title">
          <input
            autoFocus
            value={card.title}
            onChange={(e) => set({ title: e.target.value })}
            placeholder="What's the deliverable?"
            className={inputCls}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Client">
            <select
              value={card.clientId}
              onChange={(e) => {
                const c = clients.find((x) => x.id === e.target.value);
                set({ clientId: e.target.value, clientName: c?.name ?? "" });
              }}
              className={inputCls}
            >
              <option value="">No client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Stage">
            <select value={card.stage} onChange={(e) => set({ stage: e.target.value as CxStage })} className={inputCls}>
              {CX_STAGES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {isTicket ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <select
                value={card.ticketType ?? "ticket"}
                onChange={(e) => set({ ticketType: e.target.value as TicketType })}
                className={inputCls}
              >
                {TICKET_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TICKET_META[t].label} · {t === "fire" ? "immediate" : t === "bug" ? "24h" : "48h"}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Assignee">
              <PersonSelect value={card.ticketAssignee} onChange={(v) => set({ ticketAssignee: v })} options={people} />
            </Field>
          </div>
        ) : (
          <>
            <div>
              <SectionLabel>Assignees</SectionLabel>
              <div className="grid grid-cols-2 gap-3">
                {ROLE_ORDER.map((role) => (
                  <Field key={role} label={ROLE_LABEL[role]} active={role === activeRole}>
                    <PersonSelect
                      value={card[role]}
                      onChange={(v) => set({ [role]: v } as Partial<CxCard>)}
                      options={peopleByRole(people, ROLE_SOURCE[role])}
                      active={role === activeRole}
                    />
                  </Field>
                ))}
              </div>
            </div>

            <div>
              <SectionLabel>Schedule · expected done per stage</SectionLabel>
              <div className="space-y-1.5">
                {SCHEDULE_STAGES.map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <span
                      className={`w-40 shrink-0 text-2xs ${s === card.stage ? "font-medium text-ring" : "text-muted"}`}
                    >
                      {stageLabel(s)}
                    </span>
                    <input
                      type="date"
                      value={card.dueByStage?.[s] ?? ""}
                      onChange={(e) => setDue(s, e.target.value)}
                      className="flex-1 rounded border border-border bg-surface-raised px-2 py-1 text-xs text-foreground outline-none focus:border-ring"
                    />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
      </fieldset>

      <div className="flex items-center justify-between border-t border-border-faint px-4 py-3">
        {canEdit && !isNew ? (
          <button
            onClick={onDelete}
            className="inline-flex items-center gap-1.5 rounded px-2 py-1.5 text-xs text-status-late hover:bg-status-late/10"
          >
            <TrashIcon className="size-4" /> Delete
          </button>
        ) : (
          <span />
        )}
        {canEdit ? (
          <button
            onClick={onSave}
            disabled={!card.title.trim()}
            className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:opacity-90 disabled:opacity-40"
          >
            {isNew ? "Add card" : "Done"}
          </button>
        ) : (
          <button
            onClick={onClose}
            className="rounded border border-border px-3 py-1.5 text-xs font-medium text-muted hover:bg-surface-hover hover:text-foreground"
          >
            Close
          </button>
        )}
      </div>
    </Overlay>
  );
}

/* A select over roster people, tolerant of a stored value no longer in the list. */
function PersonSelect({
  value,
  onChange,
  options,
  active,
}: {
  value?: string;
  onChange: (v: string) => void;
  options: CxPerson[];
  active?: boolean;
}) {
  const names = options.map((o) => o.name);
  const missing = value && !names.includes(value) ? value : null;
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded border bg-surface-raised px-2 py-1.5 text-sm text-foreground outline-none focus:border-ring ${
        active ? "border-ring" : "border-border"
      }`}
    >
      <option value="">Unassigned</option>
      {options.map((o) => (
        <option key={o.id} value={o.name}>
          {o.name}
        </option>
      ))}
      {missing && <option value={missing}>{missing}</option>}
    </select>
  );
}

/* ── People manager ── */
function PeopleManager({
  people,
  onPeople,
  onClose,
}: {
  people: CxPerson[];
  onPeople: (p: CxPerson[]) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<PersonRole>("designer");

  const add = async () => {
    if (!name.trim()) return;
    const p = newPerson(name, role);
    await savePerson(p);
    onPeople([...people, p]);
    setName("");
  };
  const patch = async (p: CxPerson, next: Partial<CxPerson>) => {
    const updated = { ...p, ...next };
    await savePerson(updated);
    onPeople(people.map((x) => (x.id === p.id ? updated : x)));
  };
  const drop = async (id: string) => {
    await removePerson(id);
    onPeople(people.filter((x) => x.id !== id));
  };

  const roles: PersonRole[] = ["strategist", "designer", "developer"];

  return (
    <Overlay onClose={onClose} title="People">
      <div className="space-y-3 px-4 py-4">
        <p className="text-2xs text-subtle">The team you assign cards to. Edit the seeded examples or add your own.</p>
        <div className="space-y-1.5">
          {people.map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <input
                value={p.name}
                onChange={(e) => patch(p, { name: e.target.value })}
                className="flex-1 rounded border border-border bg-surface-raised px-2 py-1.5 text-sm text-foreground outline-none focus:border-ring"
              />
              <select
                value={p.role}
                onChange={(e) => patch(p, { role: e.target.value as PersonRole })}
                className="rounded border border-border bg-surface-raised px-2 py-1.5 text-xs text-foreground outline-none focus:border-ring"
              >
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {PERSON_ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
              <button onClick={() => drop(p.id)} className="rounded p-1.5 text-subtle hover:bg-status-late/10 hover:text-status-late">
                <TrashIcon className="size-4" />
              </button>
            </div>
          ))}
          {people.length === 0 && <p className="py-4 text-center text-2xs text-subtle">No people yet.</p>}
        </div>
        <div className="flex items-center gap-2 border-t border-border-faint pt-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Add a person…"
            className="flex-1 rounded border border-border bg-surface-raised px-2 py-1.5 text-sm text-foreground outline-none placeholder:text-subtle/60 focus:border-ring"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as PersonRole)}
            className="rounded border border-border bg-surface-raised px-2 py-1.5 text-xs text-foreground outline-none focus:border-ring"
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {PERSON_ROLE_LABEL[r]}
              </option>
            ))}
          </select>
          <button onClick={add} disabled={!name.trim()} className={primaryBtn + " disabled:opacity-40"}>
            Add
          </button>
        </div>
      </div>
    </Overlay>
  );
}

/* ── Activity log ── */
function ActivityPanel({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<CxActivity[] | null>(null);
  useEffect(() => {
    loadActivity().then(setRows);
  }, []);
  return (
    <Overlay onClose={onClose} title="Activity">
      <div className="max-h-[60vh] space-y-2 overflow-y-auto px-4 py-4 scrollbar-thin">
        {rows === null ? (
          <p className="py-6 text-center text-sm text-subtle">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-subtle">No card moves yet.</p>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="flex items-start justify-between gap-3 border-b border-border-faint pb-2 text-2xs last:border-0">
              <div>
                <span className="text-foreground">{r.cardTitle}</span>
                <span className="text-subtle">
                  {" "}
                  moved {stageLabel(r.from)} → {stageLabel(r.to)}
                </span>
                {r.who && <span className="text-subtle"> by {r.who}</span>}
              </div>
              <span className="shrink-0 tabular-nums text-subtle">{fmtWhen(r.at)}</span>
            </div>
          ))
        )}
      </div>
    </Overlay>
  );
}

/* ── shared modal chrome ── */
function Overlay({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[8vh]" onClick={onClose}>
      <div className="w-full max-w-md overflow-hidden rounded border border-border bg-surface" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border-faint px-4 py-3">
          <span className="text-2xs font-semibold uppercase tracking-wide text-subtle">{title}</span>
          <button onClick={onClose} className="rounded p-1 text-subtle hover:bg-surface-raised hover:text-foreground">
            <XMarkIcon className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded border border-border bg-surface-raised px-2.5 py-1.5 text-sm text-foreground outline-none placeholder:text-subtle/60 focus:border-ring";

function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="mb-2 text-2xs font-semibold uppercase tracking-wide text-subtle">{children}</div>;
}

function Field({ label, active, children }: { label: string; active?: boolean; children: ReactNode }) {
  return (
    <label className="block">
      <span className={`mb-1 block text-2xs font-medium ${active ? "text-ring" : "text-subtle"}`}>
        {label}
        {active ? " · active" : ""}
      </span>
      {children}
    </label>
  );
}
