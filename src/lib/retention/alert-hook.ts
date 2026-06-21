// Alert delivery hook — STUB.
//
// ⚠️  Slack delivery is intentionally NOT built yet (out of scope, v1). This is
//     the single, clearly-marked seam where retention alerts would fire to
//     Slack (or email) later. Today it just logs in dev so the wiring is
//     visible. When Slack lands, implement the POST here (e.g. to the existing
//     slack-tickets channel webhook) — nothing else in the module changes.

import type { RetentionAlert } from "./data";

export function notifyAlertHook(alerts: RetentionAlert[]): void {
  if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.debug(`[retention] ${alerts.length} alert(s) — Slack hook stub (not yet wired)`, alerts);
  }
  // TODO(slack): POST alerts to the CS channel webhook. See src/lib/slack-tickets.ts.
}
