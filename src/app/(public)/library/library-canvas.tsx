"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LogoMark } from "@/components/logo";
import {
  cardBounds,
  cardMatchesQuery,
  type LibraryCard,
} from "@/lib/library/cards";
import type { PortfolioSlice } from "@/lib/portfolio-v2/types";

const MIN_SCALE = 0.18;
const MAX_SCALE = 2.6;
const ZOOM_SENSITIVITY = 0.00135;

type Camera = { x: number; y: number; scale: number };

type InspectState = {
  card: LibraryCard;
  from: { x: number; y: number; w: number; h: number };
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function fitCamera(cards: LibraryCard[], vw: number, vh: number): Camera {
  const b = cardBounds(cards);
  const pad = 120;
  const w = Math.max(1, b.maxX - b.minX + pad * 2);
  const h = Math.max(1, b.maxY - b.minY + pad * 2);
  const scale = clamp(Math.min(vw / w, vh / h) * 0.92, 0.28, 1.05);
  const cx = (b.minX + b.maxX) / 2;
  const cy = (b.minY + b.maxY) / 2;
  return {
    scale,
    x: vw / 2 - cx * scale,
    y: vh / 2 - cy * scale,
  };
}

function applyWorld(el: HTMLDivElement | null, cam: Camera) {
  if (!el) return;
  el.style.transform = `translate3d(${cam.x}px, ${cam.y}px, 0) scale(${cam.scale})`;
}

export default function LibraryCanvas({ cards }: { cards: LibraryCard[] }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<Camera>({ x: 0, y: 0, scale: 1 });
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{ dist: number; midX: number; midY: number; scale: number } | null>(null);
  const dragRef = useRef<{
    id: number;
    x: number;
    y: number;
    camX: number;
    camY: number;
    moved: boolean;
    cardId: string | null;
  } | null>(null);

  const [query, setQuery] = useState("");
  const [inspect, setInspect] = useState<InspectState | null>(null);
  const [inspectOpen, setInspectOpen] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [closing, setClosing] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const visible = useMemo(
    () => new Set(cards.filter((c) => cardMatchesQuery(c, query)).map((c) => c.id)),
    [cards, query]
  );

  const setCamera = useCallback((next: Camera) => {
    cameraRef.current = next;
    applyWorld(worldRef.current, next);
  }, []);

  const zoomAt = useCallback(
    (clientX: number, clientY: number, factor: number) => {
      const cam = cameraRef.current;
      const scale = clamp(cam.scale * factor, MIN_SCALE, MAX_SCALE);
      const ratio = scale / cam.scale;
      setCamera({
        scale,
        x: clientX - (clientX - cam.x) * ratio,
        y: clientY - (clientY - cam.y) * ratio,
      });
    },
    [setCamera]
  );

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const { clientWidth, clientHeight } = el;
    setCamera(fitCamera(cards, clientWidth, clientHeight));
  }, [cards, setCamera]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (inspect) return;
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * ZOOM_SENSITIVITY);
      zoomAt(e.clientX, e.clientY, factor);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [inspect, zoomAt]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && inspect) {
        e.preventDefault();
        closeInspect();
        return;
      }
      if (e.key === " " && inspect && document.activeElement !== searchRef.current) {
        e.preventDefault();
        setFlipped((f) => !f);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // closeInspect is stable enough via inspect in closure; we redefine each render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inspect]);

  const openInspect = (card: LibraryCard, node: HTMLElement) => {
    if (!visible.has(card.id)) return;
    const rect = node.getBoundingClientRect();
    setFlipped(false);
    setClosing(false);
    setInspect({
      card,
      from: { x: rect.left, y: rect.top, w: rect.width, h: rect.height },
    });
    requestAnimationFrame(() => setInspectOpen(true));
  };

  const closeInspect = () => {
    if (!inspect || closing) return;
    setFlipped(false);
    setInspectOpen(false);
    setClosing(true);
    window.setTimeout(() => {
      setInspect(null);
      setClosing(false);
    }, 340);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (inspect) return;
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const target = e.target as HTMLElement | null;
    const cardId = target?.closest?.("[data-lib-card]")?.getAttribute("data-lib-card") ?? null;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 2) {
      const pts = [...pointersRef.current.values()];
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      pinchRef.current = {
        dist: Math.hypot(dx, dy) || 1,
        midX: (pts[0].x + pts[1].x) / 2,
        midY: (pts[0].y + pts[1].y) / 2,
        scale: cameraRef.current.scale,
      };
      dragRef.current = null;
      return;
    }

    dragRef.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      camX: cameraRef.current.x,
      camY: cameraRef.current.y,
      moved: false,
      cardId,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (inspect) return;
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    if (pointersRef.current.size === 2 && pinchRef.current) {
      const pts = [...pointersRef.current.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
      const midX = (pts[0].x + pts[1].x) / 2;
      const midY = (pts[0].y + pts[1].y) / 2;
      const factor = dist / pinchRef.current.dist;
      const nextScale = clamp(pinchRef.current.scale * factor, MIN_SCALE, MAX_SCALE);
      const cam = cameraRef.current;
      const ratio = nextScale / cam.scale;
      setCamera({
        scale: nextScale,
        x: midX - (midX - cam.x) * ratio + (midX - pinchRef.current.midX),
        y: midY - (midY - cam.y) * ratio + (midY - pinchRef.current.midY),
      });
      pinchRef.current = { ...pinchRef.current, midX, midY };
      return;
    }

    const drag = dragRef.current;
    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!drag.moved && dx * dx + dy * dy > 16) drag.moved = true;
    if (drag.moved) {
      setCamera({
        ...cameraRef.current,
        x: drag.camX + dx,
        y: drag.camY + dy,
      });
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;

    const drag = dragRef.current;
    if (!drag || drag.id !== e.pointerId) return;
    const cardId = drag.cardId;
    const moved = drag.moved;
    dragRef.current = null;
    if (moved || !cardId) return;
    const node = (e.target as HTMLElement | null)?.closest?.("[data-lib-card]") as HTMLElement | null;
    const card = cards.find((c) => c.id === cardId);
    if (card && node) openInspect(card, node);
  };

  return (
    <div
      ref={viewportRef}
      className="fixed inset-0 overflow-hidden select-none"
      style={{
        backgroundColor: "#E8E8E6",
        backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.16) 1.05px, transparent 1.15px)",
        backgroundSize: "22px 22px",
        touchAction: "none",
        cursor: inspect ? "default" : "grab",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        ref={worldRef}
        className="absolute top-0 left-0 will-change-transform"
        style={{
          transformOrigin: "0 0",
          backfaceVisibility: "hidden",
        }}
      >
        {cards.map((card) => {
          const shown = visible.has(card.id);
          const hiddenForInspect = inspect?.card.id === card.id;
          return (
            <div
              key={card.id}
              data-lib-card={card.id}
              className="absolute overflow-hidden bg-white"
              style={{
                left: card.x,
                top: card.y,
                width: card.w,
                height: card.h,
                transform: `rotate(${card.rotate}deg) translateZ(0)`,
                borderRadius: 14,
                boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 18px 40px rgba(0,0,0,0.10)",
                opacity: hiddenForInspect ? 0 : shown ? 1 : 0.08,
                pointerEvents: shown && !inspect ? "auto" : "none",
                cursor: "pointer",
                transition: "opacity 160ms ease",
              }}
            >
              <CardFace card={card} />
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center pt-5 px-4">
        <label className="pointer-events-auto relative block w-full max-w-[420px]">
          <span className="sr-only">Search the library</span>
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the library…"
            className="w-full h-11 rounded-full bg-white/92 text-[13px] text-[#1A1A1C] placeholder:text-[#8A8A8E] px-5 shadow-[0_8px_28px_rgba(0,0,0,0.10)] outline-none ring-1 ring-black/5 focus:ring-black/15"
            onPointerDown={(e) => e.stopPropagation()}
          />
        </label>
      </div>

      {!inspect && (
        <p className="pointer-events-none absolute inset-x-0 bottom-5 z-20 text-center text-[11px] tracking-wide text-black/40">
          drag to pan · scroll to zoom · click a card to expand
        </p>
      )}

      {/* Mark */}
      <div className="pointer-events-none absolute bottom-5 left-5 z-20 text-black/25">
        <LogoMark size={16} />
      </div>

      {inspect && (
        <InspectStage
          state={inspect}
          open={inspectOpen}
          flipped={flipped}
          onClose={closeInspect}
        />
      )}
    </div>
  );
}

function CardFace({ card }: { card: LibraryCard }) {
  if (card.preview) {
    return <SliceImage slice={card.preview} eager />;
  }
  return <EmptyFrame category={card.category} />;
}

function EmptyFrame({ category }: { category: string }) {
  const bars = [72, 88, 64, 80, 56];
  return (
    <div className="h-full w-full bg-[#F4F4F2] flex flex-col">
      <div className="h-7 flex items-center gap-1.5 px-2.5 border-b border-black/5">
        <span className="size-1.5 rounded-full bg-black/12" />
        <span className="size-1.5 rounded-full bg-black/12" />
        <span className="size-1.5 rounded-full bg-black/12" />
        <span className="ml-2 h-2 flex-1 rounded-full bg-black/[0.05]" />
      </div>
      <div className="flex-1 p-4 space-y-2.5">
        {bars.map((w, i) => (
          <div key={i} className="h-2 rounded-full bg-black/[0.06]" style={{ width: `${w}%` }} />
        ))}
        <div className="mt-5 aspect-[4/3] rounded-md bg-black/[0.04]" />
        <div className="h-2 rounded-full bg-black/[0.05] w-2/3" />
        <div className="h-2 rounded-full bg-black/[0.05] w-5/6" />
      </div>
      <span className="sr-only">{category}</span>
    </div>
  );
}

function SliceImage({ slice, eager }: { slice: PortfolioSlice; eager?: boolean }) {
  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundImage: slice.blur ? `url(${slice.blur})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "top",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={slice.url}
        alt=""
        draggable={false}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover object-top"
      />
    </div>
  );
}

function InspectStage({
  state,
  open,
  flipped,
  onClose,
}: {
  state: InspectState;
  open: boolean;
  flipped: boolean;
  onClose: () => void;
}) {
  const { card, from } = state;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const targetW = clamp(Math.min(420, vw * 0.42), 260, 460);
  const ratio = card.h / card.w;
  const targetH = clamp(targetW * ratio, 320, vh * 0.78);
  const toX = (vw - targetW) / 2;
  const toY = (vh - targetH) / 2;

  return (
    <div className="absolute inset-0 z-30" onPointerDown={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-2xl transition-opacity duration-300"
        style={{ opacity: open ? 1 : 0 }}
      />
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute top-5 right-6 z-40 text-white/35 hover:text-white/70 text-2xl leading-none"
      >
        ×
      </button>
      <p className="pointer-events-none absolute inset-x-0 bottom-5 z-40 text-center text-[11px] tracking-wide text-white/45">
        move cursor across the card · Esc | click outside to close
      </p>

      <div
        className="absolute"
        style={{
          left: open ? toX : from.x,
          top: open ? toY : from.y,
          width: open ? targetW : from.w,
          height: open ? targetH : from.h,
          transition: "left 340ms cubic-bezier(0.22,1,0.36,1), top 340ms cubic-bezier(0.22,1,0.36,1), width 340ms cubic-bezier(0.22,1,0.36,1), height 340ms cubic-bezier(0.22,1,0.36,1)",
          perspective: 1400,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="relative h-full w-full"
          style={{
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
            transition: "transform 520ms cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          <div
            className="absolute inset-0 overflow-hidden bg-white"
            style={{
              borderRadius: 16,
              boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
          >
            <InspectFront key={card.id} card={card} />
          </div>
          <div
            className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center bg-[#161616]"
            style={{
              borderRadius: 16,
              boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            {card.name ? (
              <p className="text-white text-xl md:text-2xl font-medium tracking-tight leading-tight">
                {card.name}
              </p>
            ) : null}
            <p className={`text-[11px] uppercase tracking-[0.18em] text-white/45 ${card.name ? "mt-3" : ""}`}>
              {card.category}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function InspectFront({ card }: { card: LibraryCard }) {
  const frames = card.slices;
  const [index, setIndex] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);

  const scrub = (clientX: number, clientY: number) => {
    if (frames.length < 2) return;
    const box = boxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const x = clamp((clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((clientY - rect.top) / rect.height, 0, 1);
    // Across the card: X walks variants / page frames; Y walks a long page.
    const t = frames.length > 3 ? (x + y) / 2 : x;
    const next = Math.round(t * (frames.length - 1));
    if (next === indexRef.current) return;
    indexRef.current = next;
    setIndex(next);
  };

  if (card.empty || frames.length === 0) {
    return <EmptyFrame category={card.category} />;
  }

  return (
    <div
      ref={boxRef}
      className="relative h-full w-full overflow-hidden"
      onPointerMove={(e) => scrub(e.clientX, e.clientY)}
    >
      {frames.map((slice, i) => (
        <div
          key={`${card.id}-${i}`}
          className="absolute inset-0"
          style={{
            opacity: i === index ? 1 : 0,
            pointerEvents: "none",
          }}
        >
          <SliceImage slice={slice} eager={i < 4} />
        </div>
      ))}
    </div>
  );
}
