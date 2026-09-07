"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LogoMark } from "@/components/logo";
import {
  cardBounds,
  cardMatchesQuery,
  unitPeriod,
  type LibraryBoard,
  type LibraryCard,
} from "@/lib/library/cards";

const MIN_SCALE = 0.22;
const MAX_SCALE = 6;
const POPULATE_MS = 1000;

type Camera = { x: number; y: number; scale: number };

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function visibleCopies(
  camera: Camera,
  viewW: number,
  viewH: number,
  periodW: number,
  periodH: number,
) {
  const pad = 2;
  const left = (-camera.x) / camera.scale;
  const top = (-camera.y) / camera.scale;
  const right = left + viewW / camera.scale;
  const bottom = top + viewH / camera.scale;
  return {
    colMin: Math.floor(left / periodW) - pad,
    colMax: Math.ceil(right / periodW) + pad,
    rowMin: Math.floor(top / periodH) - pad,
    rowMax: Math.ceil(bottom / periodH) + pad,
  };
}

function cardInView(
  card: LibraryCard,
  copyCol: number,
  copyRow: number,
  periodW: number,
  periodH: number,
  camera: Camera,
  viewW: number,
  viewH: number,
) {
  const { x, y, w, h } = cardBounds(card, copyCol, copyRow, periodW, periodH);
  const sl = camera.x + x * camera.scale;
  const st = camera.y + y * camera.scale;
  const sr = sl + w * camera.scale;
  const sb = st + h * camera.scale;
  const m = 80;
  return sr > -m && sl < viewW + m && sb > -m && st < viewH + m;
}

