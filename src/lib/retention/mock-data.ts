// Mock fixture for the Retention dashboard.
//
// The real spine is `sales_clients` (028), but the Sales handoff that fills it
// isn't wired yet ("At wire-up, replace these consts with createStore()" —
// sales-dashboard/mock-data.ts), so the table is empty in prod today. Same
// stance the kanban + sales modules take: read the real store, fall back to
// this fixture so the screen is reviewable end-to-end.
//
// Client NAMES here deliberately match the kanban (Harvestory / Iron Paws /
// Acme Skincare) so the tests-shipped wiring resolves through the adapter.
// Dates are built relative to "today" at load so the health bands stay
// meaningful over time. Delete this file once Sales writes real clients.

import type { Client } from "@/lib/sales-dashboard/types";
import type { ClientReview, ClientResult, RetentionTask, HealthBand } from "./types";

function iso(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

export function mockClients(): Client[] {
  return [
    {
      id: "harvestory",
      name: "Harvestory",
      company: "Harvestory",
      lead_id: "lead-harvestory",
      pod_id: "pod-1",
      owner_id: "Dylan",
      plan: "core",
      mrr: 4500,
      status: "active",
      onboarded_at: iso(-120),
      renewal_date: iso(52),
      created_at: iso(-120),
    },
    {
      id: "iron-paws",
      name: "Iron Paws",
      company: "Iron Paws",
      lead_id: "lead-iron-paws",
      pod_id: "pod-3",
      owner_id: "Sam",
      plan: "pro",
      mrr: 8000,
      status: "active",
      onboarded_at: iso(-75),
      renewal_date: iso(12),
      created_at: iso(-75),
    },
    {
      id: "acme-skincare",
      name: "Acme Skincare",
      company: "Acme Skincare",
      lead_id: "lead-acme",
      pod_id: "pod-1",
      owner_id: "Dylan",
      plan: "custom",
      mrr: 6000,
      status: "active",
      onboarded_at: iso(-200),
      renewal_date: iso(80),
      created_at: iso(-200),
    },
  ];
}

export function mockReviews(): ClientReview[] {
  return [
    { id: "rev-1", client_id: "harvestory", type: "qbr", held_at: iso(-10), notes: "Q2 review — strong PDP wins, agreed Q3 roadmap.", next_due_at: iso(80), created_at: iso(-10) },
    { id: "rev-2", client_id: "iron-paws", type: "strategic_review", held_at: iso(-40), notes: "Roadmap reset after slow start.", next_due_at: iso(-10), created_at: iso(-40) },
    { id: "rev-3", client_id: "acme-skincare", type: "qbr", held_at: iso(-15), notes: "Hero refresh signed off, advertorials next.", next_due_at: iso(75), created_at: iso(-15) },
  ];
}

export function mockResults(): ClientResult[] {
  return [
    { id: "res-1", client_id: "harvestory", title: "Bundle PDP layout", metric: "+18% CVR", logged_at: iso(-10), created_at: iso(-10) },
    { id: "res-2", client_id: "harvestory", title: "Hero CTA copy", metric: "+8% add-to-cart", logged_at: iso(-25), created_at: iso(-25) },
    { id: "res-3", client_id: "acme-skincare", title: "Trust badges row", metric: "+4% RPV", logged_at: iso(-20), created_at: iso(-20) },
  ];
}

export function mockTasks(): RetentionTask[] {
  return [
    { id: "task-1", client_id: "iron-paws", title: "Prep renewal deck — pull shipped-test wins", due_at: iso(5), completed_at: null, created_at: iso(-2) },
    { id: "task-2", client_id: "harvestory", title: "Schedule Q3 QBR", due_at: iso(20), completed_at: null, created_at: iso(-1) },
  ];
}

/** Mock last-contact dates keyed by lead_id (stands in for sales_lead_messages,
 *  also empty in prod today). Iron Paws is deliberately quiet to demo the red
 *  band; Harvestory + Acme are in regular contact. */
export function mockLastContactByLead(): Record<string, string> {
  return {
    "lead-harvestory": iso(-3),
    "lead-iron-paws": iso(-18),
    "lead-acme": iso(-6),
  };
}

/** Mock manual overrides (none by default — proves the computed path). */
export const MOCK_OVERRIDES: Record<string, HealthBand | null> = {};
