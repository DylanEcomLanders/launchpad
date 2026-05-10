export function PerformanceTab() {
  return (
    <div className="rounded-xl border border-dashed border-[#E5E5EA] bg-white/40 p-12 text-center">
      <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-[#F3F3F5]">
        <svg viewBox="0 0 16 16" className="size-5 text-[#7A7A7A]" fill="currentColor" aria-hidden>
          <rect x="2" y="9" width="2" height="5" />
          <rect x="6" y="6" width="2" height="8" />
          <rect x="10" y="3" width="2" height="11" />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-[#1B1B1B]">Performance — coming soon</h3>
      <p className="mt-1 text-xs text-[#7A7A7A] max-w-sm mx-auto">
        Token usage, success rate, average response time, and cost will land here once we wire real Anthropic calls in v1.
      </p>
    </div>
  );
}
