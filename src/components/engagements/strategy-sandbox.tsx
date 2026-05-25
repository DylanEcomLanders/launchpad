"use client";

/* Per-client strategy sandbox.
 *
 * Lives on the engagement page, sits between BriefIntakePanel and the
 * cycle/project sections. The strategist's localised space for one
 * client.
 *
 * Two things:
 *   1. Resources - drop files, paste Google Docs / Loom / URL links.
 *      Uploaded docs get a "Generate branded version" button.
 *   2. Notes - free-form scratchpad, autosaves.
 *
 * State persists to localStorage keyed by client id. Production will
 * swap to Supabase (a `strategy_sandbox` row per client, or a JSONB
 * column on the existing Client).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentTextIcon,
  EllipsisHorizontalIcon,
  LinkIcon,
  PaperClipIcon,
  PlayCircleIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

type ResourceKind = "doc" | "loom" | "link" | "file";

interface Resource {
  id: string;
  title: string;
  kind: ResourceKind;
  url?: string;
  added_at: string; // ISO
  added_by?: string;
  /** True when the resource is an uploaded file we can re-render with
   * Ecom Landers branding. Pasted links don't get the button. */
  brandable?: boolean;
}

interface NoteEntry {
  id: string;
  content: string;
  created_at: string; // ISO
}

interface SandboxState {
  resources: Resource[];
  entries: NoteEntry[];
}

const EMPTY: SandboxState = { resources: [], entries: [] };

const storageKey = (clientId: string) => `strategy-sandbox-${clientId}`;

function loadState(clientId: string): SandboxState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(storageKey(clientId));
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    const resources = Array.isArray(parsed.resources) ? parsed.resources : [];
    // Migrate legacy single-string notes into one entry.
    let entries: NoteEntry[] = Array.isArray(parsed.entries) ? parsed.entries : [];
    if (entries.length === 0 && typeof parsed.notes === "string" && parsed.notes.trim()) {
      entries = [
        {
          id: `migrated-${Date.now()}`,
          content: parsed.notes,
          created_at: new Date().toISOString(),
        },
      ];
    }
    return { resources, entries };
  } catch {
    return EMPTY;
  }
}

function detectKind(url: string): ResourceKind {
  const u = url.toLowerCase();
  if (u.includes("docs.google.com")) return "doc";
  if (u.includes("loom.com")) return "loom";
  return "link";
}