export default function LibraryCanvas({ board }: { board: LibraryBoard }) {
  const { cards } = board;
  const { w: periodW, h: periodH } = unitPeriod(cards);
  const stageRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1280, h: 800 });
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, scale: 1 });
  const [query, setQuery] = useState("");
  const [dragging, setDragging] = useState(false);
  const [inspect, setInspect] = useState<{
    card: LibraryCard;
    copyCol: number;
    copyRow: number;
  } | null>(null);
  const [scrub, setScrub] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [entered, setEntered] = useState<Set<string>>(new Set());
  const [populated, setPopulated] = useState(false);
  const framed = useRef(false);
  const firstPaint = useRef(true);
  const inspectRef = useRef(inspect);
  inspectRef.current = inspect;
  const drag = useRef<{
    pointerId: number;
    sx: number;
    sy: number;
    cx: number;
    cy: number;
    moved: boolean;
  } | null>(null);
  const cameraRef = useRef(camera);
  cameraRef.current = camera;

  const filtered = useMemo(
    () => cards.filter((c) => cardMatchesQuery(c, query)),
    [cards, query],
  );

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const apply = () => {
      const r = el.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!cards.length || framed.current) return;
    if (size.w < 40 || size.h < 40) return;
    const { w, h } = unitPeriod(cards);
    const scale = clamp(Math.max(size.w / w, size.h / h) * 1.08, MIN_SCALE, 1.45);
    framed.current = true;
    setCamera({
      x: (size.w - w * scale) / 2,
      y: (size.h - h * scale) / 2,
      scale,
    });
  }, [cards, size.w, size.h]);

  useEffect(() => {
    if (!cards.length) return;
    const t = window.setTimeout(() => setPopulated(true), POPULATE_MS);
    return () => window.clearTimeout(t);
  }, [cards.length]);

  const copies = useMemo(
    () => visibleCopies(camera, size.w, size.h, periodW, periodH),
    [camera, size.w, size.h, periodW, periodH],
  );

  const instances = useMemo(() => {
    const out: { card: LibraryCard; copyCol: number; copyRow: number; key: string }[] = [];
    for (let cr = copies.rowMin; cr <= copies.rowMax; cr++) {
      for (let cc = copies.colMin; cc <= copies.colMax; cc++) {
        for (const card of filtered) {
          if (!cardInView(card, cc, cr, periodW, periodH, camera, size.w, size.h)) continue;
          out.push({ card, copyCol: cc, copyRow: cr, key: `${card.id}:${cc}:${cr}` });
        }
      }
    }
    return out;
  }, [filtered, copies, periodW, periodH, camera, size.w, size.h]);

  useEffect(() => {
    if (!instances.length) return;
    const missing = instances.filter((i) => !entered.has(i.key));
    if (!missing.length) return;
    if (firstPaint.current) {
      firstPaint.current = false;
      setEntered(new Set(instances.map((i) => i.key)));
      return;
    }
    const id = requestAnimationFrame(() => {
      setEntered((prev) => {
        const next = new Set(prev);
        for (const i of missing) next.add(i.key);
        return next;
      });
    });
    return () => cancelAnimationFrame(id);
  }, [instances, entered]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (inspect) return;
    if (e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = {
      pointerId: e.pointerId,
      sx: e.clientX,
      sy: e.clientY,
      cx: cameraRef.current.x,
      cy: cameraRef.current.y,
      moved: false,
    };
    setDragging(true);
  }, [inspect]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) d.moved = true;
    setCamera((c) => ({ ...c, x: d.cx + dx, y: d.cy + dy }));
  }, []);

  const endDrag = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    drag.current = null;
    setDragging(false);
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (inspectRef.current) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const factor = Math.exp(-e.deltaY * 0.00135);
      setCamera((c) => {
        const next = clamp(c.scale * factor, MIN_SCALE, MAX_SCALE);
        const k = next / c.scale;
        return { x: px - (px - c.x) * k, y: py - (py - c.y) * k, scale: next };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const closeInspect = useCallback(() => {
    setInspect(null);
    setScrub(0);
    setFlipped(false);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeInspect();
      if (e.key === " " && inspect) {
        e.preventDefault();
        setFlipped((f) => !f);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inspect, closeInspect]);

  const openCard = (card: LibraryCard, copyCol: number, copyRow: number) => {
    if (drag.current?.moved) return;
    setInspect({ card, copyCol, copyRow });
    setScrub(0);
    setFlipped(false);
  };

  const inspectFrames = inspect?.card.coverSlices ?? [];
  const inspectFrame =
    inspectFrames[Math.min(inspectFrames.length - 1, Math.max(0, Math.floor(scrub)))] ??
    inspectFrames[0];

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#f4f4f2] text-neutral-900">
      <div
        ref={stageRef}
        className={`absolute inset-0 touch-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div
          className="absolute left-0 top-0 will-change-transform"
          style={{
            transform: `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.scale})`,
            transformOrigin: "0 0",
          }}
        >
          {instances.map(({ card, copyCol, copyRow, key }) => {
            const { x, y, w, h } = cardBounds(card, copyCol, copyRow, periodW, periodH);
            const shown = entered.has(key);
            const cover = card.coverSlices[0]?.url;
            return (
              <button
                key={key}
                type="button"
                aria-label={card.name}
                onClick={() => openCard(card, copyCol, copyRow)}
                className="absolute overflow-hidden rounded-[3px] bg-[#d8d8d4] p-0"
                style={{
                  left: x,
                  top: y,
                  width: w,
                  height: h,
                  opacity: shown ? 1 : 0,
                  transform: shown ? "scale(1)" : "scale(0.96)",
                  transition: "opacity 420ms ease, transform 420ms ease",
                }}
              >
                {populated && cover ? (
                  <img
                    src={cover}
                    alt=""
                    draggable={false}
                    className="h-full w-full object-cover object-top"
                    style={{
                      opacity: 1,
                      animation: `lib-fill 380ms ease ${Math.min(card.col + card.row, 12) * 28}ms both`,
                    }}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {inspect ? (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 backdrop-blur-2xl"
          onClick={closeInspect}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={closeInspect}
            className="absolute right-5 top-5 text-[22px] font-light text-white/35 transition hover:text-white/70"
          >
            ×
          </button>
          <div
            className="relative overflow-hidden rounded-2xl border border-white/20 bg-white shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
            style={{ width: "min(520px, 78vw)", aspectRatio: "1 / 1.05" }}
            onClick={(e) => e.stopPropagation()}
            onMouseMove={(e) => {
              if (flipped || inspectFrames.length < 2) return;
              const r = e.currentTarget.getBoundingClientRect();
              const t = clamp((e.clientX - r.left) / r.width, 0, 0.999);
              setScrub(t * inspectFrames.length);
            }}
          >
            {flipped ? (
              <div className="flex h-full items-center justify-center bg-[#f4f4f2] px-8 text-center">
                <p className="text-[28px] font-semibold tracking-tight text-neutral-900">
                  {inspect.card.name}
                </p>
              </div>
            ) : inspectFrame ? (
              <img
                src={inspectFrame.url}
                alt=""
                className="h-full w-full object-cover object-top"
                draggable={false}
              />
            ) : null}
          </div>
          <p className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 text-[11px] tracking-wide text-white/45">
            move cursor across the card · Esc | click outside to close
          </p>
        </div>
      ) : null}

      {!inspect ? (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-5 z-20 flex justify-center px-4">
            <label className="pointer-events-auto relative w-full max-w-[420px]">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M16 16.5 20.5 21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the library…"
                className="w-full rounded-full border border-black/[0.08] bg-white py-2.5 pl-11 pr-5 text-[14px] text-neutral-800 shadow-[0_8px_28px_rgba(0,0,0,0.08)] outline-none placeholder:text-neutral-400"
              />
            </label>
          </div>
          <p className="pointer-events-none absolute bottom-5 left-1/2 z-20 -translate-x-1/2 rounded-full bg-white/90 px-3.5 py-1.5 text-[11px] tracking-wide text-neutral-500 shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
            drag to pan · scroll to zoom · click a card to inspect
          </p>
        </>
      ) : null}

      <div className="pointer-events-none absolute bottom-3 left-3 z-20 opacity-40">
        <LogoMark className="h-5 w-5" />
      </div>

      <style>{`
        @keyframes lib-fill {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
