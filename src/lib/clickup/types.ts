/* ── ClickUp API response types ── */

export interface ClickUpTask {
  id: string;
  name: string;
  status: { status: string; type: string };
  list: { id: string; name: string };
  folder?: { id: string; name: string };
  assignees: ClickUpAssignee[];
  due_date: string | null; // epoch ms as string
  date_created: string; // epoch ms as string
  date_updated: string; // epoch ms as string
  custom_fields: ClickUpCustomField[];
  checklists: ClickUpChecklist[];
  url: string;
}

export interface ClickUpAssignee {
  id: number;
  username: string;
  profilePicture: string | null;
}

export interface ClickUpCustomField {
  id: string;
  name: string;
  value: string | number | null;
  type: string;
  type_config?: {
    options?: { id: string; name: string; orderindex: number }[];
  };
}

export interface ClickUpChecklist {
  id: string;
  name: string;
  resolved: number;
  unresolved: number;
  items: ClickUpChecklistItem[];
}

export interface ClickUpChecklistItem {
  id: string;
  name: string;
  resolved: boolean;
  assignee: ClickUpAssignee | null;
}

/* ── Processed types for the frontend ── */

export interface OpsTask {
  id: string;
  name: string;
  client: string; // from list.name
  stage: string; // human-readable stage
  stageIndex: number; // 0-4 for pipeline position
  assignees: string[];
  designDeadline: string | null; // ISO string
  devDeadline: string | null; // ISO string
  designOverdue: boolean;
  devOverdue: boolean;
  daysOverdue: number; // max of either, 0 if not overdue
  qaScore: number; // 0-100, overall checklist completion %
  qaViolation: boolean; // in stage N but stage N-1 checklist incomplete
  qaGateName: string | null; // which gate is violated
  blockerItems: string[]; // unresolved items from the violated gate
  updatedAt: string; // ISO string
  daysSilent: number; // days since last update
  clickupUrl: string;
}

export interface OpsRadarData {
  tasks: OpsTask[];
  fetchedAt: string;
  summary: OpsRadarSummary;
}

export interface OpsRadarSummary {
  total: number;
  overdue: number;
  qaViolations: number;
  silentOver7Days: number;
  byStage: Record<string, number>;
  byAssignee: Record<string, number>;
}
