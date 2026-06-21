// Retention data layer — Supabase-first stores (createStore) with a mock
// fallback, plus the signal/summary derivations the dashboard renders.

import { createStore } from "@/lib/supabase-store";
import type { Client, LeadMessage } from "@/lib/sales-dashboard/types";
import type { ClientReview, ClientResult, RetentionTask, HealthBand } from "./types";
import {
  resolveHealth,
  committedTestsToDate,
  RESULTS_LOOKBACK_DAYS,
  REVIEW_STALE_WARN_DAYS,
  type HealthInput,
  type HealthVerdict,
} from "./health";
import { deliverySignalsForClient, shippedTestCount, type DeliverySignals } from "./kanban";
import { suggestUpsell, type UpsellSuggestion } from "./upsell";
import {
  mockClients, mockReviews, mockResults, mockTasks, mockLastContactByLead, MOCK_OVERRIDES,
} from "./mock-data";

// ── Stores ──────────────────────────────────────────────────────────────────
export const clientsStore = createStore<Client>({ table: "sales_clients", lsKey: "launchpad-sales-clients" });
export const reviewsStore = createStore<ClientReview>({ table: "client_reviews", lsKey: "launchpad-client-reviews" });
export const resultsStore = createStore<ClientResult>({ table: "client_results", lsKey: "launchpad-client-results" });
export const tasksStore = createStore<RetentionTask>({ table: "retention_tasks", lsKey: "launchpad-retention-tasks" });
const messagesStore = createStore<LeadMessage>({ table: "sales_lead_messages", lsKey: "launchpad-sales-lead-messages" });

// ── Date helpers (local time) ────────────────────────────────────────────────
const DAY = 86_400_000;
function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}
export function daysSince(iso: string, today = new Date()): number {
  return Math.floor((startOfDay(today) - startOfDay(new Date(iso))) / DAY);
}
export function daysUntil(iso: string, today = new Date()): number {
  return Math.floor((startOfDay(new Date(iso)) - startOfDay(today)) / DAY);
}
function firstOfMonthISO(today = new Date()): string {
  return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
}
function startOfDayISO(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0, 10);
}

// ── Load ──────────────────────────────────────────────────────────────────
export interface RetentionData {
  clients: Client[];
  reviews: ClientReview[];
  results: ClientResult[];
  tasks: RetentionTask[];
  lastContactByLead: Record<string, string>;
  usingMock: boolean;
}

function lastContactMap(messages: LeadMessage[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const m of messages) {
    if (!m.lead_id || !m.created_at) continue;
    if (!map[m.lead_id] || m.created_at > map[m.lead_id]) map[m.lead_id] = m.created_at;
  }
  return map;
}

export async function loadRetention(): Promise<RetentionData> {
  const realClients = await clientsStore.getAll();
  const usingMock = realClients.length === 0;

  const [reviewsRaw, resultsRaw, tasksRaw, messagesRaw] = await Promise.all([
    reviewsStore.getAll(), resultsStore.getAll(), tasksStore.getAll(), messagesStore.getAll(),
  ]);

  const clients = usingMock ? mockClients() : realClients;
  const reviews = reviewsRaw.length ? reviewsRaw : usingMock ? mockReviews() : [];
  const results = resultsRaw.length ? resultsRaw : usingMock ? mockResults() : [];
  const tasks = tasksRaw.length ? tasksRaw : usingMock ? mockTasks() : [];

  let lastContactByLead = lastContactMap(messagesRaw);
  if (Object.keys(lastContactByLead).length === 0 && usingMock) lastContactByLead = mockLastContactByLead();

  return { clients, reviews, results, tasks, lastContactByLead, usingMock };
}

// ── Per-client view model ────────────────────────────────────────────────
export interface ClientRow {
  client: Client;
  health: HealthVerdict;
  daysToRenewal: number;
  testsShipped: number | null;
  testsCommitted: number | null;
  lastReviewAt: string | null;
  daysSinceLastReview: number | null;
  lastContactAt: string | null;
  daysSinceLastContact: number | null;
  resultsInLookback: number;
  delivery: DeliverySignals;
  upsell: UpsellSuggestion;
}

function latest(dates: string[]): string | null {
  return dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : null;
}

