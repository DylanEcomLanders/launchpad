// Quiz progress indicator — tiny sentinels above the question.
// Visual language matches the audit page's understated chrome (no flashy
// gradients, no big percentages — just a hairline filled bar).

export function QuizProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.max(0, Math.min(100, Math.round((current / total) * 100)));
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-[#999]">
          Step {current} of {total}
        </span>
        <span className="text-[11px] font-medium text-[#999] tabular-nums">{pct}%</span>
      </div>
      <div className="h-1 w-full bg-[#F0F0F0] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#1B1B1B] rounded-full transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
