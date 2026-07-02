// Multi-choice option button with audit-page styling.
// Selected state uses the lime accent for the marker, dark border + bg-tint
// to feel decisive without shouting. Hover stays subtle.

interface OptionCardProps {
  label: string;
  selected?: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function OptionCard({ label, selected, onClick, disabled }: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group w-full flex items-center gap-3 px-4 py-3.5 rounded-lg border text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        selected
          ? "border-white bg-background"
          : "border-foreground bg-surface hover:border-white"
      }`}
    >
      <span
        className={`shrink-0 size-5 rounded-full border-2 flex items-center justify-center transition-colors ${
          selected ? "border-white bg-[#D1FF4C]" : "border-foreground group-hover:border-subtle"
        }`}
      >
        {selected && (
          <svg className="size-3 text-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        )}
      </span>
      <span className="text-sm font-medium text-foreground">{label}</span>
    </button>
  );
}
