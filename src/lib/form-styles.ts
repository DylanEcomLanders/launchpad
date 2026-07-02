// Shared form element classes used across all tool pages.
// Import these instead of redefining in each page.

export const inputClass =
  "w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground/10 transition-all shadow-[var(--shadow-soft)] placeholder:text-subtle";

export const selectClass =
  "w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground/10 transition-all shadow-[var(--shadow-soft)] appearance-none";

export const textareaClass =
  "w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground/10 transition-all shadow-[var(--shadow-soft)] resize-none placeholder:text-subtle";

export const labelClass =
  "block text-xs font-semibold uppercase tracking-wider text-subtle mb-2";
