"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// Keep the fade-in but drop the `transform` after the animation finishes.
// A persistent transform on this wrapper creates a containing block that
// breaks `position: sticky` for any descendant (e.g. portal sidebars).
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [animating, setAnimating] = useState(true);

  /* The wiki has its own persistent shell (rail + search). Re-keying on
   * every path change would unmount that shell on every navigation, which
   * makes nav feel like a full page reload. Pass through cleanly inside
   * /wiki-v2 so only the page content swaps. */
  const isWiki = pathname.startsWith("/wiki-v2");

  useEffect(() => {
    if (isWiki) return;
    setAnimating(true);
    const t = setTimeout(() => setAnimating(false), 800);
    return () => clearTimeout(t);
  }, [pathname, isWiki]);

  if (isWiki) {
    return <>{children}</>;
  }

  return (
    <div key={pathname} className={animating ? "animate-fadeInUp" : ""}>
      {children}
    </div>
  );
}
