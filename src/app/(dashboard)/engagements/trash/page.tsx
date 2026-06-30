"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeftIcon,
  ArrowUturnLeftIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import {
  bootstrapEngagementTrash,
  getTrashEntries,
  permanentlyDeleteEngagement,
  restoreEngagement,
  type TrashEntry,
} from "@/lib/engagement-trash";

export default function EngagementTrashPage() {
  const [entries, setEntries] = useState<TrashEntry[]>([]);
  const [purgeStage, setPurgeStage] = useState<
    { id: string; brand: string; typed: string } | null
  >(null);

  const refresh = useCallback(() => {
    setEntries(getTrashEntries());
  }, []);

  useEffect(() => {
    refresh();
    /* Pull cloud trash so a client deleted on another device still
     *  shows up here. Best-effort, localStorage is the always-correct
     *  cache. */
    bootstrapEngagementTrash().then(() => refresh());
  }, [refresh]);

  const handleRestore = (id: string) => {
    restoreEngagement(id);
    refresh();
  };

  const handlePurge = () => {
    if (!purgeStage) return;
    if (purgeStage.typed.trim() !== purgeStage.brand) return;
    permanentlyDeleteEngagement(purgeStage.id);
    setPurgeStage(null);
    refresh();
  };

  return (
    <div className="px-6 py-6 max-w-[1200px] mx-auto">
      <Link
        href="/engagements"
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted hover:text-foreground mb-4"
      >
        <ArrowLeftIcon className="size-3" />
        Back to clients
      </Link>

      <header className="mb-6 border-b border-border pb-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-subtle">
          Internal · Delivery
        </p>
        <h1 className="text-2xl font-semibold text-foreground mt-1">
          Trash
        </h1>
        <p className="text-sm text-muted mt-1">
          Deleted clients sit here until you restore or permanently remove them.
        </p>
      </header>

      {entries.length === 0 ? (
        <section className="rounded-lg border border-dashed border-border bg-background p-12 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-subtle mb-2">
            Trash is empty
          </p>
          <p className="text-[14px] text-foreground font-medium mb-1">
            Nothing to restore.
          </p>
          <p className="text-[12px] text-muted max-w-md mx-auto">
            Deleting a client from its detail page moves it here. Restore brings the brief, projects, and tasks back exactly as they were.
          </p>
        </section>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => {
            const trashedAt = new Date(entry.trashedAt);
            const projectsCount = entry.payload.projects?.length ?? 0;
            const tasksCount = entry.payload.tasks?.length ?? 0;
            return (
              <li
                key={entry.id}
                className="rounded-lg border border-border bg-surface p-4 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <h3 className="text-[14px] font-semibold text-foreground">
                      {entry.snapshot.brand}
                    </h3>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted bg-surface-raised px-1.5 py-0.5 rounded">
                      {entry.source === "pods"
                        ? "Pod client"
                        : entry.source === "local"
                          ? "Local"
                          : "Reference"}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted bg-surface-raised px-1.5 py-0.5 rounded">
                      {entry.snapshot.kind === "retainer" ? "Retainer" : "Bucket"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted mt-1">
                    Deleted{" "}
                    {trashedAt.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    at{" "}
                    {trashedAt.toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {entry.source === "pods" && (
                      <>
                        {" · "}
                        {projectsCount} project{projectsCount === 1 ? "" : "s"}
                        {" · "}
                        {tasksCount} task{tasksCount === 1 ? "" : "s"}
                      </>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleRestore(entry.id)}
                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-foreground bg-surface hover:bg-surface-raised border border-border px-3 py-1.5 rounded"
                  >
                    <ArrowUturnLeftIcon className="size-3" />
                    Restore
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPurgeStage({
                        id: entry.id,
                        brand: entry.snapshot.brand,
                        typed: "",
                      })
                    }
                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-danger bg-surface hover:bg-rose-500/15 border-rose-500/30 px-3 py-1.5 rounded"
                  >
                    <TrashIcon className="size-3" />
                    Delete forever
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {purgeStage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setPurgeStage(null)}
        >
          <div
            className="w-full max-w-md rounded-lg bg-surface p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-danger">
              Permanent delete
            </p>
            <h2 className="text-[16px] font-semibold text-foreground mt-1">
              Remove {purgeStage.brand} for good
            </h2>
            <p className="text-[13px] text-muted mt-2 leading-relaxed">
              This wipes the trash snapshot. Once it's gone the client cannot be restored.
            </p>
            <p className="text-[12px] text-muted mt-3">
              Type{" "}
              <span className="font-semibold text-foreground">
                {purgeStage.brand}
              </span>{" "}
              to confirm.
            </p>
            <input
              type="text"
              value={purgeStage.typed}
              onChange={(e) =>
                setPurgeStage({ ...purgeStage, typed: e.target.value })
              }
              autoFocus
              className="mt-2 w-full rounded border border-border px-3 py-2 text-[13px] focus:border-danger focus:outline-none"
              placeholder={purgeStage.brand}
            />
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPurgeStage(null)}
                className="text-[12px] font-medium text-muted hover:text-foreground px-3 py-2 rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={purgeStage.typed.trim() !== purgeStage.brand}
                onClick={handlePurge}
                className="text-[12px] font-semibold text-white bg-danger hover:bg-[#B71C1C] disabled:bg-border disabled:text-subtle disabled:cursor-not-allowed px-3 py-2 rounded"
              >
                Delete forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