function inferTitleFromUrl(url: string): string {
  try {
    const u = new URL(url);
    // Trim "/" and any trailing slugs to get a readable hint
    const path = u.pathname.replace(/\/+$/, "");
    const last = path.split("/").filter(Boolean).pop();
    return `${u.hostname}${last ? ` · ${last}` : ""}`;
  } catch {
    return url;
  }
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

const newId = () => `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const RESOURCE_TONE: Record<ResourceKind, string> = {
  doc: "border-blue-200 bg-blue-50 text-blue-700",
  loom: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
  link: "border-emerald-200 bg-emerald-50 text-emerald-700",
  file: "border-[#E5E5EA] bg-[#F3F3F5] text-[#4A4A4A]",
};

const RESOURCE_ICON: Record<ResourceKind, React.ReactNode> = {
  doc: <DocumentTextIcon className="h-4 w-4" />,
  loom: <PlayCircleIcon className="h-4 w-4" />,
  link: <LinkIcon className="h-4 w-4" />,
  file: <PaperClipIcon className="h-4 w-4" />,
};

export function StrategySandbox({
  clientId,
  clientName,
}: {
  clientId: string;
  clientName: string;
}) {
  const [open, setOpen] = useState(true);
  const [state, setState] = useState<SandboxState>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [savedLabel, setSavedLabel] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hydrate from localStorage once.
  useEffect(() => {
    setState(loadState(clientId));
    setHydrated(true);
  }, [clientId]);

  // Persist on change (debounced via setTimeout).
  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(storageKey(clientId), JSON.stringify(state));
        setSavedLabel("Saved");
        window.setTimeout(() => setSavedLabel(null), 1500);
      } catch {
        // ignore
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [state, hydrated, clientId]);

  const addUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    const kind = detectKind(url);
    const resource: Resource = {
      id: newId(),
      title: inferTitleFromUrl(url),
      kind,
      url,
      added_at: new Date().toISOString(),
    };
    setState((s) => ({ ...s, resources: [resource, ...s.resources] }));
    setUrlInput("");
  };

  const onFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const resource: Resource = {
      id: newId(),
      title: file.name,
      kind: "file",
      added_at: new Date().toISOString(),
      brandable: true,
    };
    setState((s) => ({ ...s, resources: [resource, ...s.resources] }));
    e.target.value = "";
  };

  const removeResource = (id: string) =>
    setState((s) => ({ ...s, resources: s.resources.filter((r) => r.id !== id) }));

  const addEntry = (content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;
    const entry: NoteEntry = {
      id: newId(),
      content: trimmed,
      created_at: new Date().toISOString(),
    };
    setState((s) => ({ ...s, entries: [entry, ...s.entries] }));
  };
  const removeEntry = (id: string) =>
    setState((s) => ({ ...s, entries: s.entries.filter((e) => e.id !== id) }));

  const headerCount = useMemo(
    () => `${state.resources.length} resource${state.resources.length === 1 ? "" : "s"}`,
    [state.resources.length],
  );

  return (
    <section className="mb-5 rounded-lg border border-[#E5E5EA] bg-white">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-baseline justify-between px-4 py-3 text-left hover:bg-[#FAFAFB]"
      >
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-700">
            Strategy
          </span>
          <span className="text-[13px] font-semibold text-[#1B1B1B]">Sandbox</span>
          <span className="text-[10px] text-[#A0A0A0]">
            · {headerCount} for {clientName}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {savedLabel && (
            <span className="text-[10px] text-emerald-700">{savedLabel}</span>
          )}
          {open ? (
            <ChevronUpIcon className="h-4 w-4 text-[#A0A0A0]" />
          ) : (
            <ChevronDownIcon className="h-4 w-4 text-[#A0A0A0]" />
          )}
        </div>
      </button>

      {open && (
        <div className="grid gap-4 border-t border-[#F0F0F0] p-4 md:grid-cols-5">
          {/* Resources */}
          <div className="md:col-span-3">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#999]">
                Resources
              </span>
              <span className="text-[10px] tabular-nums text-[#A0A0A0]">
                {state.resources.length}
              </span>
            </div>

            {/* Add row */}
            <div className="mb-3 flex items-center gap-2 rounded-md border border-dashed border-[#C5C5C5] bg-[#FAFAFB] px-2.5 py-2">
              <LinkIcon className="h-3.5 w-3.5 text-[#7A7A7A] shrink-0" />
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addUrl();
                }}
                placeholder="Paste a Google Doc, Loom, or any link"
                className="flex-1 bg-transparent text-[12px] text-[#1B1B1B] placeholder-[#A0A0A0] focus:outline-none"
              />
              <button
                onClick={addUrl}
                disabled={!urlInput.trim()}
                className="inline-flex items-center gap-1 rounded-md bg-[#1B1B1B] px-2 py-1 text-[11px] font-medium text-white hover:bg-black disabled:bg-[#D5D5D8]"
              >
                <PlusIcon className="h-3 w-3" />
                Add
              </button>
              <span className="text-[10px] text-[#A0A0A0]">or</span>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 rounded-md border border-[#E5E5EA] bg-white px-2 py-1 text-[11px] font-medium text-[#1B1B1B] hover:border-[#1B1B1B]"
              >
                <PaperClipIcon className="h-3 w-3" />
                Upload
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={onFileChosen}
              />
            </div>

            {/* List */}
            {state.resources.length === 0 ? (
              <div className="rounded-md border border-dashed border-[#E5E5EA] bg-white px-3 py-4 text-center text-[11px] italic text-[#A0A0A0]">
                Nothing here yet. Drop a brief, paste a Loom, link a Google Doc.
              </div>
            ) : (
              <div className="space-y-1.5">
                {state.resources.map((r) => (
                  <ResourceRowView
                    key={r.id}
                    r={r}
                    onRemove={() => removeResource(r.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="md:col-span-2">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#999]">
                Notes
              </span>
              <span className="text-[10px] tabular-nums text-[#A0A0A0]">
                {state.entries.length}
              </span>
            </div>
            <NotesEntries
              entries={state.entries}
              clientName={clientName}
              onAdd={addEntry}
              onRemove={removeEntry}
            />
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Notes entries ───────────────────────────────────────────────────

function formatEntryDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();
  const time = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (sameDay) return `Today · ${time}`;
  if (isYesterday) return `Yesterday · ${time}`;
  const date = d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
  return `${date} · ${time}`;
}

function NotesEntries({
  entries,
  clientName,
  onAdd,
  onRemove,
}: {
  entries: NoteEntry[];
  clientName: string;
  onAdd: (content: string) => void;
  onRemove: (id: string) => void;
}) {
  const [draft, setDraft] = useState("");

  const submit = () => {
    if (!draft.trim()) return;
    onAdd(draft);
    setDraft("");
  };

  return (
    <div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={`New note for ${clientName}. Cmd+Enter to save.`}
        className="h-[78px] w-full resize-none rounded-md border border-[#E5E5EA] bg-[#FAFAFB] px-3 py-2 text-[12px] leading-relaxed text-[#1B1B1B] focus:border-[#1B1B1B] focus:outline-none"
      />
      <div className="mt-1 flex items-center justify-between">
        <span className="text-[10px] text-[#A0A0A0]">Cmd+Enter to save</span>
        <button
          onClick={submit}
          disabled={!draft.trim()}
          className="inline-flex items-center gap-1 rounded-md bg-[#1B1B1B] px-2.5 py-1 text-[11px] font-medium text-white hover:bg-black disabled:bg-[#D5D5D8]"
        >
          <PlusIcon className="h-3 w-3" />
          Add note
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="mt-3 rounded-md border border-dashed border-[#E5E5EA] bg-white px-3 py-3 text-center text-[11px] italic text-[#A0A0A0]">
          No notes yet.
        </div>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {entries.map((e) => (
            <li
              key={e.id}
              className="group rounded-md border border-[#EDEDEF] bg-white px-2.5 py-2"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0]">
                  {formatEntryDate(e.created_at)}
                </span>
                <button
                  onClick={() => onRemove(e.id)}
                  title="Delete"
                  className="rounded p-1 text-[#A0A0A0] opacity-0 transition-opacity hover:bg-[#F3F3F5] hover:text-rose-700 group-hover:opacity-100"
                >
                  <TrashIcon className="h-3 w-3" />
                </button>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed text-[#1B1B1B]">
                {e.content}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Resource row ────────────────────────────────────────────────────

function ResourceRowView({
  r,
  onRemove,
}: {
  r: Resource;
  onRemove: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <div className="group flex items-center gap-2.5 rounded-md border border-[#EDEDEF] bg-white px-2.5 py-2">
      <div
        className={`grid h-7 w-7 shrink-0 place-items-center rounded border ${RESOURCE_TONE[r.kind]}`}
      >
        {RESOURCE_ICON[r.kind]}
      </div>
      <div className="min-w-0 flex-1">
        {r.url ? (
          <a
            href={r.url}
            target="_blank"
            rel="noreferrer"
            className="block truncate text-[12px] font-medium text-[#1B1B1B] hover:text-violet-700 hover:underline"
          >
            {r.title}
          </a>
        ) : (
          <div className="truncate text-[12px] font-medium text-[#1B1B1B]">
            {r.title}
          </div>
        )}
        <div className="text-[10px] text-[#A0A0A0]">
          {r.kind === "doc"
            ? "Google Doc"
            : r.kind === "loom"
              ? "Loom"
              : r.kind === "link"
                ? "Link"
                : "File"}
          {" · "}
          {formatRelative(r.added_at)}
          {r.added_by ? ` · by ${r.added_by}` : ""}
        </div>
      </div>
      {r.brandable && (
        <button
          onClick={() => alert("Branded version would generate here.")}
          className="inline-flex items-center gap-1 rounded-md border border-[#E5E5EA] bg-white px-2 py-1 text-[10px] font-medium text-[#1B1B1B] hover:border-[#1B1B1B]"
        >
          <SparklesIcon className="h-3 w-3" />
          Generate branded version
        </button>
      )}
      <div ref={ref} className="relative">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className={`rounded p-1 text-[#A0A0A0] transition-opacity hover:bg-[#F3F3F5] hover:text-[#1B1B1B] ${menuOpen ? "opacity-100 bg-[#F3F3F5] text-[#1B1B1B]" : "opacity-0 group-hover:opacity-100"}`}
          title="Edit or remove"
        >
          <EllipsisHorizontalIcon className="h-4 w-4" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-7 z-10 min-w-[120px] overflow-hidden rounded-md border border-[#E5E5EA] bg-white shadow-lg">
            <button
              onClick={() => {
                onRemove();
                setMenuOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-rose-700 hover:bg-rose-50"
            >
              <TrashIcon className="h-3 w-3" />
              Remove
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
