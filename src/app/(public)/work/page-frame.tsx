import type { PortfolioProject, PortfolioSlice } from "@/lib/portfolio-v2/types";

export function coverSlice(project: PortfolioProject | null): PortfolioSlice | null {
  if (!project) return null;
  return project.desktop_slices[0] ?? project.mobile_slices[0] ?? null;
}

export function PageFrame({
  project,
  slice,
  label,
  aspect = "3 / 4",
  eager = false,
  focused = false,
  live = true,
  className = "",
}: {
  project?: PortfolioProject | null;
  slice?: PortfolioSlice | null;
  label?: string;
  aspect?: string;
  eager?: boolean;
  focused?: boolean;
  live?: boolean;
  className?: string;
}) {
  const frame = slice ?? coverSlice(project ?? null);
  const caption = label ?? project?.name ?? "Page";

  return (
    <div
      className={`work-frame ${live ? "is-live" : ""} ${focused ? "is-focused" : ""} ${className}`}
    >
      <div className="work-frame-chrome">
        <span className="work-frame-dots" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <span className="work-frame-url">{caption}</span>
      </div>
      <div
        className="work-slice"
        style={{
          aspectRatio: aspect,
          backgroundImage: frame?.blur ? `url(${frame.blur})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "top center",
        }}
      >
        {frame ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={frame.url}
            alt=""
            loading={eager ? "eager" : "lazy"}
            decoding="async"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8">
            <p
              className="text-[10px] uppercase tracking-[0.22em] text-[var(--work-dim)] mb-3"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {caption}
            </p>
            <p
              className="text-2xl md:text-3xl font-semibold tracking-tight leading-[1.05]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              The page is the piece.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
