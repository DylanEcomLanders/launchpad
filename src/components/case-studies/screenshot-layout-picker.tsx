"use client";

import { SCREENSHOT_LAYOUTS, type ScreenshotLayout } from "@/lib/case-studies/types";

interface Props {
  value: ScreenshotLayout;
  onChange: (next: ScreenshotLayout) => void;
}

/* Visual picker for the screenshot row layout. Renders a tiny diagram
 * of each option so the choice is obvious without reading. */
export function ScreenshotLayoutPicker({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
      {SCREENSHOT_LAYOUTS.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`p-2.5 border rounded-md text-left transition-colors ${
              active
                ? "border-[#1B1B1B] bg-[#FAFAFA]"
                : "border-[#E5E5EA] bg-white hover:border-[#A0A0A0]"
            }`}
          >
            <div className="aspect-[4/3] mb-1.5 flex items-center justify-center bg-[#F7F8FA] rounded">
              <LayoutDiagram layout={opt.id} />
            </div>
            <p className={`text-[10px] font-semibold leading-tight ${active ? "text-[#1B1B1B]" : "text-[#7A7A7A]"}`}>
              {opt.label}
            </p>
          </button>
        );
      })}
    </div>
  );
}

/* Tiny SVG diagram preview — same gap/proportions the public render
 * uses, just shrunk. Solid grey rectangles, no fluff. */
function LayoutDiagram({ layout }: { layout: ScreenshotLayout }) {
  const fill = "#C5C5C5";
  const props = { width: 60, height: 40, viewBox: "0 0 60 40" } as const;
  switch (layout) {
    case "single":
      return (
        <svg {...props}>
          <rect x="4" y="6" width="52" height="28" rx="2" fill={fill} />
        </svg>
      );
    case "two":
      return (
        <svg {...props}>
          <rect x="4" y="6" width="24" height="28" rx="2" fill={fill} />
          <rect x="32" y="6" width="24" height="28" rx="2" fill={fill} />
        </svg>
      );
    case "three":
      return (
        <svg {...props}>
          <rect x="4" y="6" width="15" height="28" rx="2" fill={fill} />
          <rect x="22.5" y="6" width="15" height="28" rx="2" fill={fill} />
          <rect x="41" y="6" width="15" height="28" rx="2" fill={fill} />
        </svg>
      );
    case "wide-stack":
      return (
        <svg {...props}>
          <rect x="4" y="6" width="32" height="28" rx="2" fill={fill} />
          <rect x="40" y="6" width="16" height="13" rx="2" fill={fill} />
          <rect x="40" y="21" width="16" height="13" rx="2" fill={fill} />
        </svg>
      );
    case "stack-wide":
      return (
        <svg {...props}>
          <rect x="4" y="6" width="16" height="13" rx="2" fill={fill} />
          <rect x="4" y="21" width="16" height="13" rx="2" fill={fill} />
          <rect x="24" y="6" width="32" height="28" rx="2" fill={fill} />
        </svg>
      );
  }
}
