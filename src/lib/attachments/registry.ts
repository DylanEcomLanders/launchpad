/* ── Attachment artefact registry ──
 *
 * One place that knows about every artefact type Launchpad
 * generates. The Attachments component uses this to:
 *   - load all attachable items for the picker
 *   - resolve a target_id to its current title + URL
 *
 * Adding a new artefact type: add an entry here + the type to
 * AttachmentTargetType in /lib/attachments/types.ts.
 */

import { discoveryAuditsStore } from "@/lib/discovery-audits/data";
import { proposalsStore } from "@/lib/proposals/data";
import { briefsStore } from "@/lib/briefs/data";
import { reportsStore } from "@/lib/reports/data";
import { roadmapsStore } from "@/lib/roadmaps/data";
import { testsStore } from "@/lib/tests/data";
import { testWinsStore } from "@/lib/test-wins/data";
import type { AttachmentTargetType } from "./types";

export interface ArtefactRow {
  id: string;
  title: string;
  subtitle?: string;          // e.g. client name + status, for the picker
  href: string;               // the URL to open the live artefact
  type: AttachmentTargetType;
  created_at: string;
}

interface ArtefactSource {
  type: AttachmentTargetType;
  label: string;
  /* Picker shows these in the order defined here. */
  order: number;
  load: () => Promise<ArtefactRow[]>;
}

const SOURCES: ArtefactSource[] = [
  {
    type: "audit",
    label: "Discovery audits",
    order: 1,
    async load() {
      const rows = await discoveryAuditsStore.getAll();
      return rows.map((r) => ({
        id: r.id,
        title: r.brand_name || "Untitled audit",
        subtitle: `${r.status} · ${r.findings.length} finding${r.findings.length === 1 ? "" : "s"}`,
        href: `/tools/discovery-audit/${r.id}`,
        type: "audit",
        created_at: r.created_at,
      }));
    },
  },
  {
    type: "proposal",
    label: "Proposals",
    order: 2,
    async load() {
      const rows = await proposalsStore.getAll();
      return rows.map((r) => ({
        id: r.id,
        title: `${r.brand_name || "Untitled"} · ${r.tier}`,
        subtitle: `${r.status} · ${r.fee_currency}${r.monthly_fee.toLocaleString()}/mo`,
        href: `/tools/proposals/${r.id}`,
        type: "proposal",
        created_at: r.created_at,
      }));
    },
  },
  {
    type: "report",
    label: "Reports",
    order: 3,
    async load() {
      const rows = await reportsStore.getAll();
      return rows.map((r) => ({
        id: r.id,
        title: `${r.client_name} · ${r.period_label}`,
        subtitle: `${r.is_qbr ? "QBR · " : ""}${r.status}`,
        href: `/tools/reports/${r.id}`,
        type: "report",
        created_at: r.created_at,
      }));
    },
  },
  {
    type: "brief",
    label: "Briefs",
    order: 4,
    async load() {
      const rows = await briefsStore.getAll();
      return rows.map((r) => ({
        id: r.id,
        title: r.title || "Untitled brief",
        subtitle: `${r.kind} · ${r.client_name || "(no client)"}`,
        href: `/tools/briefs/${r.id}`,
        type: "brief",
        created_at: r.created_at,
      }));
    },
  },
  {
    type: "roadmap",
    label: "Roadmaps",
    order: 5,
    async load() {
      const rows = await roadmapsStore.getAll();
      return rows.map((r) => ({
        id: r.id,
        title: `${r.client_name || "Untitled"} · ${r.quarter_label || "current"}`,
        subtitle: `${r.items.length} item${r.items.length === 1 ? "" : "s"}`,
        href: `/tools/roadmap/${r.id}`,
        type: "roadmap",
        created_at: r.created_at,
      }));
    },
  },
  {
    type: "ab_test",
    label: "Tests",
    order: 6,
    async load() {
      const rows = await testsStore.getAll();
      return rows.map((r) => ({
        id: r.id,
        title: `${r.client_name || "Untitled"} · ${r.surface || ""}`.trim().replace(/·\s*$/, ""),
        subtitle: `${r.status}${r.outcome ? ` · ${r.outcome}` : ""}${r.uplift_pct !== undefined ? ` ${r.uplift_pct >= 0 ? "+" : ""}${r.uplift_pct}%` : ""}`,
        href: `/tools/tests/${r.id}`,
        type: "ab_test",
        created_at: r.created_at,
      }));
    },
  },
  {
    type: "test_win",
    label: "Test wins",
    order: 7,
    async load() {
      const rows = await testWinsStore.getAll();
      return rows.map((r) => ({
        id: r.id,
        title: `${r.client_anonymised || r.client_name} · ${r.surface}`.replace(/·\s*$/, ""),
        subtitle: r.uplift_pct !== undefined ? `+${r.uplift_pct}% · ${r.status}` : r.status,
        href: `/tools/test-wins`,
        type: "test_win",
        created_at: r.created_at,
      }));
    },
  },
];

/* Load every artefact across every store. Used by the picker. */
export async function loadAllArtefacts(): Promise<ArtefactRow[]> {
  const sorted = SOURCES.slice().sort((a, b) => a.order - b.order);
  const results = await Promise.all(sorted.map((s) => s.load()));
  return results.flat().sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function artefactLabel(type: AttachmentTargetType): string {
  return SOURCES.find((s) => s.type === type)?.label ?? type;
}

/* Look up a single artefact's current row by (type, id). null if
 * the source artefact's been deleted - the Attachments component
 * falls back to the snapshot stored on the attachment record. */
export async function lookupArtefact(
  type: AttachmentTargetType,
  id: string,
): Promise<ArtefactRow | null> {
  const source = SOURCES.find((s) => s.type === type);
  if (!source) return null;
  const all = await source.load();
  return all.find((r) => r.id === id) ?? null;
}
