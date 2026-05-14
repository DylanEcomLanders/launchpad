// ─── Monochrome line-art pod-member avatars ──────────────────────────
// Single navy ink on white. Hair carries the identity, face features
// are minimal (dot eyes, comma nose, single-curve smile). Shoulder
// triangle in navy. Optional white highlight stripe on hair.
//
// To tweak a person, edit AVATAR_PRESETS below, change `hair` to one
// of the named styles and optionally adjust `mouth` or `nose`.

"use client";

import { ReactElement } from "react";

const INK = "#1A1F50";
const HIGHLIGHT = "#FFFFFF";

// ── Type unions ─────────────────────────────────────────────────────

type HairStyle =
  | "top_bun"
  | "small_bun"
  | "long_curtain"
  | "long_wavy"
  | "long_swept"
  | "pompadour"
  | "buzz"
  | "side_part"
  | "curly_short"
  | "ponytail"
  | "bald";

type MouthStyle = "smile" | "neutral" | "smirk";
type NoseStyle = "comma" | "dot" | "none";
type EyeStyle = "dots" | "closed";

// ── Face base ───────────────────────────────────────────────────────

const lineProps = {
  stroke: INK,
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  fill: "none",
};

function FaceShape() {
  // Simple oval face with slight chin taper.
  return (
    <path
      d="M40 32 C40 22, 48 16, 60 16 C72 16, 80 22, 80 32 L80 50 C80 60, 72 66, 60 66 C48 66, 40 60, 40 50 Z"
      {...lineProps}
    />
  );
}

function Ear({ side }: { side: "left" | "right" }) {
  // Small ear curve at side of face.
  if (side === "left") {
    return <path d="M40 38 Q36 40, 38 46" {...lineProps} />;
  }
  return <path d="M80 38 Q84 40, 82 46" {...lineProps} />;
}

function Eyes({ style }: { style: EyeStyle }) {
  if (style === "closed") {
    return (
      <g {...lineProps} strokeWidth={1.4}>
        <path d="M51 41 Q53 43, 55 41" />
        <path d="M65 41 Q67 43, 69 41" />
      </g>
    );
  }
  return (
    <g fill={INK}>
      <circle cx="53" cy="41" r="1.5" />
      <circle cx="67" cy="41" r="1.5" />
    </g>
  );
}

function Nose({ style }: { style: NoseStyle }) {
  if (style === "none") return null;
  if (style === "dot") {
    return <circle cx="60" cy="48" r="1" fill={INK} />;
  }
  // comma, a tiny J curve
  return <path d="M59 46 Q58 50, 61 50" {...lineProps} strokeWidth={1.4} />;
}

function Mouth({ style }: { style: MouthStyle }) {
  if (style === "neutral") {
    return <path d="M55 56 L65 56" {...lineProps} strokeWidth={1.4} />;
  }
  if (style === "smirk") {
    return <path d="M54 56 Q60 58, 65 55" {...lineProps} strokeWidth={1.4} />;
  }
  return <path d="M54 55 Q60 60, 66 55" {...lineProps} strokeWidth={1.4} />;
}

// ── Shoulders ───────────────────────────────────────────────────────

function Shoulders() {
  return (
    <path
      d="M30 92 C30 78, 44 70, 60 70 C76 70, 90 78, 90 92 L90 100 L30 100 Z"
      fill={INK}
    />
  );
}

// ── Neck (optional, drawn under hair) ───────────────────────────────

function Neck() {
  return <path d="M54 64 L54 72 L66 72 L66 64" {...lineProps} />;
}

// ── Hair ────────────────────────────────────────────────────────────

