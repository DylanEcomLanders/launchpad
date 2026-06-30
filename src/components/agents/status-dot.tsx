import { AGENT_STATUS_META, type AgentStatus } from "@/lib/agents/types";

interface StatusDotProps {
  status: AgentStatus;
  size?: number;
  withRing?: boolean;
}

export function StatusDot({ status, size = 8, withRing = true }: StatusDotProps) {
  const meta = AGENT_STATUS_META[status];
  return (
    <span
      aria-label={meta.label}
      title={meta.label}
      className="inline-block shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: meta.dot,
        boxShadow: withRing ? `0 0 0 ${Math.max(2, Math.round(size / 4))}px ${meta.ring}` : undefined,
      }}
    />
  );
}

export function StatusBadge({ status }: { status: AgentStatus }) {
  const meta = AGENT_STATUS_META[status];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground shadow-[var(--shadow-soft)]">
      <StatusDot status={status} size={6} withRing={false} />
      {meta.label}
    </span>
  );
}
