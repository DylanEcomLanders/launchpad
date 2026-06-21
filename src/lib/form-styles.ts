// Shared form element classes used across all tool pages.
// Import these instead of redefining in each page.

export const inputClass =
  "w-full px-3 py-2.5 bg-[#181818] border border-[#2A2A2A] rounded-lg text-sm focus:outline-none focus:border-[#E5E5EA] focus:ring-1 focus:ring-[#E5E5EA]/10 transition-all shadow-[var(--shadow-soft)] placeholder:text-[#71757D]";

export const selectClass =
  "w-full px-3 py-2.5 bg-[#181818] border border-[#2A2A2A] rounded-lg text-sm focus:outline-none focus:border-[#E5E5EA] focus:ring-1 focus:ring-[#E5E5EA]/10 transition-all shadow-[var(--shadow-soft)] appearance-none";

export const textareaClass =
  "w-full px-3 py-2.5 bg-[#181818] border border-[#2A2A2A] rounded-lg text-sm focus:outline-none focus:border-[#E5E5EA] focus:ring-1 focus:ring-[#E5E5EA]/10 transition-all shadow-[var(--shadow-soft)] resize-none placeholder:text-[#71757D]";

export const labelClass =
  "block text-xs font-semibold uppercase tracking-wider text-[#71757D] mb-2";
