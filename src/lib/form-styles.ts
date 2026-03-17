// Shared form element classes used across all tool pages.
// Import these instead of redefining in each page.

export const inputClass =
  "w-full px-3 py-2.5 bg-white border border-[#E5E5EA] rounded-lg text-sm focus:outline-none focus:border-[#1B1B1B] focus:ring-1 focus:ring-[#1B1B1B]/10 transition-all shadow-[var(--shadow-soft)] placeholder:text-[#C5C5C5]";

export const selectClass =
  "w-full px-3 py-2.5 bg-white border border-[#E5E5EA] rounded-lg text-sm focus:outline-none focus:border-[#1B1B1B] focus:ring-1 focus:ring-[#1B1B1B]/10 transition-all shadow-[var(--shadow-soft)] appearance-none";

export const textareaClass =
  "w-full px-3 py-2.5 bg-white border border-[#E5E5EA] rounded-lg text-sm focus:outline-none focus:border-[#1B1B1B] focus:ring-1 focus:ring-[#1B1B1B]/10 transition-all shadow-[var(--shadow-soft)] resize-none placeholder:text-[#C5C5C5]";

export const labelClass =
  "block text-xs font-semibold uppercase tracking-wider text-[#7A7A7A] mb-2";
