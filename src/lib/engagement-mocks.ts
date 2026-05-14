import type {
  BucketSize,
  CustomDeliverable,
  CycleNumber,
  DeliverableStatus,
  EngagementBrief,
  EngagementKind,
  EngagementMetrics,
  EngagementWin,
} from "./engagement-template";

export interface EngagementDeliverableState {
  templateId: string;
  status: DeliverableStatus;
  artefactUrl?: string;
  blockerNote?: string;
  completedAtDay?: number;
}

export interface EngagementAsset {
  id: string;
  cycle: CycleNumber;
  category: string;
  label: string;
  url: string;
  addedBy: string;
  addedAtDay: number;
}

export interface EngagementActivity {
  id: string;
  day: number;
  actor: string;
  action: string;
}

export interface MockEngagement {
  id: string;
  brand: string;
  vertical: string;
  retainer: string;
  anchor: string;
  startDate: string;
  currentDay: number;
  podNumber: number;
  kind: EngagementKind;
  bucket?: BucketSize;
  brief: EngagementBrief;
  metrics?: EngagementMetrics;
  wins?: EngagementWin[];
  deliverables: EngagementDeliverableState[];
  customDeliverables: CustomDeliverable[];
  assets: EngagementAsset[];
  activity: EngagementActivity[];
  /** Pointer back to the original OnboardingSubmission. When set, the
   * /engagements detail page lazy-loads the full intake form (40+
   * fields) into the Intake panel so the pod has the asset links,
   * Shopify creds, tracking pixels, and uploaded files without
   * bouncing through the inbox. */
  onboardingSubmissionId?: string;
  /** Engagement-level Must do gates. Four gates aligned with the portal
   * QA pipeline: cro_brief (Design Brief), design_handoff (Dev Handover),
   * dev_handoff (Dev QA), launch_prep (Handoff / Testing). Same
   * checklist content as portal; same modal workflow shape. */
  mustDos?: {
    cro_brief?: import("@/lib/pods-v2/types").MustDoGate;
    design_handoff?: import("@/lib/pods-v2/types").MustDoGate;
    dev_handoff?: import("@/lib/pods-v2/types").MustDoGate;
    launch_prep?: import("@/lib/pods-v2/types").MustDoGate;
  };
}

/* Minimal client roster, only the three bucket example shapes (A/B/C)
 * remain so the buckets stay visible as reference. Retainer examples
 * cleared; create new ones via /engagements/new. */
