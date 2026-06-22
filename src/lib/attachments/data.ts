/* ── Attachments data layer ── */

import { createStore } from "@/lib/supabase-store";
import type { Attachment, AttachmentParentType, AttachmentTargetType } from "./types";

export const attachmentsStore = createStore<Attachment>({
  table: "attachments",
  lsKey: "launchpad-attachments",
});

export function uid(): string {
  return Math.random().toString(36).slice(2, 12);
}
export function nowISO(): string {
  return new Date().toISOString();
}

export function emptyAttachment(
  parentType: AttachmentParentType,
  parentId: string,
  targetType: AttachmentTargetType,
  targetTitle: string,
): Attachment {
  return {
    id: uid(),
    parent_type: parentType,
    parent_id: parentId,
    target_type: targetType,
    target_title: targetTitle,
    attached_by: "",
    created_at: nowISO(),
    updated_at: nowISO(),
  };
}
