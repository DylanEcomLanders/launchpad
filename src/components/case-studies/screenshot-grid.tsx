/* ── Screenshot grid renderer ──
 * Single source of truth for laying out the screenshot row on the
 * public case study page. Editor uses the same component (with input
 * placeholders) so the live preview matches the published render
 * exactly.
 */

import { slotsForLayout, type ScreenshotLayout } from "@/lib/case-studies/types";
import type { ReactNode } from "react";

interface Props {
  layout: ScreenshotLayout;
  /** Pre-rendered children — one per slot. Pass either a real <img>
   * stack for the public view or upload placeholders for the editor. */
  children: ReactNode[];
}

/* Renders the children in a grid that matches the chosen layout. Each
 * child is a slot — slot 0, slot 1, slot 2 — whose grid placement is
 * determined here. The renderer doesn't know or care what the slots
 * contain, just where they sit. */
export function ScreenshotGrid({ layout, children }: Props) {
  const expected = slotsForLayout(layout);
  const slots = children.slice(0, expected);

  switch (layout) {
    case "single":
      return (
        <div className="grid grid-cols-1 gap-3">
          <div className="aspect-[16/9]">{slots[0]}</div>
        </div>
      );

    case "two":
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="aspect-[4/3]">{slots[0]}</div>
          <div className="aspect-[4/3]">{slots[1]}</div>
        </div>
      );

    case "three":
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="aspect-[4/3]">{slots[0]}</div>
          <div className="aspect-[4/3]">{slots[1]}</div>
          <div className="aspect-[4/3]">{slots[2]}</div>
        </div>
      );

    case "wide-stack":
      // [ A A | B ]
      // [ A A | C ]
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-3 md:aspect-[3/2]">
          <div className="md:col-span-2 md:row-span-2 aspect-[16/9] md:aspect-auto">
            {slots[0]}
          </div>
          <div className="md:col-start-3 md:row-start-1">{slots[1]}</div>
          <div className="md:col-start-3 md:row-start-2">{slots[2]}</div>
        </div>
      );

    case "stack-wide":
      // [ A | B B ]
      // [ C | B B ]   (B = the wide right; A & C stacked left)
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-3 md:aspect-[3/2]">
          <div className="md:col-start-1 md:row-start-1">{slots[0]}</div>
          <div className="md:col-start-1 md:row-start-2">{slots[1]}</div>
          <div className="md:col-start-2 md:col-span-2 md:row-start-1 md:row-span-2 aspect-[16/9] md:aspect-auto">
            {slots[2]}
          </div>
        </div>
      );
  }
}