function Hair({ style }: { style: HairStyle }) {
  switch (style) {
    case "top_bun":
      return (
        <g fill={INK}>
          {/* tied bun */}
          <ellipse cx="60" cy="10" rx="7" ry="6" />
          {/* short sides + crown */}
          <path d="M40 30 C40 18, 48 14, 60 14 C72 14, 80 18, 80 30 L80 24 C76 22, 70 22, 60 22 C50 22, 44 22, 40 24 Z" />
          {/* highlight */}
          <path
            d="M62 8 Q63 4, 60 4"
            stroke={HIGHLIGHT}
            strokeWidth="1.2"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      );
    case "small_bun":
      return (
        <g fill={INK}>
          <ellipse cx="60" cy="12" rx="5" ry="4" />
          <path d="M40 32 C40 20, 48 16, 60 16 C72 16, 80 20, 80 32 L80 26 C76 24, 70 24, 60 24 C50 24, 44 24, 40 26 Z" />
        </g>
      );
    case "long_curtain":
      return (
        <g fill={INK}>
          {/* top crown */}
          <path d="M38 32 C36 16, 46 8, 60 8 C74 8, 84 16, 82 32 C78 26, 72 22, 60 22 C48 22, 42 26, 38 32 Z" />
          {/* left curtain */}
          <path d="M38 32 C30 50, 32 70, 40 80 L46 76 C44 60, 42 46, 46 34 Z" />
          {/* right curtain */}
          <path d="M82 32 C90 50, 88 70, 80 80 L74 76 C76 60, 78 46, 74 34 Z" />
          {/* parting + shine */}
          <path
            d="M60 14 Q58 22, 56 32"
            stroke={HIGHLIGHT}
            strokeWidth="1.2"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      );
    case "long_wavy":
      return (
        <g fill={INK}>
          {/* top crown */}
          <path d="M38 32 C36 14, 46 6, 60 6 C74 6, 84 14, 82 32 C78 24, 72 22, 60 22 C48 22, 42 24, 38 32 Z" />
          {/* left wave down */}
          <path d="M38 32 C30 50, 28 76, 38 90 L44 86 Q40 60, 44 36 Z" />
          {/* right wave down */}
          <path d="M82 32 C90 50, 92 76, 82 90 L76 86 Q80 60, 76 36 Z" />
          {/* highlight */}
          <path
            d="M60 12 Q56 20, 56 32"
            stroke={HIGHLIGHT}
            strokeWidth="1.2"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      );
    case "long_swept":
      return (
        <g fill={INK}>
          <path d="M38 30 C36 12, 50 4, 64 6 C78 8, 84 18, 82 32 C78 28, 72 24, 60 24 C50 24, 44 26, 38 32 Z" />
          {/* sweep over forehead */}
          <path d="M38 30 Q56 36, 76 22 L74 16 Q56 26, 38 26 Z" />
          {/* long down right */}
          <path d="M82 32 C90 56, 88 80, 80 92 L74 86 Q76 60, 76 36 Z" />
          {/* highlight */}
          <path
            d="M68 16 Q60 24, 56 32"
            stroke={HIGHLIGHT}
            strokeWidth="1.2"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      );
    case "pompadour":
      return (
        <g fill={INK}>
          {/* short crown */}
          <path d="M40 30 C40 16, 48 10, 60 10 C72 10, 80 16, 80 30 L80 22 C76 20, 70 20, 60 20 C50 20, 44 20, 40 22 Z" />
          {/* lift quiff */}
          <path d="M52 14 C56 6, 66 6, 68 14 L66 22 C62 18, 56 18, 54 22 Z" />
          {/* highlight */}
          <path
            d="M58 8 Q60 4, 64 6"
            stroke={HIGHLIGHT}
            strokeWidth="1.2"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      );
    case "buzz":
      return (
        <path
          d="M40 30 C42 22, 48 18, 60 18 C72 18, 78 22, 80 30 L78 26 Q70 24, 60 24 Q50 24, 42 26 Z"
          fill={INK}
        />
      );
    case "side_part":
      return (
        <g fill={INK}>
          <path d="M40 30 C40 16, 48 10, 60 10 C72 10, 80 16, 80 30 L80 22 C76 20, 70 20, 60 20 C50 20, 44 20, 40 22 Z" />
          {/* long side flop */}
          <path d="M40 22 Q52 26, 70 14 L72 10 Q56 16, 40 16 Z" />
          <path
            d="M62 12 Q56 20, 50 22"
            stroke={HIGHLIGHT}
            strokeWidth="1.2"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      );
    case "curly_short":
      return (
        <g fill={INK}>
          <circle cx="44" cy="22" r="6" />
          <circle cx="52" cy="14" r="6" />
          <circle cx="60" cy="11" r="6" />
          <circle cx="68" cy="14" r="6" />
          <circle cx="76" cy="22" r="6" />
          <path d="M40 28 L80 28 L80 32 L40 32 Z" />
        </g>
      );
    case "ponytail":
      return (
        <g fill={INK}>
          <path d="M40 30 C40 14, 48 8, 60 8 C72 8, 80 14, 80 30 L78 24 C72 22, 66 22, 60 22 C54 22, 48 22, 42 24 Z" />
          {/* tail behind ear */}
          <path d="M82 30 C92 36, 96 56, 88 70 L80 64 Q86 50, 82 38 Z" />
          <path
            d="M60 12 Q58 20, 58 30"
            stroke={HIGHLIGHT}
            strokeWidth="1.2"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      );
    case "bald":
    default:
      return null;
  }
}

