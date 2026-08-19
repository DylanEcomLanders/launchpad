"use client";

/* ── Brand preview: Delivery board ──
 * Isolated look-and-feel exploration at /preview/brand/delivery.
 * Radical reskin of the delivery board in the "reference dashboard" brand:
 * warm paper, white hairline cards, monospace technical tags, summary-first
 * (KPI row + flow bar) then the board. Mock data only - touches nothing live. */

import { useState } from "react";
import s from "./delivery-brand.module.css";

const TABS = ["Board", "Timeline", "People", "Activity"] as const;

const KPIS = [
  { label: "In flight", value: "24", qual: "across 6 clients", tone: "" },
  { label: "Due today", value: "5", qual: "need a push", tone: "warn" },
  { label: "Past stage date", value: "2", qual: "running late", tone: "bad" },
  { label: "SLA at risk", value: "1", qual: "in the ticket queue", tone: "warn" },
  { label: "Shipped this week", value: "8", qual: "reached launch", tone: "" },
] as const;

const FLOW = [
  { name: "Tickets", count: 3, color: "var(--salmon)" },
  { name: "Setup", count: 1, color: "#E7D9A6" },
  { name: "Strategy", count: 2, color: "var(--gold)" },
  { name: "Design", count: 5, color: "var(--lime)" },
  { name: "Revisions", count: 2, color: "#9BCB6A" },
  { name: "Development", count: 6, color: "var(--green)" },
  { name: "QA", count: 2, color: "var(--mint)" },
  { name: "Approval", count: 1, color: "var(--teal)" },
  { name: "Launch", count: 2, color: "var(--blue)" },
];

type Chip = { kind: "ok" | "due" | "late" | "fire"; label: string };
type Av = { i: string; c: string };
type Card = {
  code: string;
  chip: Chip;
  title: string;
  avatars: Av[];
  sla?: { hot?: boolean; label: string };
  meta?: string;
};
type Column = { name: string; color: string; cards: Card[] };

const DE: Av = { i: "DE", c: "var(--violet)" };
const AJ: Av = { i: "AJ", c: "var(--plum)" };
const AM: Av = { i: "AM", c: "var(--blue)" };
const RB: Av = { i: "RB", c: "var(--teal)" };
const DN: Av = { i: "DN", c: "var(--red)" };

const COLUMNS: Column[] = [
  {
    name: "Tickets", color: "var(--salmon)", cards: [
      { code: "CRF", chip: { kind: "fire", label: "FIRE" }, title: "Checkout throwing 500 on mobile Safari", avatars: [DN], sla: { hot: true, label: "SLA · NOW" } },
      { code: "KEG", chip: { kind: "due", label: "due today" }, title: "Broken variant swatch on the PDP gallery", avatars: [AM], sla: { label: "SLA · 24h" } },
      { code: "NOX", chip: { kind: "ok", label: "on track" }, title: "Add GA4 event on the bundle upsell click", avatars: [RB], sla: { label: "SLA · 48h" } },
    ],
  },
  {
    name: "Strategy", color: "var(--gold)", cards: [
      { code: "KEG", chip: { kind: "ok", label: "on track" }, title: "Q3 test roadmap: bundle-led AOV plays", avatars: [DE, AJ], meta: "day 12/90" },
      { code: "VRA", chip: { kind: "ok", label: "on track" }, title: "Hypothesis doc: PDP trust + social proof", avatars: [DE], meta: "day 4/90" },
    ],
  },
  {
    name: "Design", color: "var(--lime)", cards: [
      { code: "CRF", chip: { kind: "due", label: "due today" }, title: "Hero A/B: bundle-led vs hero-product", avatars: [AJ, DE], meta: "v2" },
      { code: "NOX", chip: { kind: "ok", label: "on track" }, title: "Sticky add-to-cart redesign, mobile-first", avatars: [AJ], meta: "v1" },
      { code: "LMN", chip: { kind: "ok", label: "on track" }, title: "Quiz funnel: 4-step flow wireframes", avatars: [AM], meta: "v1" },
    ],
  },
  {
    name: "Revisions", color: "#9BCB6A", cards: [
      { code: "KEG", chip: { kind: "due", label: "round 2" }, title: "PDP layout: client feedback on spacing + copy", avatars: [AJ], meta: "internal" },
      { code: "HLO", chip: { kind: "ok", label: "on track" }, title: "Cart drawer: external revision from Rob", avatars: [RB], meta: "external" },
    ],
  },
  {
    name: "Development", color: "var(--green)", cards: [
      { code: "LMN", chip: { kind: "late", label: "2d late" }, title: "Quiz funnel build: logic + results routing", avatars: [DN], meta: "due Aug 4" },
      { code: "CRF", chip: { kind: "ok", label: "on track" }, title: "Upsell drawer: post-ATC recommendation slot", avatars: [DN, RB], meta: "due Aug 9" },
      { code: "VRA", chip: { kind: "ok", label: "on track" }, title: "Section: comparison table for collection page", avatars: [RB], meta: "due Aug 11" },
    ],
  },
  {
    name: "Internal QA", color: "var(--mint)", cards: [
      { code: "KEG", chip: { kind: "ok", label: "on track" }, title: "Cross-browser pass: hero test build", avatars: [DN, AM], meta: "QA" },
      { code: "CRF", chip: { kind: "due", label: "due today" }, title: "Speed check: Lighthouse on the new bundle page", avatars: [RB], meta: "QA" },
    ],
  },
  {
    name: "Client Approval", color: "var(--teal)", cards: [
      { code: "VRA", chip: { kind: "ok", label: "sent" }, title: "Monthly report + next-sprint plan for sign-off", avatars: [DE], meta: "awaiting" },
    ],
  },
  {
    name: "Launch", color: "var(--blue)", cards: [
      { code: "CRF", chip: { kind: "ok", label: "live" }, title: "Bundle test live: 50/50 split, tracking confirmed", avatars: [DN], meta: "Aug 5" },
      { code: "HLO", chip: { kind: "ok", label: "live" }, title: "Sticky ATC shipped to 100% of mobile traffic", avatars: [AJ], meta: "Aug 4" },
    ],
  },
];

