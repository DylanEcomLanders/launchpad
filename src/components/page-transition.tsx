"use client";

/* No page-transition animation: route/tab switches are instant (Linear-snappy).
 * Previously this replayed `animate-fadeInUp` (fade + upward translate) on every
 * pathname change, which read as a little "jump" between tabs. Kept as a thin
 * pass-through so the layout import stays stable. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
