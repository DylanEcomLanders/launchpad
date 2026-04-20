"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// Keep the fade-in but drop the `transform` after the animation finishes.
// A persistent transform on this wrapper creates a containing block that
// breaks `position: sticky` for any descendant (e.g. portal sidebars).
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [animating, setAnimating] = useState(true);

  useEffect(() => {
    setAnimating(true);
    const t = setTimeout(() => setAnimating(false), 800);
    return () => clearTimeout(t);
  }, [pathname]);

  return (
    <div key={pathname} className={animating ? "animate-fadeInUp" : ""}>
      {children}
    </div>
  );
}
