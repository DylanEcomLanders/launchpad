/* ── Person rename propagation ──
 *
 * When admin edits Person.full_name, we sync the new name into the
 * places where pre-existing data stored the OLD name as a string:
 *
 *   - kanban_pods (designer / sec_designer / developer / sec_developer)
 *   - kanban_tasks (same four assignee fields)
 *   - pods_v2 PodMember.name (via the explicit pod_member_id bridge
 *     when present, OR name-match when not)
 *
 * The propagation is best-effort: it fires after the Person row is
 * already saved, errors get logged but don't surface to the user.
 * Future architecture: store person_id everywhere instead of name
 * strings, then this helper becomes obsolete.
 */

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { getPods } from "@/lib/pods-v2/data";

interface KanbanRowWithAssignees {
  id: string;
  designer: string | null;
  secondary_designer: string | null;
  developer: string | null;
  secondary_developer: string | null;
}

const ASSIGNEE_COLS = [
  "designer",
  "secondary_designer",
  "developer",
  "secondary_developer",
] as const;

/* Update kanban_pods + kanban_tasks where any of the four assignee
 * fields equals oldName, setting them to newName. Two queries per
 * table so we don't bloat the network with row-by-row updates. */
async function syncKanbanTable(
  table: "kanban_pods" | "kanban_tasks",
  oldName: string,
  newName: string,
): Promise<void> {
  for (const col of ASSIGNEE_COLS) {
    const { error } = await supabase
      .from(table)
      .update({ [col]: newName })
      .eq(col, oldName);
    if (error) {
      console.error(
        `[propagate-rename] ${table}.${col} update failed:`,
        error,
      );
    }
  }
}

/* Walk pods-v2 in localStorage and update any PodMember.name where
 * either (a) the explicit person_id link matches, or (b) the name
 * itself is a string match for oldName. Best-effort write through
 * the existing pods-v2 sync; if the user has cloud sync disabled
 * this still updates the local cache. */
function syncPodsV2(
  oldName: string,
  newName: string,
  personId: string,
): void {
  if (typeof window === "undefined") return;
  try {
    const pods = getPods();
    let dirty = false;
    for (const pod of pods) {
      for (const m of pod.members) {
        const matchesPerson = m.person_id === personId;
        const matchesName =
          !m.person_id && m.name.trim().toLowerCase() === oldName.trim().toLowerCase();
        if (matchesPerson || matchesName) {
          m.name = newName;
          dirty = true;
        }
      }
    }
    if (dirty) {
      window.localStorage.setItem(
        "launchpad-pods-v2-pods",
        JSON.stringify(pods),
      );
      /* Mirror to Supabase via the same dynamic import the data layer
       * uses, so multi-device sync stays consistent. */
      import("@/lib/pods-v2/sync").then(({ mirrorToSupabase }) => {
        mirrorToSupabase(
          "pods_v2_pods",
          pods as unknown as Array<Record<string, unknown> & { id: string }>,
        );
      });
    }
  } catch (err) {
    console.error("[propagate-rename] pods-v2 sync failed:", err);
  }
}

/* Sync the legacy settings.team directory (BusinessSettings.team) so
 * /tools/tickets and /sales-engine/lead-magnets reflect renames. The
 * settings store is async + lives in a different module; lazy-import
 * to avoid pulling it into every render. */
async function syncSettingsTeam(oldName: string, newName: string): Promise<void> {
  try {
    const { loadSettings, saveSettings } = await import("@/lib/settings");
    const settings = await loadSettings();
    let dirty = false;
    const oldKey = oldName.trim().toLowerCase();
    const team = (settings.team || []).map((m) => {
      if (m.name.trim().toLowerCase() === oldKey) {
        dirty = true;
        return { ...m, name: newName };
      }
      return m;
    });
    if (dirty) {
      await saveSettings({ ...settings, team });
    }
  } catch (err) {
    console.error("[propagate-rename] settings.team sync failed:", err);
  }
}

/* Public entry point. Caller passes the Person id (for explicit link
 * matching) + old/new full_name. Fires kanban + pods-v2 + settings.team
 * syncs concurrently and swallows any individual table failure. */
export async function propagatePersonRename(
  personId: string,
  oldName: string,
  newName: string,
): Promise<void> {
  if (!oldName || !newName || oldName === newName) return;
  syncPodsV2(oldName, newName, personId);
  syncSettingsTeam(oldName, newName);
  if (!isSupabaseConfigured()) return;
  try {
    await Promise.all([
      syncKanbanTable("kanban_pods", oldName, newName),
      syncKanbanTable("kanban_tasks", oldName, newName),
    ]);
  } catch (err) {
    console.error("[propagate-rename] kanban sync failed:", err);
  }
}