export function buildRow(client: Client, data: RetentionData, today = new Date()): ClientRow {
  const monthStart = firstOfMonthISO(today);
  const monthEnd = startOfDayISO(today);

  const lastReviewAt = latest(data.reviews.filter((r) => r.client_id === client.id).map((r) => r.held_at));
  const daysSinceLastReview = lastReviewAt == null ? null : daysSince(lastReviewAt, today);

  const lastContactAt = data.lastContactByLead[client.lead_id] ?? null;
  const daysSinceLastContact = lastContactAt == null ? null : daysSince(lastContactAt, today);

  const resultsInLookback = data.results.filter(
    (r) => r.client_id === client.id && daysSince(r.logged_at, today) <= RESULTS_LOOKBACK_DAYS,
  ).length;

  const daysToRenewal = daysUntil(client.renewal_date, today);

  const delivery = deliverySignalsForClient(client.name);
  const committed = committedTestsToDate(client.plan, today.getDate());
  const testsCommitted = committed;
  const testsShipped = committed == null ? null : shippedTestCount(client.name, monthStart, monthEnd);

  const input: HealthInput = {
    active: delivery.active,
    late: delivery.late,
    reworkHeavy: delivery.reworkHeavy,
    reworkWarming: delivery.reworkWarming,
    concludedTests: delivery.concludedTests,
    winningTests: delivery.winningTests,
    losingTests: delivery.losingTests,
    testsShipped,
    testsCommitted,
    daysSinceLastReview,
    daysSinceLastContact,
    daysToRenewal,
    resultsInLookback,
  };

  const override = (client.health_override ?? MOCK_OVERRIDES[client.id]) ?? null;
  const health = resolveHealth(override, input);

  const upsell = suggestUpsell({
    plan: client.plan,
    band: health.band,
    winningTests: delivery.winningTests,
    cadenceGood: testsShipped != null && testsCommitted != null && testsShipped >= testsCommitted,
    ontimeBad: delivery.late >= 2,
    daysToRenewal,
    resultsInLookback,
  });

  return {
    client, health, daysToRenewal, testsShipped, testsCommitted,
    lastReviewAt, daysSinceLastReview, lastContactAt, daysSinceLastContact,
    resultsInLookback, delivery, upsell,
  };
}

export function buildRows(data: RetentionData, today = new Date()): ClientRow[] {
  return data.clients.filter((c) => c.status !== "churned").map((c) => buildRow(c, data, today));
}

// ── Top-strip summary ────────────────────────────────────────────────────
export interface RetentionSummary {
  activeClients: number;
  mrrAtRisk: number;
  renewalsNext30: number;
  reviewsOverdue: number;
}

export function summarize(rows: ClientRow[]): RetentionSummary {
  return {
    activeClients: rows.filter((r) => r.client.status === "active").length,
    mrrAtRisk: rows.filter((r) => r.health.band !== "green").reduce((s, r) => s + (r.client.mrr || 0), 0),
    renewalsNext30: rows.filter((r) => r.daysToRenewal >= 0 && r.daysToRenewal <= 30).length,
    reviewsOverdue: rows.filter((r) => r.daysSinceLastReview == null || r.daysSinceLastReview >= REVIEW_STALE_WARN_DAYS).length,
  };
}

// ── Alerts ──────────────────────────────────────────────────────────────
export type AlertType = "renewal" | "deliverable_late" | "review_overdue" | "gone_quiet" | "tests_behind";
export interface RetentionAlert {
  clientId: string;
  clientName: string;
  type: AlertType;
  severity: HealthBand;
  message: string;
}

export function buildAlerts(rows: ClientRow[]): RetentionAlert[] {
  const alerts: RetentionAlert[] = [];
  const push = (r: ClientRow, type: AlertType, severity: HealthBand, message: string) =>
    alerts.push({ clientId: r.client.id, clientName: r.client.name, type, severity, message });

  for (const r of rows) {
    if (r.daysToRenewal >= 0 && r.daysToRenewal <= 30) {
      push(r, "renewal", r.daysToRenewal <= 14 ? "red" : "amber", `Renewal in ${r.daysToRenewal} day${r.daysToRenewal === 1 ? "" : "s"}${r.health.band !== "green" ? " while at risk" : ""}`);
    }
    for (const title of r.delivery.lateTitles) {
      push(r, "deliverable_late", "red", `${title} is running late`);
    }
    if (r.daysSinceLastReview == null || r.daysSinceLastReview >= REVIEW_STALE_WARN_DAYS) {
      push(r, "review_overdue", "amber", r.daysSinceLastReview == null ? "No review on record" : `No review in ${r.daysSinceLastReview} days`);
    }
    if (r.daysSinceLastContact != null && r.daysSinceLastContact >= 14) {
      push(r, "gone_quiet", "red", `No contact in ${r.daysSinceLastContact} days`);
    }
    if (r.testsShipped != null && r.testsCommitted != null && r.testsShipped < r.testsCommitted) {
      push(r, "tests_behind", "amber", `Tests behind: ${r.testsShipped}/${r.testsCommitted} this month`);
    }
  }
  return alerts.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "red" ? -1 : 1));
}

// ── Mutations ──────────────────────────────────────────────────────────────
export async function setHealthOverride(client: Client, band: HealthBand | null): Promise<void> {
  await clientsStore.update(client.id, { health_override: band });
}
export async function logReview(review: ClientReview): Promise<void> { await reviewsStore.create(review); }
export async function logResult(result: ClientResult): Promise<void> { await resultsStore.create(result); }
export async function logTask(task: RetentionTask): Promise<void> { await tasksStore.create(task); }
export async function toggleTask(task: RetentionTask): Promise<void> {
  await tasksStore.update(task.id, { completed_at: task.completed_at ? null : new Date().toISOString() });
}