// ── Composition ─────────────────────────────────────────────────────

export interface AvatarProps {
  hair: HairStyle;
  eyes?: EyeStyle;
  mouth?: MouthStyle;
  nose?: NoseStyle;
  size?: number;
}

function Character(p: AvatarProps): ReactElement {
  const size = p.size ?? 48;
  return (
    <div
      style={{ width: size, height: size }}
      className="shrink-0 overflow-hidden rounded-md bg-[#F3F3F5]"
    >
      <svg
        viewBox="10 0 100 100"
        width={size}
        height={size}
        role="img"
        aria-hidden
        preserveAspectRatio="xMidYMid slice"
      >
        <Shoulders />
        <Neck />
        <FaceShape />
        <Ear side="left" />
        <Ear side="right" />
        <Eyes style={p.eyes ?? "dots"} />
        <Nose style={p.nose ?? "comma"} />
        <Mouth style={p.mouth ?? "smile"} />
        {/* Hair drawn last so it overlaps face crown */}
        <Hair style={p.hair} />
      </svg>
    </div>
  );
}

// ── Per-person presets ──────────────────────────────────────────────

export const AVATAR_PRESETS: Record<string, AvatarProps> = {
  // Pod 1
  Barnaby: { hair: "side_part", mouth: "smirk", nose: "comma" },
  Victoria: { hair: "long_curtain", mouth: "smile", nose: "comma" },
  Angel: { hair: "buzz", mouth: "neutral", nose: "comma" },
  Kaye: { hair: "top_bun", mouth: "smile", nose: "comma" },

  // Pod 2
  Jack: { hair: "pompadour", mouth: "smirk", nose: "comma" },
  Anastasia: { hair: "long_wavy", mouth: "smile", nose: "comma" },
  Ian: { hair: "small_bun", mouth: "neutral", nose: "comma" },
  Clien: { hair: "curly_short", mouth: "smile", nose: "comma" },

  // Pod 3
  Brandon: { hair: "ponytail", mouth: "smirk", nose: "comma" },
  Hitesh: { hair: "side_part", mouth: "neutral", nose: "comma" },
  Ashish: { hair: "long_swept", mouth: "smile", nose: "comma" },
};

// ── Public component ────────────────────────────────────────────────

interface PodAvatarProps {
  name: string;
  size?: number;
  isPlaceholder?: boolean;
  /** Uploaded photo URL, when set, replaces the SVG/initial fallback. */
  avatarUrl?: string;
}

export function PodAvatar({ name, size = 48, isPlaceholder, avatarUrl }: PodAvatarProps) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        width={size}
        height={size}
        style={{ width: size, height: size, objectFit: "cover" }}
        className="shrink-0 rounded-md"
      />
    );
  }
  if (isPlaceholder) {
    return (
      <div
        style={{ width: size, height: size }}
        className="grid shrink-0 place-items-center rounded-md border border-dashed border-[#C5C5C5] bg-white"
      >
        <svg
          viewBox="0 0 120 120"
          width={size * 0.85}
          height={size * 0.85}
          fill="none"
          stroke="#A0A0A0"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="60" cy="48" r="22" />
          <path d="M28 110 C28 88, 44 80, 60 80 C76 80, 92 88, 92 110" />
        </svg>
      </div>
    );
  }
  const preset = AVATAR_PRESETS[name];
  if (!preset) {
    const initials = name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
    return (
      <div
        style={{ width: size, height: size, fontSize: size * 0.34 }}
        className="grid shrink-0 place-items-center rounded-md bg-[#1A1F50] font-semibold text-white"
      >
        {initials}
      </div>
    );
  }
  return <Character {...preset} size={size} />;
}
