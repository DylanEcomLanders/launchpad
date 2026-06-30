/* ───────────────────────────────────────────────────────────────────────────
   theme.tsx — drop into src/components/theme.tsx
   Two exports:
     <ThemeScript/>  → render inside <head> in app/layout.tsx (before paint,
                       prevents a flash of the wrong theme on first load).
     <ThemeToggle/>  → the switch itself, put it in the sidebar/topbar.

   Default theme = "dark" (matches the app today). To ship light as the
   default, change the two `"dark"` fallbacks below to `"light"`.

   Persistence: localStorage for instant, no-flicker UX. To also persist
   per-user in Supabase, add a `theme text` column to your profiles row and
   call your existing update action inside `setTheme` (marked TODO).
   ─────────────────────────────────────────────────────────────────────────── */
"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

// Inline script — runs before React hydrates, so there's no flash.
export function ThemeScript() {
  const js = `
    try {
      var t = localStorage.getItem("theme") || "dark";
      document.documentElement.setAttribute("data-theme", t);
    } catch (e) {
      document.documentElement.setAttribute("data-theme", "dark");
    }
  `;
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}

export function ThemeToggle() {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const t = (localStorage.getItem("theme") as Theme) || "dark";
    setThemeState(t);
  }, []);

  function setTheme(next: Theme) {
    setThemeState(next);
    localStorage.setItem("theme", next);
    document.documentElement.setAttribute("data-theme", next);
    // TODO(persist): await updateMyProfile({ theme: next })  // Supabase
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
      className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-2xs font-medium text-muted transition-colors hover:bg-surface-raised hover:text-foreground"
    >
      <span className="font-mono">{theme === "dark" ? "◐" : "◑"}</span>
      {theme === "dark" ? "Dark" : "Light"}
    </button>
  );
}
