"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { LogoMark } from "@/components/logo";
import {
  cardBounds,
  cardIsVisible,
  unitPeriod,
  type LibraryBoard,
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
  const pad = 48;
  const w = Math.max(1, b.maxX - b.minX + pad * 2);
  const h = Math.max(1, b.maxY - b.minY + pad * 2);
  const scale = clamp(Math.min(vw / w, vh / h) * 1.12, 0.34, 1.4);
  const cx = (b.minX + b.maxX) / 2;
  const cy = (b.minY + b.maxY) / 2;
  return {
    scale,
    x: vw / 2 - cx * scale,
    y: vh / 2 - cy * scale,
  };
}

function sourceId(id: string): string {
  const i = id.lastIndexOf("#");
  return i === -1 ? id : id.slice(0, i);
}

function tilesAround(cam: Camera, vw: number, vh: number, period: { x: number; y: number }): string[] {
  const minX = (0 - cam.x) / cam.scale;
  const minY = (0 - cam.y) / cam.scale;
  const maxX = (vw - cam.x) / cam.scale;
  const maxY = (vh - cam.y) / cam.scale;
  const padX = period.x * 0.85;
  const padY = period.y * 0.85;
  const minTx = Math.floor((minX - padX) / period.x);
  const maxTx = Math.ceil((maxX + padX) / period.x);
  const minTy = Math.floor((minY - padY) / period.y);
  const maxTy = Math.ceil((maxY + padY) / period.y);
  const out: string[] = [];
  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      out.push(`${tx}:${ty}`);
    }
  }
  return out;
}

function applyWorld(el: HTMLDivElement | null, cam: Camera) {
  if (!el) return;
  el.style.transform = `translate3d(${cam.x}px, ${cam.y}px, 0) scale(${cam.scale})`;
}

