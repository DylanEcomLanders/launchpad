/* ── Sync portal deliverables ↔ task board ── */

import type { PortalDeliverable } from "./types";

interface Task {
  id: string;
  title: string;
  assignee: string;
  dueDate: string;
  status: "todo" | "in-progress" | "done";
  client?: string;
  portalId?: string;
  deliverableId?: string;
}

interface BoardData {
  designTasks: Task[];
  devTasks: Task[];
}

const ADMIN_KEY = "ecomlanders2025";

async function fetchBoard(): Promise<BoardData> {
  try {
    const res = await fetch("/api/task-board", {
      headers: { "x-admin-key": ADMIN_KEY },
    });
    if (!res.ok) throw new Error("Failed to fetch board");
    return res.json();
  } catch {
    return { designTasks: [], devTasks: [] };
  }
}

async function saveBoard(board: BoardData): Promise<void> {
  await fetch("/api/task-board", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": ADMIN_KEY,
    },
    body: JSON.stringify(board),
  });
}

function mapDeliverableStatus(
  status: string
): "todo" | "in-progress" | "done" {
  switch (status) {
    case "complete":
      return "done";
    case "in-progress":
      return "in-progress";
    default:
      return "todo";
  }
}

function isDesignTask(deliverable: PortalDeliverable): boolean {
  const name = (deliverable.name + " " + (deliverable.phase || "")).toLowerCase();
  return name.includes("design") || name.includes("figma") || name.includes("mockup") || name.includes("wireframe");
}

/**
 * Sync a single deliverable to the task board.
 * Creates the task if it doesn't exist, updates status if it does.
 */
export async function syncDeliverableToBoard(
  portalId: string,
  deliverable: PortalDeliverable,
  clientName: string
): Promise<void> {
  const board = await fetchBoard();
  const allTasks = [...board.designTasks, ...board.devTasks];
  const existing = allTasks.find(
    (t) => t.portalId === portalId && t.deliverableId === deliverable.id
  );

  if (existing) {
    // Update status
    const newStatus = mapDeliverableStatus(deliverable.status);
    if (existing.status !== newStatus) {
      existing.status = newStatus;
      await saveBoard(board);
    }
    return;
  }

  // Create new task
  const task: Task = {
    id: crypto.randomUUID(),
    title: deliverable.name,
    assignee: deliverable.assignee || "",
    dueDate: "",
    status: mapDeliverableStatus(deliverable.status),
    client: clientName,
    portalId,
    deliverableId: deliverable.id,
  };

  if (isDesignTask(deliverable)) {
    board.designTasks.push(task);
  } else {
    board.devTasks.push(task);
  }

  await saveBoard(board);
}

/**
 * Sync all deliverables from a portal project to the task board.
 * Creates missing tasks, updates existing ones.
 */
export async function syncAllDeliverablesToBoard(
  portalId: string,
  deliverables: PortalDeliverable[],
  clientName: string
): Promise<void> {
  if (deliverables.length === 0) return;

  const board = await fetchBoard();
  const allTasks = [...board.designTasks, ...board.devTasks];
  let changed = false;

  for (const d of deliverables) {
    const existing = allTasks.find(
      (t) => t.portalId === portalId && t.deliverableId === d.id
    );

    if (existing) {
      const newStatus = mapDeliverableStatus(d.status);
      if (existing.status !== newStatus) {
        existing.status = newStatus;
        changed = true;
      }
      continue;
    }

    // Create new task
    const task: Task = {
      id: crypto.randomUUID(),
      title: d.name,
      assignee: d.assignee || "",
      dueDate: "",
      status: mapDeliverableStatus(d.status),
      client: clientName,
      portalId,
      deliverableId: d.id,
    };

    if (isDesignTask(d)) {
      board.designTasks.push(task);
    } else {
      board.devTasks.push(task);
    }
    changed = true;
  }

  if (changed) await saveBoard(board);
}
