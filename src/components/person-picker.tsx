"use client";

/* ── PersonPicker ──
 *
 * Universal dropdown for picking a Person from /company/people. The
 * source of truth for "who is this human" everywhere across
 * Launchpad: pod slots, kanban designer/developer, lead.owner,
 * sales call by, discovery audit ran_by, proposal prepared_by, etc.
 *
 * Stores Person.id - never a free-text name. Display layer pulls
 * the Person record by ID so renames in /company/people propagate
 * to every linked surface.
 *
 * Loads all Persons once on mount + caches in module scope so the
 * 50-row team doesn't re-fetch on every picker render.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckIcon,
  ChevronUpDownIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { peopleStore } from "@/lib/company/data";
import type { Person } from "@/lib/company/types";
import { initials, deptColor } from "@/lib/company/ui";

/* Module-level cache so multiple pickers on the same page share one fetch. */
let cachedPeople: Person[] | null = null;
const subscribers = new Set<(p: Person[]) => void>();

async function loadPeople(): Promise<Person[]> {
  if (cachedPeople) return cachedPeople;
  const rows = await peopleStore.getAll();
  cachedPeople = rows;
  subscribers.forEach((fn) => fn(rows));
  return rows;
}

/* Drop the cache + refetch. Call after creating/editing/deleting a
 * Person so live pickers reflect the change. */
export function invalidatePeopleCache(): void {
  cachedPeople = null;
  loadPeople();
}

export interface PersonPickerProps {
  value?: string;                  // Person.id
  onChange: (personId: string | undefined) => void;
  placeholder?: string;            // "Unassigned" / "Pick a strategist"
  /* Optional filter — restrict by department / role. */
  filterByDepartment?: string;
  /* Show clear ("×") option in the dropdown. */
  clearable?: boolean;
  /* Compact mode for tight rows (no avatar, smaller height). */
  compact?: boolean;
  /* Visual disabled state (still readable, no clicks). */
  disabled?: boolean;
  className?: string;
}

