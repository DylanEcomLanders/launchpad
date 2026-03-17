export type IssueType = "bug" | "change-request" | "idea";
export type IssueStatus = "open" | "noted" | "in-progress" | "done";

export interface LaunchpadIssue {
  id: string;
  title: string;
  description: string;
  type: IssueType;
  page: string; // auto-captured URL path
  reported_by: string;
  status: IssueStatus;
  created_at: string;
}

export type LaunchpadIssueInsert = Omit<LaunchpadIssue, "id" | "status" | "created_at">;