export const MOCK_ENGAGEMENTS: MockEngagement[] = [
  {
    id: "eng-003",
    brand: "Caster & Co",
    vertical: "Home fragrance · DTC",
    retainer: "Project",
    anchor: "Bucket A",
    startDate: "2026-05-11",
    currentDay: 2,
    podNumber: 3,
    kind: "bucket",
    bucket: "A",
    brief: {
      websiteUrl: "https://casterand.co",
      primaryContact: "Niamh O'Sullivan",
      timezone: "GMT (Dublin)",
    },
    customDeliverables: [],
    deliverables: [],
    assets: [],
    activity: [
      { id: "ca-act-1", day: 1, actor: "Alister", action: "Engagement created" },
    ],
  },
  {
    id: "eng-004",
    brand: "Vista Apparel",
    vertical: "Athleisure · DTC",
    retainer: "Project",
    anchor: "Bucket B",
    startDate: "2026-05-11",
    currentDay: 2,
    podNumber: 2,
    kind: "bucket",
    bucket: "B",
    brief: {
      websiteUrl: "https://vista-apparel.com",
      primaryContact: "Marcus Bell",
      timezone: "GMT (London)",
    },
    customDeliverables: [],
    deliverables: [],
    assets: [],
    activity: [
      { id: "va-act-1", day: 1, actor: "Alister", action: "Engagement created" },
    ],
  },
  {
    id: "eng-005",
    brand: "Forge Athletics",
    vertical: "Sports nutrition · DTC",
    retainer: "Project",
    anchor: "Bucket C",
    startDate: "2026-04-13",
    currentDay: 19,
    podNumber: 1,
    kind: "bucket",
    bucket: "C",
    brief: {
      websiteUrl: "https://forge-athletics.com",
      primaryContact: "Jamie Park",
      timezone: "PST (Los Angeles)",
    },
    metrics: {
      cvrBaseline: 1.8,
      cvrCurrent: 2.6,
      aovBaseline: 38,
      aovCurrent: 44,
      metricsUpdatedAt: "2026-05-08",
    },
    wins: [
      { id: "win-1", shippedAtDay: 12, title: "PDP hero rework live", metric: "CVR 1.8% → 2.4%", notes: "Trust strip + lifestyle hero swapped in. Lift held across mobile + desktop." },
      { id: "win-2", shippedAtDay: 16, title: "Cart upsell widget live", metric: "AOV £38 → £44", notes: "+£6 AOV from protein bar attach. 27% attach rate." },
    ],
    customDeliverables: [
      {
        id: "fa-d1", name: "PDP hero rework (Figma)", cycle: 1, stage: "design", weekInCycle: 2,
        owner: "Design", dueDay: 9,
        gates: { design_qa: true, client_review: true },
      },
      {
        id: "fa-dv1", name: "PDP hero live", cycle: 1, stage: "development", weekInCycle: 3,
        owner: "Pod", dueDay: 12,
        gates: { design_qa: true, client_review: true, dev_qa: true },
        testResult: { status: "winner", liftPct: 33, significancePct: 95, notes: "Trust strip drove most of the lift. Significant at 95%." },
      },
      {
        id: "fa-dv2", name: "Cart upsell widget", cycle: 1, stage: "development", weekInCycle: 3,
        owner: "Pod", dueDay: 16,
        gates: { design_qa: true, client_review: true, dev_qa: true },
        testResult: { status: "winner", liftPct: 16, significancePct: 92, notes: "+£6 AOV vs control. Protein bar the dominant attach." },
      },
      {
        id: "fa-t1", name: "Bundle widget A/B test", cycle: 1, stage: "testing", weekInCycle: 4,
        owner: "Pod", dueDay: 19,
        gates: { design_qa: true, client_review: false, dev_qa: false },
        testResult: { status: "pending" },
      },
    ],
    deliverables: [
      { templateId: "fa-d1", status: "done", completedAtDay: 9, artefactUrl: "https://www.figma.com/file/forgePDP" },
      { templateId: "fa-dv1", status: "done", completedAtDay: 12, artefactUrl: "https://forge-athletics.com/products/whey" },
      { templateId: "fa-dv2", status: "done", completedAtDay: 16, artefactUrl: "https://forge-athletics.com/cart" },
      { templateId: "fa-t1", status: "in_progress" },
    ],
    assets: [
      { id: "fa-a1", cycle: 1, category: "figma", label: "PDP master file", url: "https://www.figma.com/file/forgePDP", addedBy: "Maria", addedAtDay: 5 },
      { id: "fa-a2", cycle: 1, category: "preview", label: "PDP live", url: "https://forge-athletics.com/products/whey", addedBy: "Pod", addedAtDay: 12 },
      { id: "fa-a3", cycle: 1, category: "analytics", label: "Intelligems dashboard", url: "https://app.intelligems.io/forge", addedBy: "Pod", addedAtDay: 12 },
    ],
    activity: [
      { id: "fa-act-1", day: 16, actor: "Pod", action: "Cart upsell widget live · winner +16% AOV" },
      { id: "fa-act-2", day: 12, actor: "Pod", action: "PDP hero live · winner +33% CVR" },
      { id: "fa-act-3", day: 9, actor: "Maria", action: "PDP design signed off by client" },
      { id: "fa-act-4", day: 1, actor: "Alister", action: "Client created" },
    ],
  },
];
