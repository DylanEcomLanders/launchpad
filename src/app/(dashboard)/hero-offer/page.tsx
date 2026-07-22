"use client";

/* ── Offer: the editable workspace ──
 * A left-nav TipTap workspace (like Clients): Overview / Price list / Resources
 * / Info as navigable pages the team edits in place, plus the stage decks linked
 * in the left bar. Each page saves as you type (localStorage + best-effort
 * Supabase, see lib/hero-offer/offer-doc.ts). No more code changes to tweak the
 * offer. DESIGN.md craft bar: dark tokens, 4px rounding, .pod-doc editor.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircleIcon, ArrowUpRightIcon } from "@heroicons/react/24/outline";
import { useRole } from "@/components/auth-gate";
import { DocEditor } from "../clients/editor";
import { loadOfferDoc, saveOfferDoc, OFFER_DECKS, type OfferSection } from "@/lib/hero-offer/offer-doc";

export default function OfferWorkspacePage() {
  const role = useRole();
  const isAdmin = role === "admin" || role === "cro";

  const [sections, setSections] = useState<OfferSection[] | null>(null);
  const [activeId, setActiveId] = useState("overview");
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<OfferSection[] | null>(null);

  useEffect(() => {
    let alive = true;
    loadOfferDoc().then((s) => {
      if (!alive) return;
      setSections(s);
      latest.current = s;
      setActiveId(s[0]?.id ?? "overview");
    });
    return () => {
      alive = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const active = useMemo(() => sections?.find((s) => s.id === activeId) ?? null, [sections, activeId]);

  const handleChange = useCallback(
    (html: string) => {
      setSections((prev) => {
        if (!prev) return prev;
        const next = prev.map((s) => (s.id === activeId ? { ...s, body: html } : s));
        latest.current = next;
        return next;
      });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        if (latest.current) void saveOfferDoc(latest.current);
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      }, 700);
    },
    [activeId],
  );

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left nav */}
      <aside className="w-52 shrink-0 overflow-y-auto border-r border-border-faint scrollbar-thin">
        <div className="px-2.5 py-4">
          <p className="px-1.5 pb-2 font-mono text-4xs font-medium uppercase tracking-widest text-subtle">Pages</p>
          <nav className="space-y-0.5">
            {(sections ?? []).map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveId(s.id)}
                className={`flex w-full items-center rounded-md px-2.5 py-1 text-left text-[13px] transition-colors ${
                  s.id === activeId
                    ? "bg-surface-raised font-medium text-foreground"
                    : "text-muted hover:bg-surface-hover hover:text-foreground"
                }`}
              >
                {s.title}
              </button>
            ))}
          </nav>

          <p className="px-1.5 pb-2 pt-5 font-mono text-4xs font-medium uppercase tracking-widest text-subtle">Decks</p>
          <nav className="space-y-0.5">
            {OFFER_DECKS.map((d) => (
              <Link
                key={d.href}
                href={d.href}
                className="flex items-center justify-between rounded-md px-2.5 py-1 text-[13px] text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
              >
                {d.label}
                <ArrowUpRightIcon className="size-3 shrink-0 text-subtle" />
              </Link>
            ))}
          </nav>

          {isAdmin && (
            <Link
              href="/operations"
              className="mt-5 flex items-center justify-between rounded-md px-2.5 py-1 text-[13px] text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              Operations
              <ArrowUpRightIcon className="size-3 shrink-0 text-subtle" />
            </Link>
          )}
        </div>
      </aside>

      {/* Editor */}
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto max-w-3xl px-8 py-8">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-2xs text-subtle">
              {isAdmin ? "Edit like a doc - it saves as you type." : "The offer at a glance."}
            </p>
            {saved && (
              <span className="inline-flex items-center gap-1 text-2xs text-status-ontrack">
                <CheckCircleIcon className="size-3.5" /> Saved
              </span>
            )}
          </div>

          {sections === null ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded border border-border-faint bg-surface" />
              ))}
            </div>
          ) : active ? (
            <DocEditor
              key={active.id}
              contentKey={`offer-${active.id}`}
              initialBody={active.body}
              onChange={handleChange}
            />
          ) : (
            <div className="grid h-40 place-items-center text-sm text-subtle">Pick a page.</div>
          )}
        </div>
      </main>
    </div>
  );
}
