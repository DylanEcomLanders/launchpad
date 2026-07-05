/* ── Dither tool icons ──
 * A richer companion to the 16px pixel nav set: 24x24 glyphs whose bodies are
 * filled with a 1-bit ordered-dither (2px checkerboard), with solid detail
 * marks on top for the classic two-tone Mac look. Monochrome, currentColor,
 * crisp-edged. Used on the Overview quick-tool tiles for warmth + craft.
 */

type P = { className?: string };

/* body = dithered silhouette · detail = solid marks on top. A single shared
 * pattern id is fine: every instance defines an identical one, so any url()
 * reference resolves to the same checkerboard. */
function Dither({ className, body, detail }: P & { body: string; detail?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <defs>
        <pattern id="ditherFill" width="2" height="2" patternUnits="userSpaceOnUse">
          <rect width="1" height="1" fill="currentColor" />
          <rect x="1" y="1" width="1" height="1" fill="currentColor" />
        </pattern>
      </defs>
      <path d={body} fill="url(#ditherFill)" />
      {detail && <path d={detail} fill="currentColor" />}
    </svg>
  );
}

// Payment link → card with a solid magnetic stripe + number line.
export const DitherCard = ({ className }: P) => (
  <Dither className={className} body="M2 6h20v12H2z" detail="M2 9h20v3H2zM5 15h8v1H5z" />
);

// Price list → document with a folded corner + solid rule lines.
export const DitherDoc = ({ className }: P) => (
  <Dither
    className={className}
    body="M4 2h11l5 5v15H4z"
    detail="M7 10h10v1H7zM7 13h10v1H7zM7 16h7v1H7z"
  />
);

// Feedback form → speech bubble with tail + solid lines.
export const DitherChat = ({ className }: P) => (
  <Dither
    className={className}
    body="M3 4h18v11H3zM7 15h5v5z"
    detail="M6 8h12v1H6zM6 11h8v1H6z"
  />
);

// Onboarding form → clipboard with clip + solid rule lines.
export const DitherClipboard = ({ className }: P) => (
  <Dither
    className={className}
    body="M5 4h14v18H5z"
    detail="M9 2h6v3H9zM8 10h8v1H8zM8 13h8v1H8zM8 16h6v1H8z"
  />
);

// Invoice → receipt with a torn zigzag foot + solid lines.
export const DitherReceipt = ({ className }: P) => (
  <Dither
    className={className}
    body="M5 2h14v18l-2-2-2 2-2-2-2 2-2-2-2 2-2-2z"
    detail="M8 6h8v1H8zM8 9h8v1H8zM8 12h5v1H8z"
  />
);

// Portfolio → briefcase with handle + solid clasp.
export const DitherBriefcase = ({ className }: P) => (
  <Dither
    className={className}
    body="M3 7h18v13H3z"
    detail="M9 3h6v4h-2V5h-2v2H9zM3 12h18v1H3zM10 11h4v3h-4z"
  />
);
