/* ── Pixel nav icons ──
 * A single, consistent pixel-icon set for the sidebar: 16x16 grid, monochrome,
 * crisp-edged, currentColor (inherits nav text colour). A premium 8-bit take,
 * disciplined and uniform rather than tacky-retro. One shared <Svg> so every
 * glyph shares the exact same grid + rendering.
 */

type P = { className?: string };

function Svg({ className, d }: P & { d: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="currentColor" shapeRendering="crispEdges" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export const PixelGrid = ({ className }: P) => <Svg className={className} d="M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H2zM9 9h5v5H9z" />;
export const PixelChart = ({ className }: P) => <Svg className={className} d="M2 10h3v4H2zM7 6h3v8H7zM12 2h3v12h-3z" />;
export const PixelBoard = ({ className }: P) => <Svg className={className} d="M2 2h3v3H2zM2 6h3v3H2zM6 2h3v3H6zM10 2h3v3h-3zM10 6h3v3h-3zM10 10h3v3h-3z" />;
export const PixelHome = ({ className }: P) => <Svg className={className} d="M7 2h2v2H7zM5 4h6v2H5zM3 6h10v2H3zM4 8h8v2H4zM4 10h3v4H4zM9 10h3v4H9z" />;
export const PixelInbox = ({ className }: P) => <Svg className={className} d="M4 3h2v6H4zM10 3h2v6h-2zM7 3h2v4H7zM2 9h12v4H2z" />;
export const PixelChat = ({ className }: P) => <Svg className={className} d="M3 3h10v1H3zM2 4h12v5H2zM3 9h10v1H3zM5 10h2v2H5z" />;
export const PixelCalendar = ({ className }: P) => <Svg className={className} d="M4 2h2v2H4zM10 2h2v2h-2zM2 4h12v3H2zM2 8h12v6H2z" />;
export const PixelSparkle = ({ className }: P) => <Svg className={className} d="M7 2h2v3H7zM7 11h2v3H7zM2 7h3v2H2zM11 7h3v2h-3zM6 6h4v4H6z" />;
export const PixelBook = ({ className }: P) => <Svg className={className} d="M2 4h5v9H2zM9 4h5v9H9zM7 5h2v7H7z" />;
export const PixelBulb = ({ className }: P) => <Svg className={className} d="M6 2h4v1H6zM5 3h6v4H5zM6 7h4v2H6zM6 10h4v1H6z" />;
export const PixelLock = ({ className }: P) => <Svg className={className} d="M5 2h6v1H5zM4 3h2v3H4zM10 3h2v3h-2zM3 6h10v7H3z" />;
export const PixelBuilding = ({ className }: P) => <Svg className={className} d="M2 7h4v7H2zM7 3h4v11H7zM12 6h2v8h-2z" />;
export const PixelRocket = ({ className }: P) => <Svg className={className} d="M7 1h2v2H7zM6 3h4v7H6zM4 8h2v2H4zM10 8h2v2h-2zM7 11h2v2H7z" />;
export const PixelCap = ({ className }: P) => <Svg className={className} d="M2 5h12v2H2zM5 7h6v2H5zM12 6h1v4h-1z" />;
export const PixelBookmark = ({ className }: P) => <Svg className={className} d="M4 2h8v8H4zM4 10h2v3H4zM10 10h2v3h-2zM6 10h4v1H6z" />;
export const PixelDoc = ({ className }: P) => <Svg className={className} d="M3 2h9v1H3zM3 2h1v11H3zM11 2h1v11h-1zM3 13h9v1H3zM5 5h5v1H5zM5 7h5v1H5zM5 9h5v1H5z" />;
export const PixelDocPlus = ({ className }: P) => <Svg className={className} d="M3 2h9v1H3zM3 2h1v11H3zM11 2h1v11h-1zM3 13h9v1H3zM7 5h1v5H7zM5 7h5v1H5z" />;
export const PixelCard = ({ className }: P) => <Svg className={className} d="M2 4h12v1H2zM2 4h1v8H2zM13 4h1v8h-1zM2 11h12v1H2zM3 6h10v2H3z" />;
export const PixelBolt = ({ className }: P) => <Svg className={className} d="M9 2h3v4H9zM6 6h5v2H6zM4 8h4v6H4z" />;
export const PixelPuzzle = ({ className }: P) => <Svg className={className} d="M3 4h10v9H3zM6 2h4v2H6zM13 6h2v3h-2z" />;
export const PixelShare = ({ className }: P) => <Svg className={className} d="M11 2h3v3h-3zM11 11h3v3h-3zM2 6h3v3H2zM5 7h7v1H5zM12 5h1v7h-1z" />;
export const PixelBriefcase = ({ className }: P) => <Svg className={className} d="M6 2h4v2H6zM2 4h12v9H2z" />;
export const PixelUsers = ({ className }: P) => <Svg className={className} d="M3 3h3v3H3zM2 7h5v6H2zM10 3h3v3h-3zM9 7h5v6h-5z" />;
export const PixelWrench = ({ className }: P) => <Svg className={className} d="M9 2h3v3H9zM7 4h3v3H7zM5 7h3v3H5zM2 10h4v4H2z" />;

// ── Refined, better-suited glyphs (round 2) ──
export const PixelFunnel = ({ className }: P) => <Svg className={className} d="M2 3h12v2H2zM4 5h8v2H4zM6 7h4v2H6zM7 9h2v4H7z" />;
export const PixelTag = ({ className }: P) => <Svg className={className} d="M6 4h7v8H6zM5 5h1v6H5zM4 6h1v4H4zM3 7h1v2H3z" />;
export const PixelApps = ({ className }: P) => <Svg className={className} d="M2 2h3v3H2zM7 2h3v3H7zM12 2h3v3h-3zM2 7h3v3H2zM7 7h3v3H7zM12 7h3v3h-3zM2 12h3v3H2zM7 12h3v3H7zM12 12h3v3h-3z" />;
export const PixelChecklist = ({ className }: P) => <Svg className={className} d="M2 3h3v3H2zM7 4h7v1H7zM2 7h3v3H2zM7 8h7v1H7zM2 11h3v3H2zM7 12h7v1H7z" />;
export const PixelCoins = ({ className }: P) => <Svg className={className} d="M4 2h8v1H4zM3 3h10v1H3zM4 4h8v1H4zM4 6h8v1H4zM3 7h10v1H3zM4 8h8v1H4zM4 10h8v1H4zM3 11h10v1H3zM4 12h8v1H4z" />;
export const PixelPulse = ({ className }: P) => <Svg className={className} d="M2 8h3v1H2zM5 6h1v3H5zM6 3h1v6H6zM7 6h1v3H7zM8 8h6v1H8z" />;
export const PixelHeart = ({ className }: P) => <Svg className={className} d="M4 3h3v2H4zM9 3h3v2H9zM3 5h10v2H3zM4 7h8v2H4zM5 9h6v1H5zM6 10h4v1H6zM7 11h2v1H7z" />;
export const PixelUserPlus = ({ className }: P) => <Svg className={className} d="M4 3h3v3H4zM3 7h5v6H3zM11 3h1v5h-1zM9 5h5v1H9z" />;
export const PixelSend = ({ className }: P) => <Svg className={className} d="M3 11h2v2H3zM5 9h2v2H5zM7 7h2v2H7zM9 5h2v2H9zM9 4h5v1H9zM13 4h1v6h-1z" />;
export const PixelType = ({ className }: P) => <Svg className={className} d="M7 2h2v1H7zM6 3h4v1H6zM5 4h1v9H5zM10 4h1v9h-1zM6 8h4v1H6z" />;
export const PixelReceipt = ({ className }: P) => <Svg className={className} d="M3 2h9v1H3zM3 2h1v10H3zM11 2h1v10h-1zM5 4h5v1H5zM5 6h5v1H5zM5 8h5v1H5zM3 12h2v1H3zM7 12h2v1H7zM11 12h1v1h-1zM5 11h2v1H5zM9 11h2v1H9z" />;
