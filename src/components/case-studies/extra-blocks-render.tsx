/* ── Extra blocks public renderer ──
 * Renders any ExtraBlock entries anchored to a given spine section.
 * Sorts by `order` then renders each block in its type-specific layout.
 * Returns null if no blocks for this anchor — no markup, no padding.
 *
 * Used in src/app/(public)/case-studies/[slug]/page.tsx, called once
 * after each named spine section: <ExtraBlocks anchor="solution" ... />.
 */

import type {
  ExtraBlock,
  ExtraBlockAnchor,
  ScreenshotCollageBlock,
  ProseBlock,
} from "@/lib/case-studies/types";
import { slotsForLayout } from "@/lib/case-studies/types";
import { ScreenshotGrid } from "@/components/case-studies/screenshot-grid";

interface Props {
  anchor: ExtraBlockAnchor;
  blocks: ExtraBlock[] | undefined;
}

export function ExtraBlocks({ anchor, blocks }: Props) {
  const matched = (blocks ?? [])
    .filter((b) => b.anchor === anchor)
    .sort((a, b) => a.order - b.order);
  if (matched.length === 0) return null;
  return (
    <>
      {matched.map((block) => {
        if (block.type === "screenshot-collage") {
          return <ScreenshotCollageBlockRender key={block.id} block={block} />;
        }
        if (block.type === "prose") {
          return <ProseBlockRender key={block.id} block={block} />;
        }
        return null;
      })}
    </>
  );
}

/* Same renderer as the main screenshot row — adapts to image natural
 * aspect for single/two/three; rigid layouts crop. Optional headline
 * above the collage. */
function ScreenshotCollageBlockRender({ block }: { block: ScreenshotCollageBlock }) {
  const layout = block.layout || "three";
  const isRigidLayout = layout === "wide-stack" || layout === "stack-wide";
  return (
    <section className="px-6 md:px-10 pb-20">
      <div className="max-w-[1200px] mx-auto">
        {block.headline && (
          <h3 className="text-xl md:text-2xl font-semibold text-foreground mb-6">
            {block.headline}
          </h3>
        )}
        <ScreenshotGrid
          layout={layout}
          children={Array.from({ length: slotsForLayout(layout) }).map((_, i) => {
            const img = block.screenshots[i];
            if (img) {
              const useNaturalAspect = !isRigidLayout && img.width && img.height;
              return (
                <div
                  key={img.filename || i}
                  className={`w-full ${isRigidLayout ? "h-full" : ""} rounded-lg overflow-hidden border border-border bg-surface`}
                  style={
                    useNaturalAspect
                      ? { aspectRatio: `${img.width} / ${img.height}` }
                      : !isRigidLayout
                        ? { aspectRatio: "4 / 3" }
                        : undefined
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.alt || ""}
                    className="w-full h-full object-cover"
                  />
                </div>
              );
            }
            return (
              <div
                key={`placeholder-${i}`}
                className={`w-full ${isRigidLayout ? "h-full" : ""} rounded-lg border border-border bg-surface-raised/40`}
                style={!isRigidLayout ? { aspectRatio: "4 / 3" } : undefined}
              />
            );
          })}
        />
      </div>
    </section>
  );
}

/* Optional headline + body paragraph. Same horizontal padding + max
 * width as the spine prose blocks (Problem / Approach intro), so it
 * reads as part of the same column. */
function ProseBlockRender({ block }: { block: ProseBlock }) {
  return (
    <section className="px-6 md:px-10 pb-16">
      <div className="max-w-[820px] mx-auto">
        {block.headline && (
          <h3 className="text-xl md:text-2xl font-semibold text-foreground mb-4">
            {block.headline}
          </h3>
        )}
        <p className="text-base md:text-lg text-[#3A3A3D] leading-relaxed whitespace-pre-line">
          {block.body}
        </p>
      </div>
    </section>
  );
}