export function PersonPicker({
  value,
  onChange,
  placeholder = "Pick a person",
  filterByDepartment,
  clearable = true,
  compact = false,
  disabled = false,
  className,
}: PersonPickerProps) {
  const [people, setPeople] = useState<Person[]>(cachedPeople ?? []);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement | null>(null);

  /* Subscribe to the module cache so invalidations refresh us. */
  useEffect(() => {
    if (cachedPeople) setPeople(cachedPeople);
    else loadPeople().then(setPeople);
    const sub = (p: Person[]) => setPeople(p);
    subscribers.add(sub);
    return () => {
      subscribers.delete(sub);
    };
  }, []);

  /* Click-outside closes the dropdown. */
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selected = useMemo(
    () => (value ? people.find((p) => p.id === value) : undefined),
    [value, people],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return people.filter((p) => {
      if (filterByDepartment && p.department !== filterByDepartment) return false;
      if (p.status === "left") return false;
      if (!q) return true;
      const hay = `${p.full_name} ${p.preferred_name || ""} ${p.job_title || ""} ${p.email || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [people, search, filterByDepartment]);

  return (
    <div ref={ref} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`w-full inline-flex items-center gap-2 ${compact ? "h-8 px-2 text-[12px]" : "h-9 px-3 text-[13px]"} rounded-md bg-background ring-1 ring-border hover:ring-border text-foreground transition-all ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        {selected ? (
          <>
            {!compact && (
              <div
                className="size-6 rounded-md flex items-center justify-center text-white text-[10px] font-semibold shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${deptColor(selected.department)} 0%, ${deptColor(selected.department)}99 100%)`,
                }}
              >
                {initials(selected.full_name)}
              </div>
            )}
            <span className="flex-1 truncate text-left">
              {selected.preferred_name || selected.full_name}
            </span>
          </>
        ) : (
          <>
            {!compact && <UserCircleIcon className="size-5 text-subtle shrink-0" />}
            <span className="flex-1 truncate text-left text-subtle">{placeholder}</span>
          </>
        )}
        <ChevronUpDownIcon className="size-3.5 text-subtle shrink-0" />
      </button>

      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full min-w-[240px] bg-surface-raised rounded-lg border border-border overflow-hidden">
          <div className="p-2 border-b border-border relative">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-3.5 text-subtle" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full h-7 pl-7 pr-2 bg-background rounded text-[12px] text-foreground placeholder:text-subtle focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {clearable && value && (
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onChange(undefined);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-[12px] text-subtle hover:text-danger hover:bg-danger/10"
                >
                  <XMarkIcon className="size-4" />
                  Clear
                </button>
              </li>
            )}
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-[11px] italic text-subtle">No matches.</li>
            ) : (
              filtered.map((p) => {
                const isActive = p.id === value;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(p.id);
                        setOpen(false);
                        setSearch("");
                      }}
                      className={`w-full text-left flex items-center gap-2.5 px-3 py-1.5 text-[12px] hover:bg-surface-hover `}
                    >
                      <div
                        className="size-6 rounded-md flex items-center justify-center text-white text-[10px] font-semibold shrink-0"
                        style={{
                          background: `linear-gradient(135deg, ${deptColor(p.department)} 0%, ${deptColor(p.department)}99 100%)`,
                        }}
                      >
                        {initials(p.full_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-foreground truncate">
                          {p.preferred_name || p.full_name}
                        </div>
                        {(p.job_title || p.department) && (
                          <div className="text-[10px] text-subtle truncate">
                            {p.job_title || p.department}
                          </div>
                        )}
                      </div>
                      {isActive && <CheckIcon className="size-3.5 text-success shrink-0" />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ── PersonPickerNamed ──
 *
 * Backwards-compat wrapper for surfaces that still STORE the picked
 * Person as a free-text display name (lead.owner, proposal.prepared_by,
 * sales_call.ran_by, etc.) rather than a Person.id reference.
 *
 * Externally it looks like a text input - value: string in, string
 * out. Internally it bridges to PersonPicker by resolving the current
 * string against the loaded Persons (case-insensitive name match) so
 * the dropdown highlights the right row.
 *
 * New entries always emit the canonical display name (preferred_name
 * fallback to full_name), which means the existing name-match
 * resolvers across the codebase get consistent input from now on.
 * Existing free-text records keep working unchanged.
 *
 * Migration path: as each surface adds a real `_person_id` companion
 * field, swap PersonPickerNamed → PersonPicker so the link becomes
 * explicit. Until then this is a one-line drop-in for any text input
 * that captures "who did this." */
export function PersonPickerNamed({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (name: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [people, setPeople] = useState<Person[]>(cachedPeople ?? []);
  useEffect(() => {
    if (cachedPeople) setPeople(cachedPeople);
    else loadPeople().then(setPeople);
    const sub = (p: Person[]) => setPeople(p);
    subscribers.add(sub);
    return () => {
      subscribers.delete(sub);
    };
  }, []);

  /* Resolve current free-text value → Person.id (case-insensitive
   * match against full_name OR preferred_name). Falls through to
   * undefined if the string doesn't match anyone, in which case the
   * picker shows the placeholder but still lets you pick. */
  const matched = useMemo(() => {
    if (!value) return undefined;
    const v = value.trim().toLowerCase();
    return people.find(
      (p) =>
        p.full_name.toLowerCase() === v ||
        (p.preferred_name && p.preferred_name.toLowerCase() === v),
    );
  }, [value, people]);

  function handlePick(id: string | undefined) {
    if (!id) {
      onChange("");
      return;
    }
    const p = people.find((x) => x.id === id);
    if (!p) return;
    onChange(p.preferred_name || p.full_name);
  }

  return (
    <PersonPicker
      value={matched?.id}
      onChange={handlePick}
      placeholder={placeholder || (value ? value : "Pick a person")}
      className={className}
    />
  );
}
