/* ── Client touch types ── */

export type TouchKind =
  | "channel_message"     // pinged client in the dedicated channel
  | "call"                // sync call
  | "email"               // outbound email
  | "report_sent"
  | "strategy_call"
  | "qbr"                 // VIP quarterly business review
  | "other";

export interface ClientTouch {
  id: string;
  client_name: string;
  kind: TouchKind;
  at: string;             // ISO
  by: string;
  summary: string;
  /* Whether the client responded - drives at-risk silence signal.
   * Default true (we initiated, no reply needed); flip to false when
   * we're waiting on the client. */
  awaiting_reply: boolean;

  created_at: string;
  updated_at: string;
}

export const TOUCH_LABEL: Record<TouchKind, string> = {
  channel_message: "Channel message",
  call: "Call",
  email: "Email",
  report_sent: "Report sent",
  strategy_call: "Strategy call",
  qbr: "QBR (VIP)",
  other: "Other",
};