export default function LibraryCanvas({ board }: { board: LibraryBoard }) {
  const { cards, niches } = board;
  const period = useMemo(() => unitPeriod(cards), [cards]);
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

  const [tiles, setTiles] = useState<string[]>(["0:0", "1:0", "-1:0", "0:1", "0:-1"]);
  const tilesKeyRef = useRef(tiles.join("|"));
  const [query, setQuery] = useState("");
  const [niche, setNiche] = useState<string | null>(null);
  const [inspect, setInspect] = useState<InspectState | null>(null);
  const [inspectOpen, setInspectOpen] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [closing, setClosing] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const visible = useMemo(
    () => new Set(cards.filter((c) => cardIsVisible(c, query, niche)).map((c) => c.id)),
    [cards, query, niche]
  );

  const syncTiles = useCallback(
    (cam: Camera) => {
      const el = viewportRef.current;
      if (!el) return;
      const next = tilesAround(cam, el.clientWidth, el.clientHeight, period);
      const key = next.join("|");
      if (key === tilesKeyRef.current) return;
      tilesKeyRef.current = key;
      setTiles(next);
    },
    [period]
  );

  const setCamera = useCallback(
    (next: Camera) => {
      cameraRef.current = next;
      applyWorld(worldRef.current, next);
      syncTiles(next);
    },
    [syncTiles]
  );

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
    if (!visible.has(sourceId(card.id))) return;
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
    const source = cards.find((c) => c.id === sourceId(cardId));
    if (source && node && cardId) {
      openInspect({ ...source, id: cardId }, node);
    }
  };

  return (
    <div
      ref={viewportRef}
      className="fixed inset-0 overflow-hidden select-none"
      style={{
        backgroundColor: "#F4F3EF",
        backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.085) 0.9px, transparent 1px)",
        backgroundSize: "20px 20px",
        touchAction: "none",
        cursor: inspect ? "default" : "grab",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <style>{`
        .lib-card {
          opacity: 0;
          transform: rotate(var(--r, 0deg)) scale(0.92);
          transition: opacity 480ms cubic-bezier(0.22, 1, 0.36, 1), transform 560ms cubic-bezier(0.22, 1, 0.36, 1);
          will-change: opacity, transform;
        }
        .lib-card.lib-in {
          opacity: 1;
          transform: rotate(var(--r, 0deg)) scale(1);
        }
        .lib-card.lib-dim { opacity: 0.07 !important; }
        .lib-card.lib-gone { opacity: 0 !important; }
      `}</style>
      <div
        ref={worldRef}
        className="absolute top-0 left-0 will-change-transform"
        style={{
          transformOrigin: "0 0",
          backfaceVisibility: "hidden",
        }}
      >
        {tiles.flatMap((tile) => {
          const [tx, ty] = tile.split(":").map(Number);
          return cards.map((card) => {
            const inst: LibraryCard = {
              ...card,
              id: `${card.id}#${tile}`,
              x: card.x + tx * period.x,
              y: card.y + ty * period.y,
            };
            const shown = visible.has(card.id);
            const hiddenForInspect = inspect?.card.id === inst.id;
            return (
              <WallCard
                key={inst.id}
                card={inst}
                shown={shown}
                hidden={hiddenForInspect}
                locked={!!inspect}
              />
            );
          });
        })}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col items-center pt-4 px-4 gap-3">
        <label className="pointer-events-auto relative block w-full max-w-[440px]">
          <span className="sr-only">Search the library</span>
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the library…"
            className="w-full h-12 rounded-full bg-white text-[14px] text-[#1A1A1C] placeholder:text-[#9A9A9E] px-6 shadow-[0_10px_32px_rgba(0,0,0,0.08)] outline-none ring-1 ring-black/[0.06] focus:ring-black/12"
            onPointerDown={(e) => e.stopPropagation()}
          />
        </label>
        <div
          className="pointer-events-auto flex items-center gap-1.5 max-w-[780px] flex-wrap justify-center rounded-[28px] bg-white/95 pl-4 pr-2 py-2 shadow-[0_10px_32px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.06]"
          onPointerDown={(e) => e.stopPropagation()}
          role="group"
          aria-label="Niche"
        >
          <span className="text-[12px] font-semibold tracking-wide text-black/55 pl-1 pr-1">
            Niche
          </span>
          <FilterPill active={niche === null} onClick={() => setNiche(null)}>
            All
          </FilterPill>
          {niches.map((n) => (
            <FilterPill key={n} active={niche === n} onClick={() => setNiche(n)}>
              {n}
            </FilterPill>
          ))}
        </div>
      </div>

      {!inspect && (
        <p className="pointer-events-none absolute inset-x-0 bottom-5 z-20 flex justify-center">
          <span className="rounded-full bg-white/90 px-4 py-2 text-[11px] tracking-wide text-black/45 shadow-[0_6px_20px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.05]">
            drag to pan · scroll to zoom · click a card to expand
          </span>
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

function WallCard({
  card,
  shown,
  hidden,
  locked,
}: {
  card: LibraryCard;
  shown: boolean;
  hidden: boolean;
  locked: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) el.classList.add("lib-in");
      },
      { root: null, rootMargin: "80px", threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-lib-card={card.id}
      className={`lib-card absolute overflow-hidden ${hidden ? "lib-gone" : shown ? "" : "lib-dim"}`}
      style={{
        left: card.x,
        top: card.y,
        width: card.w,
        height: card.h,
        ["--r" as string]: `${card.rotate}deg`,
        borderRadius: 10,
        background: card.empty ? "#E6E5E1" : "#fff",
        boxShadow: "0 1px 1px rgba(0,0,0,0.035), 0 8px 22px rgba(0,0,0,0.07)",
        pointerEvents: shown && !locked ? "auto" : "none",
        cursor: "pointer",
      }}
    >
      <CardFace card={card} />
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 px-4 rounded-full text-[13px] font-medium tracking-wide transition-colors ${
        active
          ? "bg-[#111111] text-white"
          : "text-black/55 hover:text-black/80 hover:bg-black/[0.04]"
      }`}
    >
      {children}
    </button>
  );
}

function CardFace({ card }: { card: LibraryCard }) {
  if (card.coverSlices.length === 0) {
    return <EmptyFrame />;
  }
  return (
    <div className="absolute inset-0 overflow-hidden">
      {card.coverSlices.map((slice, i) => (
        <div
          key={`${card.id}-cover-${i}`}
          className="relative w-full"
          style={{ aspectRatio: `${slice.width} / ${slice.height}` }}
        >
          <SliceImage slice={slice} eager={i === 0} />
        </div>
      ))}
    </div>
  );
}

function EmptyFrame() {
  return <div className="h-full w-full" />;
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
        className="absolute inset-0 bg-black/60 backdrop-blur-[28px] transition-opacity duration-300"
        style={{ opacity: open ? 1 : 0 }}
      />
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute top-6 right-7 z-40 text-white/30 hover:text-white/65 text-[28px] leading-none font-light"
      >
        ×
      </button>
      <p className="pointer-events-none absolute inset-x-0 bottom-6 z-40 flex justify-center">
        <span className="rounded-full bg-white/10 px-4 py-2 text-[11px] tracking-wide text-white/55 ring-1 ring-white/10">
          move cursor across the card · Esc | click outside to close
        </span>
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
              borderRadius: 18,
              outline: "1px solid rgba(255,255,255,0.22)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.18), 0 40px 90px rgba(0,0,0,0.42)",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
          >
            <InspectFront key={card.id} card={card} />
          </div>
          <div
            className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center bg-[#141414]"
            style={{
              borderRadius: 18,
              outline: "1px solid rgba(255,255,255,0.14)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.18), 0 40px 90px rgba(0,0,0,0.42)",
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
            {(card.niche || card.category) && (
              <p className={`text-[11px] uppercase tracking-[0.18em] text-white/45 ${card.name ? "mt-3" : ""}`}>
                {card.niche || card.category}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InspectFront({ card }: { card: LibraryCard }) {
  const frames = card.slices;
  const [index, setIndex] = useState<number | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef<number | null>(null);

  const scrub = (clientX: number, clientY: number) => {
    if (frames.length < 2) return;
    const box = boxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const x = clamp((clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((clientY - rect.top) / rect.height, 0, 1);
    const t = frames.length > 3 ? (x + y) / 2 : x;
    const next = Math.round(t * (frames.length - 1));
    if (next === indexRef.current) return;
    indexRef.current = next;
    setIndex(next);
  };

  if (card.empty || frames.length === 0) {
    return <EmptyFrame />;
  }

  return (
    <div
      ref={boxRef}
      className="relative h-full w-full overflow-hidden"
      onPointerMove={(e) => scrub(e.clientX, e.clientY)}
    >
      {index === null ? (
        <CardFace card={card} />
      ) : (
        frames.map((slice, i) => (
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
        ))
      )}
    </div>
  );
}