const chipClass: Record<Chip["kind"], string> = {
  ok: s.ok, due: s.due, late: s.late, fire: s.fire,
};

export default function DeliveryBrandPreview() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Board");
  const total = FLOW.reduce((n, f) => n + f.count, 0);

  return (
    <div className={s.root}>
      {/* top utility bar */}
      <div className={s.topbar}>
        <div className={s.brand}>
          <span className={s.mark} aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M2 10.5 18 3 12 17.5l-2.6-5.4L2 10.5Z" fill="currentColor" />
            </svg>
          </span>
          <div className={s.switcher}>
            <span className={s.badge}>P1</span>
            <span className={s.who}>Pod 1 · Delivery</span>
            <span className={s.chev}>▼</span>
          </div>
          <span className={s.tagPreview}>BRAND&nbsp;PREVIEW</span>
        </div>
        <div className={s.util}>
          <div className={s.search}><span>Search</span><span className={s.kbd}>⌘K</span></div>
          <button className={s.iconBtn} aria-label="Filter">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M4.5 8h7M6.5 12h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
          </button>
          <button className={s.iconBtn} aria-label="Notifications">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M8 2a3.5 3.5 0 0 0-3.5 3.5c0 3-1.2 4-1.2 4h9.4s-1.2-1-1.2-4A3.5 3.5 0 0 0 8 2ZM6.6 13a1.5 1.5 0 0 0 2.8 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <div className={s.me} aria-label="You" />
        </div>
      </div>

      {/* tab nav */}
      <nav className={s.tabs} role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={`${s.tab} ${tab === t ? s.tabActive : ""}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </nav>

      <div className={s.page}>
        <div className={s.head}>
          <h1 className={s.h1}>Delivery</h1>
          <p className={s.sub}>Everything in flight across the pod, from first ticket to launch.</p>
        </div>

        {/* KPI row */}
        <div className={s.kpis}>
          {KPIS.map((k) => (
            <div className={s.stat} key={k.label}>
              <div className={s.label}>{k.label}</div>
              <div className={s.val}>
                <span className={`${s.big} ${s.tnum} ${k.tone === "warn" ? s.warn : ""} ${k.tone === "bad" ? s.bad : ""}`}>{k.value}</span>
                <span className={s.q}>{k.qual}</span>
              </div>
            </div>
          ))}
        </div>

        {/* flow across stages */}
        <div className={s.flow}>
          <div className={s.flowHead}>
            <div className={s.flowTitle}>Flow across stages <span>(where the {total} sit right now)</span></div>
            <div className={s.pillCount}>{total} cards</div>
          </div>
          <div className={s.bar}>
            {FLOW.map((f) => (
              <div key={f.name} className={s.seg} style={{ flex: f.count, background: f.color }} />
            ))}
          </div>
          <div className={s.legend}>
            {FLOW.map((f) => (
              <div className={s.lg} key={f.name}>
                <span className={s.dot} style={{ background: f.color }} />
                {f.name} <b>{f.count}</b>
              </div>
            ))}
          </div>
        </div>

        {/* board */}
        <div className={s.boardHead}>
          <h2>The board</h2>
          <span className={s.note}>drag a card to move it a stage · owner of the live stage is highlighted</span>
        </div>

        <div className={s.boardScroll}>
          <div className={s.board}>
            {COLUMNS.map((col) => (
              <div className={s.col} key={col.name}>
                <div className={s.colHead}>
                  <span className={s.cdot} style={{ background: col.color }} />
                  <span className={s.cname}>{col.name}</span>
                  <span className={s.ccount}>{col.cards.length}</span>
                </div>
                <div className={s.colBody}>
                  {col.cards.map((card, i) => (
                    <div className={s.tile} key={i}>
                      <div className={s.tileTop}>
                        <span className={s.code}>{card.code}</span>
                        <span className={`${s.chip} ${chipClass[card.chip.kind]}`}>
                          <span className={s.cd} />{card.chip.label}
                        </span>
                      </div>
                      <p className={s.tileTitle}>{card.title}</p>
                      <div className={s.tileFoot}>
                        <div className={s.avatars}>
                          {card.avatars.map((a, j) => (
                            <span className={s.av} key={j} style={{ background: a.c }}>{a.i}</span>
                          ))}
                        </div>
                        {card.sla ? (
                          <span className={`${s.sla} ${card.sla.hot ? s.slaHot : s.slaWarn}`}>{card.sla.label}</span>
                        ) : (
                          <span className={s.meta}>{card.meta}</span>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className={s.add}>+ Add card</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
