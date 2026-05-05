/* ── Dynamic OG image for case study pages ──
 * 1200×630 light editorial card with brand-coloured eyebrow + headline.
 */

import { ImageResponse } from "next/og";
import { getCaseStudy } from "@/lib/case-studies/data";

export const runtime = "nodejs";
export const alt = "Ecom Landers case study";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage({ params }: { params: { slug: string } }) {
  const study = await getCaseStudy(params.slug);

  const headline = study?.hero.headline || "Ecom Landers case study";
  const subhead = study?.hero.subhead || study?.meta.brandName || "Conversion lift, made measurable.";
  const accent = study?.settings.brandColor || "#E04A2F";
  const brandName = study?.meta.brandName || "Ecom Landers";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: "#F7F8FA",
          color: "#1B1B1B",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div
            style={{
              fontSize: 16,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: accent,
              fontWeight: 700,
            }}
          >
            Case Study · {brandName}
          </div>
          <div
            style={{
              fontSize: 16,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#7A7A7A",
              fontWeight: 600,
            }}
          >
            ecomlanders
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 76,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              maxWidth: 1000,
              marginBottom: 24,
              color: "#1B1B1B",
            }}
          >
            {headline}
          </div>
          <div
            style={{
              fontSize: 24,
              color: "#5C5C5C",
              lineHeight: 1.35,
              maxWidth: 900,
            }}
          >
            {subhead}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 9999,
              background: accent,
            }}
          />
          <div
            style={{
              fontSize: 16,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#7A7A7A",
              fontWeight: 600,
            }}
          >
            ecomlanders.com
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
