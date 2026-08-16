"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PortfolioProject, PortfolioSlice } from "@/lib/portfolio-v2/types";
import type { WorkPiece } from "@/lib/work/types";
import { WorkChrome } from "./chrome";
import { PageFrame } from "./page-frame";

function SliceStack({
  slices,
  mode,
}: {
  slices: PortfolioSlice[];
  mode: "desktop" | "mobile";
}) {
  return (
    <div className={mode === "mobile" ? "mx-auto max-w-[390px]" : "mx-auto max-w-5xl"}>
      {slices.map((slice, i) => (
        <div
          key={`${mode}-${i}`}
          className="work-slice"
          style={{
            aspectRatio: `${slice.width} / ${slice.height}`,
            backgroundImage: slice.blur ? `url(${slice.blur})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slice.url}
            alt=""
            loading={i < 2 ? "eager" : "lazy"}
            decoding="async"
            className="!object-cover"
          />
        </div>
      ))}
    </div>
  );
}

function DeviceToggle({
  mode,
  onChange,
  hasDesktop,
  hasMobile,
}: {
  mode: "desktop" | "mobile";
  onChange: (mode: "desktop" | "mobile") => void;
  hasDesktop: boolean;
  hasMobile: boolean;
}) {
  if (!hasDesktop || !hasMobile) return null;
  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-full border border-[var(--work-line)]">
      {(["desktop", "mobile"] as const).map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          className={`px-3 py-1 text-[11px] capitalize tracking-wide rounded-full transition-colors ${
            mode === value
              ? "bg-[var(--work-ink)] text-[var(--work-bg)]"
              : "text-[var(--work-mute)] hover:text-[var(--work-ink)]"
          }`}
        >
          {value}
        </button>
      ))}
    </div>
  );
}

export function StageView({
  piece,
  prev,
  next,
  overlay,
  onClose,
}: {
  piece: WorkPiece;
  prev?: { slug: string; name: string } | null;
  next?: { slug: string; name: string } | null;
  overlay?: boolean;
  onClose?: () => void;
}) {
  const router = useRouter();
  const [pair, setPair] = useState<"after" | "before">("after");
  const activeProject: PortfolioProject | null =
    pair === "before" && piece.before ? piece.before : piece.project;
  const hasDesktop = (activeProject?.desktop_slices.length ?? 0) > 0;
  const hasMobile = (activeProject?.mobile_slices.length ?? 0) > 0;
  const [mode, setMode] = useState<"desktop" | "mobile">(hasDesktop ? "desktop" : "mobile");

  useEffect(() => {
    const nextMode =
      (pair === "before" && piece.before ? piece.before : piece.project)?.desktop_slices
        .length
        ? "desktop"
        : "mobile";
    setMode(nextMode);
  }, [pair, piece]);

  useEffect(() => {
    if (!overlay) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [overlay]);

  useEffect(() => {
    if (overlay) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        router.push("/work");
      } else if (event.key === "ArrowLeft" && prev) {
        event.preventDefault();
        router.push(`/work/${prev.slug}`);
      } else if (event.key === "ArrowRight" && next) {
        event.preventDefault();
        router.push(`/work/${next.slug}`);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [overlay, prev, next, router]);

  const slices = useMemo(() => {
    if (!activeProject) return [];
    return mode === "desktop" ? activeProject.desktop_slices : activeProject.mobile_slices;
  }, [activeProject, mode]);

  const canPair = Boolean(piece.before && piece.project);

  const inner = (
    <>
      <WorkChrome
        backHref={overlay ? undefined : "/work"}
        backLabel={overlay ? undefined : "All work"}
        extra={
          overlay && onClose ? (
            <>
              <Link
                href={`/work/${piece.slug}`}
                className="text-[var(--work-mute)] hover:text-[var(--work-ink)]"
              >
                Open page
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="text-[var(--work-mute)] hover:text-[var(--work-ink)]"
              >
                Close
              </button>
            </>
          ) : null
        }
      />

      <div className={overlay ? "work-stage-scroll" : ""}>
        <section className="px-5 md:px-8 pt-10 md:pt-14 pb-8 max-w-6xl">
          <p
            className="text-[10px] uppercase tracking-[0.22em] text-[var(--work-mute)] mb-4"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {piece.story?.eyebrow ?? piece.category}
          </p>
          <h1
            className="text-4xl md:text-6xl font-semibold tracking-tight leading-[0.95]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {piece.name}
          </h1>
          {piece.story && (
            <p className="mt-6 text-lg md:text-2xl text-[var(--work-ink)]/80 max-w-2xl leading-snug">
              {piece.story.lead}
            </p>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <DeviceToggle
              mode={mode}
              onChange={setMode}
              hasDesktop={hasDesktop}
              hasMobile={hasMobile}
            />
            {canPair && (
              <div className="inline-flex items-center gap-1 p-1 rounded-full border border-[var(--work-line)]">
                <button
                  type="button"
                  onClick={() => setPair("before")}
                  className={`px-3 py-1 text-[11px] rounded-full ${
                    pair === "before"
                      ? "bg-[var(--work-ink)] text-[var(--work-bg)]"
                      : "text-[var(--work-mute)] hover:text-[var(--work-ink)]"
                  }`}
                >
                  Before
                </button>
                <button
                  type="button"
                  onClick={() => setPair("after")}
                  className={`px-3 py-1 text-[11px] rounded-full ${
                    pair === "after"
                      ? "bg-[var(--work-ink)] text-[var(--work-bg)]"
                      : "text-[var(--work-mute)] hover:text-[var(--work-ink)]"
                  }`}
                >
                  After
                </button>
              </div>
            )}
          </div>
        </section>

        {piece.story && (
          <section className="px-5 md:px-8 pb-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl">
            {piece.story.beats.map((beat) => (
              <div key={beat.label}>
                <p
                  className="text-[10px] uppercase tracking-[0.2em] text-[var(--work-mute)] mb-3"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {beat.label}
                </p>
                <p className="text-sm leading-relaxed text-[var(--work-ink)]/75">{beat.body}</p>
              </div>
            ))}
          </section>
        )}

        <section className="px-4 md:px-8 pb-20">
          {slices.length > 0 ? (
            <SliceStack slices={slices} mode={mode} />
          ) : (
            <div className="max-w-xl mx-auto">
              <PageFrame project={null} label={piece.name} eager live={false} aspect="4 / 5" />
              <p className="mt-6 text-sm text-[var(--work-mute)] text-center">
                The page lands here the moment this project is synced into the library.
              </p>
            </div>
          )}
        </section>

        {(prev || next) && !overlay && (
          <nav className="px-5 md:px-8 py-10 border-t border-[var(--work-faint)] flex items-center justify-between gap-4">
            {prev ? (
              <Link href={`/work/${prev.slug}`} className="group min-w-0">
                <div
                  className="text-[10px] uppercase tracking-[0.2em] text-[var(--work-mute)] mb-1"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  Previous
                </div>
                <div className="text-[var(--work-ink)] group-hover:opacity-70 truncate">
                  ← {prev.name}
                </div>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link href={`/work/${next.slug}`} className="group min-w-0 text-right">
                <div
                  className="text-[10px] uppercase tracking-[0.2em] text-[var(--work-mute)] mb-1"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  Next
                </div>
                <div className="text-[var(--work-ink)] group-hover:opacity-70 truncate">
                  {next.name} →
                </div>
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </div>
    </>
  );

  if (overlay) {
    return <div className="work-stage">{inner}</div>;
  }

  return <div className="min-h-screen">{inner}</div>;
}
