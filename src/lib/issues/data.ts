import type { LaunchpadIssue, LaunchpadIssueInsert, IssueStatus } from "./types";

const LS_KEY = "launchpad-issues";

function uid(): string {
  return crypto.randomUUID();
}

function load(): LaunchpadIssue[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(LS_KEY);
  return stored ? JSON.parse(stored) : [];
}

function save(issues: LaunchpadIssue[]): void {
  localStorage.setItem(LS_KEY, JSON.stringify(issues));
}

export function getIssues(): LaunchpadIssue[] {
  return load().sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function createIssue(input: LaunchpadIssueInsert): LaunchpadIssue {
  const issue: LaunchpadIssue = {
    ...input,
    id: uid(),
    status: "open",
    created_at: new Date().toISOString(),
  };
  const all = load();
  all.unshift(issue);
  save(all);
  return issue;
}

export function updateIssueStatus(id: string, status: IssueStatus): void {
  const all = load();
  const updated = all.map((i) => (i.id === id ? { ...i, status } : i));
  save(updated);
}

export function deleteIssue(id: string): void {
  const all = load();
  save(all.filter((i) => i.id !== id));
}
