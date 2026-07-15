/* ── SOP Data Layer ── */

import { createStore } from "@/lib/supabase-store";
import type { SOP } from "./types";

const store = createStore<SOP>({ table: "sops", lsKey: "launchpad-sops" });

/* Seed a few real runbooks the first time the library is opened empty, so the
 * team lands on something usable + sees the format. Editable/deletable like any
 * other SOP. */
const NOW = "2026-07-05T09:00:00Z";
/** An example step visual, so the "Visual guide" tab has something to show. */
const EXAMPLE_IMAGE = "/sop/qa-example.svg";
function step(title: string, body: string, i: number, image?: string) {
  return { id: `seed-s${i}`, title, body, ...(image ? { image } : {}) };
}
const SEED_SOPS: SOP[] = [
  {
    id: "seed-001",
    number: 1,
    title: "Onboard a new client",
    description: "From signed agreement to a live delivery board.",
    category: "operations",
    tags: ["onboarding", "kickoff"],
    steps: [
      step("Send + counter-sign the agreement", "Fire the agreement from the Company area, confirm the client signs, then counter-sign so it reads Active.", 1),
      step("Collect access", "Shopify collaborator invite, theme access, any ad accounts. Log them in the client record.", 2),
      step("Book the kickoff call", "30 minutes. Walk the goal, the cadence, and who owns what. Record it.", 3),
      step("Spin up the delivery board", "Create the project on the kanban, assign the pod, set the turnaround (15/20/25).", 4),
    ],
    exitCriteria: [
      "Agreement reads Active in the Company area.",
      "All access logged in the client record.",
      "Kickoff call recorded and linked.",
      "Delivery board live with the pod assigned.",
    ],
    content: "",
    draft: false,
    createdBy: "system",
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: "seed-002",
    number: 2,
    title: "Design → Dev handover",
    description: "Package a design so dev can build it without a single question.",
    category: "design",
    tags: ["handover", "figma"],
    steps: [
      step("Finalise desktop + mobile", "Every breakpoint designed, no TBDs. Name layers cleanly.", 1),
      step("Record a Loom walkthrough", "Talk through intent, interactions, and anything non-obvious. Attach it to the card.", 2),
      step("Export fonts + assets", "Bundle the font files and any images/icons dev can't pull from Figma.", 3),
      step("Submit the handover", "Fill the handover on the card (Figma, Loom, fonts). Submitting moves it to Development.", 4),
    ],
    exitCriteria: [
      "Desktop + mobile designed, zero TBDs.",
      "Loom walkthrough attached to the card.",
      "Fonts + assets bundled and linked.",
      "Card has moved to Development.",
    ],
    content: "",
    draft: false,
    createdBy: "system",
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: "seed-003",
    number: 3,
    title: "Launch a CRO test",
    description: "Ship a test that produces a clean, bankable result.",
    category: "cro",
    tags: ["testing", "optimisation"],
    steps: [
      step("Write the hypothesis", "What you believe + why, in one sentence. If you can't, it's not ready.", 1),
      step("Set benchmarks", "Record the baseline metric before you touch anything.", 2),
      step("QA on staging", "Cross-browser + mobile. No layout shift, tracking fires. Use the visual guide as your check reference.", 3, EXAMPLE_IMAGE),
      step("Go live + monitor", "Flip it live, watch for breakage in the first hour, then let it run.", 4),
      step("Conclude + bank", "Call the result at significance, record the uplift, bank the win on the client.", 5),
    ],
    exitCriteria: [
      "Hypothesis written and baseline recorded.",
      "QA passed on staging, tracking fires.",
      "Test live and monitored through the first hour.",
      "Result called at significance and banked on the client.",
    ],
    content: "",
    draft: false,
    createdBy: "system",
    created_at: NOW,
    updated_at: NOW,
  },
];

let seedAttempted = false;
let exampleBackfilled = false;

/* One-time, idempotent: if the CRO seed exists from an earlier session without
 * the example image (it was added later), patch its QA step so the "Visual
 * guide" tab has something to show. Never touches user edits beyond that step. */
async function backfillExampleImage(all: SOP[]): Promise<SOP[]> {
  if (exampleBackfilled) return all;
  exampleBackfilled = true;
  const cro = all.find((s) => s.id === "seed-003");
  const qa = cro?.steps?.find((st) => st.id === "seed-s3");
  if (cro && qa && !qa.image) {
    qa.image = EXAMPLE_IMAGE;
    try {
      await store.update(cro.id, { steps: cro.steps });
    } catch {
      /* offline / read-only — the in-memory patch still renders this session */
    }
  }
  return all;
}

export async function getSOPs(): Promise<SOP[]> {
  let all = await store.getAll();
  if (all.length === 0 && !seedAttempted) {
    seedAttempted = true;
    for (const s of SEED_SOPS) {
      try {
        await store.create(s);
      } catch {
        /* store may be read-only / offline; ignore + fall through */
      }
    }
    all = await store.getAll();
  }
  all = await backfillExampleImage(all);
  return all.sort((a, b) => (b.updated_at || b.created_at).localeCompare(a.updated_at || a.created_at));
}

export async function getSOPById(id: string): Promise<SOP | null> {
  return store.getById(id);
}

export async function createSOP(sop: SOP): Promise<void> {
  await store.create(sop);
}

export async function updateSOP(id: string, updates: Partial<SOP>): Promise<void> {
  await store.update(id, updates);
}

export async function deleteSOP(id: string): Promise<void> {
  await store.remove(id);
}
