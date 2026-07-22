"use client";

/* ── Projects: Notes journal ──
 * A dated/timed journal — the client's running timeline. Each entry is stamped
 * with when it was logged, newest first. Anything worth chasing gets flagged as
 * an upsell opportunity, which highlights the entry (kept deliberately simple).
 */

import { PlusIcon, TrashIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { SparklesIcon as SparklesSolid } from "@heroicons/react/24/solid";
import type { NoteEntry } from "@/lib/pod-projects/types";

function stamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function JournalNotes({
  entries,
  onChange,
  onAdd,
  canEdit = true,
}: {
  entries: NoteEntry[];
  onChange: (entries: NoteEntry[]) => void;
  onAdd: () => void;
  canEdit?: boolean;
}) {
  const sorted = [...entries].sort((a, b) => b.at.localeCompare(a.at));
  const patch = (id: string, p: Partial<NoteEntry>) => onChange(entries.map((e) => (e.id === id ? { ...e, ...p } : e)));
  const remove = (id: string) => onChange(entries.filter((e) => e.id !== id));

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto w-full max-w-[820px] px-6 py-8 md:px-10">
        <div className="flex items-start justify-between gap-4">
          <p className="text-sm text-muted">
            A dated journal — the client timeline. Newest first. Flag anything worth chasing as an upsell opportunity.
          </p>
          {canEdit && (
            <button
              onClick={onAdd}
              className="flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              <PlusIcon className="size-3.5" /> Add note
            </button>
          )}
        </div>

        <div className="mt-4 space-y-2.5">
          {sorted.length === 0 && (
            <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-subtle">
              No notes yet — add the first entry.
            </div>
          )}
          {sorted.map((e) => (
            <div
              key={e.id}
              className={`group/note rounded-lg border p-3 transition-colors ${
                e.upsell ? "border-l-2 border-status-approaching/60 bg-status-approaching/5" : "border-border-faint"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-2xs font-medium tabular-nums text-subtle">{stamp(e.at)}</span>
                <div className="flex items-center gap-1">
                  {e.upsell && (
                    <span className="rounded-sm bg-status-approaching/15 px-1.5 py-0.5 text-3xs font-semibold uppercase tracking-wide text-status-approaching">
                      Upsell
                    </span>
                  )}
                  {canEdit && (
                    <button
                      onClick={() => patch(e.id, { upsell: !e.upsell })}
                      title={e.upsell ? "Remove upsell flag" : "Flag as upsell opportunity"}
                      className={`flex size-6 items-center justify-center rounded transition-colors ${
                        e.upsell ? "text-status-approaching" : "text-subtle opacity-0 hover:text-foreground group-hover/note:opacity-100"
                      }`}
                    >
                      {e.upsell ? <SparklesSolid className="size-4" /> : <SparklesIcon className="size-4" />}
                    </button>
                  )}
                  {canEdit && (
                    <button
                      onClick={() => remove(e.id)}
                      title="Delete note"
                      className="flex size-6 items-center justify-center rounded text-subtle opacity-0 transition-opacity hover:text-danger group-hover/note:opacity-100"
                    >
                      <TrashIcon className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <textarea
                value={e.text}
                onChange={(ev) => patch(e.id, { text: ev.target.value })}
                readOnly={!canEdit}
                placeholder="What happened…"
                rows={2}
                className="mt-1 w-full resize-y bg-transparent text-sm leading-relaxed text-foreground placeholder:text-subtle focus:outline-none"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
