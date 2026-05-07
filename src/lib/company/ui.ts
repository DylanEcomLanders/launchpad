/* Helpers shared across company module pages. */

import { DEPARTMENT_COLORS } from "./types";

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "?";
}

export function deptColor(dept?: string): string {
  if (!dept) return "#7A7A7A";
  return DEPARTMENT_COLORS[dept] || "#7A7A7A";
}

export const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "#D1FAE5", text: "#047857", label: "Active" },
  on_leave: { bg: "#FEF3C7", text: "#B45309", label: "On leave" },
  notice: { bg: "#FEE2E2", text: "#B91C1C", label: "Notice" },
  left: { bg: "#E5E5EA", text: "#7A7A7A", label: "Left" },
};

export const INVOICE_STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "#FEF3C7", text: "#B45309", label: "Pending" },
  paid: { bg: "#D1FAE5", text: "#047857", label: "Paid" },
  overdue: { bg: "#FEE2E2", text: "#B91C1C", label: "Overdue" },
  disputed: { bg: "#E5E5EA", text: "#7A7A7A", label: "Disputed" },
};

export const CANDIDATE_STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  applied: { bg: "#E0E7FF", text: "#3730A3" },
  screening: { bg: "#FEF3C7", text: "#B45309" },
  interview: { bg: "#FEE2E2", text: "#B91C1C" },
  offer: { bg: "#FFEFE0", text: "#D97746" },
  hired: { bg: "#D1FAE5", text: "#047857" },
  rejected: { bg: "#E5E5EA", text: "#7A7A7A" },
};
