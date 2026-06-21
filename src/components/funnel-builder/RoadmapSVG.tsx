"use client";

import {
  trafficSourceConfigs,
  pageNodeConfigs,
  leadMagnetConfig,
  emailSequenceConfig,
  stageColors,
} from "@/lib/funnel-builder/constants";
import {
  ROADMAP_STATUS_COLORS,
  ROADMAP_STATUS_LABELS,
  type RoadmapData,
  type RoadmapStep,
  type TrafficStep,
  type PageStep,
  type LeadMagnetStep,
  type EmailSequenceStep,
} from "@/lib/funnel-builder/roadmap-types";

/* ── Layout constants ────────────────────────────────────────────── */
const TRAFFIC_W = 110;
const TRAFFIC_H = 56;
const TRAFFIC_GAP = 10;
const PAGE_W = 160;
const PAGE_H = 92;
const PAGE_GAP = 28;
const LEAD_GAP = 60; // vertical gap between main row and lead-gen track
const PADDING = 24;

interface Props {
  roadmap: RoadmapData;
  /** Optional callback when a step is clicked. Editor uses this; the
   * client view passes nothing → cards become non-interactive. */
  onStepClick?: (step: RoadmapStep) => void;
  /** Used as the wrapper id so PNG export can target it. */
  exportId?: string;
}

/* SVG renderer used by both the editor preview and the public client
 * share view. Layout is computed deterministically from step counts —
 * no positions persisted. */
export function RoadmapSVG({ roadmap, onStepClick, exportId }: Props) {
  const { trafficSources: traffic, pages, leadGen } = roadmap;
  const trafficCount = traffic.length;
  const pageCount = pages.length;

  // Empty state
  if (trafficCount === 0 && pageCount === 0) {
    return (
      <div className="flex items-center justify-center py-20 px-6 border border-dashed border-[#2A2A2A] rounded-xl bg-[#0C0C0C]">
        <p className="text-[12px] text-[#71757D]">
          Pick a traffic source and a page to start the roadmap.
        </p>
      </div>
    );
  }

  const trafficColumnHeight = Math.max(
    1,
    trafficCount * TRAFFIC_H + (trafficCount - 1) * TRAFFIC_GAP,
  );
  const mainRowHeight = Math.max(trafficColumnHeight, PAGE_H);
  const mainRowCenter = mainRowHeight / 2;

  const trafficStartY = (mainRowHeight - trafficColumnHeight) / 2;

  // X positions
  const trafficX = 0;
  const firstPageX = trafficCount > 0 ? TRAFFIC_W + 70 : 0;
  const pageX = (i: number) => firstPageX + i * (PAGE_W + PAGE_GAP);
  const totalWidth =
    pageCount > 0
      ? pageX(pageCount - 1) + PAGE_W
      : trafficCount > 0
      ? TRAFFIC_W
      : 0;

  // Lead gen track
  const leadTrackY = mainRowHeight + LEAD_GAP;
  const leadTrackHeight = leadGen ? PAGE_H : 0;

  const totalHeight = mainRowHeight + (leadGen ? LEAD_GAP + leadTrackHeight : 0);

  const viewBox = `0 0 ${totalWidth + PADDING * 2} ${totalHeight + PADDING * 2}`;

  return (
    <div className="w-full overflow-x-auto" id={exportId}>
      <svg
        viewBox={viewBox}
        width={totalWidth + PADDING * 2}
        height={totalHeight + PADDING * 2}
        className="block max-w-full h-auto"
        style={{ minWidth: Math.min(totalWidth + PADDING * 2, 720) }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L6,3 z" fill="#C5C5C5" />
          </marker>
        </defs>

        <g transform={`translate(${PADDING}, ${PADDING})`}>
          {/* Traffic → first page connectors (fan-in) */}
          {trafficCount > 0 && pageCount > 0 &&
            traffic.map((_, i) => {
              const sourceY = trafficStartY + i * (TRAFFIC_H + TRAFFIC_GAP) + TRAFFIC_H / 2;
              const targetY = mainRowCenter;
              const sourceX = trafficX + TRAFFIC_W;
              const targetX = firstPageX;
              const midX = sourceX + (targetX - sourceX) / 2;
              const path = `M ${sourceX} ${sourceY} C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}`;
              return (
                <path
                  key={`tc-${i}`}
                  d={path}
                  stroke="#C5C5C5"
                  strokeWidth="1.5"
                  fill="none"
                  markerEnd="url(#arrowhead)"
                />
              );
            })}

          {/* Page → page connectors */}
          {pages.slice(0, -1).map((_, i) => {
            const x1 = pageX(i) + PAGE_W;
            const x2 = pageX(i + 1);
            const y = mainRowCenter;
            return (
              <line
                key={`pc-${i}`}
                x1={x1}
                y1={y}
                x2={x2}
                y2={y}
                stroke="#C5C5C5"
                strokeWidth="1.5"
                markerEnd="url(#arrowhead)"
              />
            );
          })}

          {/* Lead-gen track connector (bottom track → re-entry) */}
          {leadGen && pageCount > 0 && (
            <path
              d={`M ${pageX(0) + PAGE_W / 2} ${mainRowCenter + PAGE_H / 2}
                  C ${pageX(0) + PAGE_W / 2} ${leadTrackY - 10},
                    ${PADDING + PAGE_W / 2} ${leadTrackY},
                    ${PADDING + PAGE_W / 2} ${leadTrackY + PAGE_H / 2}`}
              stroke="#C5C5C5"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              fill="none"
            />
          )}

          {/* Traffic source nodes */}
          {traffic.map((step, i) => {
            const y = trafficStartY + i * (TRAFFIC_H + TRAFFIC_GAP);
            return (
              <TrafficNodeSVG
                key={step.id}
                step={step}
                x={trafficX}
                y={y}
                interactive={!!onStepClick}
                onClick={() => onStepClick?.(step)}
              />
            );
          })}

          {/* Page nodes */}
          {pages.map((step, i) => (
            <PageNodeSVG
              key={step.id}
              step={step}
              x={pageX(i)}
              y={mainRowCenter - PAGE_H / 2}
              interactive={!!onStepClick}
              onClick={() => onStepClick?.(step)}
            />
          ))}

          {/* Lead-gen track */}
          {leadGen && (
            <g transform={`translate(0, ${leadTrackY})`}>
              <LeadMagnetNodeSVG
                step={leadGen.magnet}
                x={0}
                y={0}
                interactive={!!onStepClick}
                onClick={() => onStepClick?.(leadGen.magnet)}
              />
              <line
                x1={PAGE_W}
                y1={PAGE_H / 2}
                x2={PAGE_W + PAGE_GAP}
                y2={PAGE_H / 2}
                stroke="#C5C5C5"
                strokeWidth="1.5"
                markerEnd="url(#arrowhead)"
              />
              <EmailSequenceNodeSVG
                step={leadGen.sequence}
                x={PAGE_W + PAGE_GAP}
                y={0}
                interactive={!!onStepClick}
                onClick={() => onStepClick?.(leadGen.sequence)}
              />
            </g>
          )}
        </g>
      </svg>
    </div>
  );
}

/* ── Node renderers ──────────────────────────────────────────────── */

interface TrafficProps {
  step: TrafficStep;
  x: number;
  y: number;
  interactive: boolean;
  onClick: () => void;
}

function TrafficNodeSVG({ step, x, y, interactive, onClick }: TrafficProps) {
  const cfg = trafficSourceConfigs[step.source];
  const status = ROADMAP_STATUS_COLORS[step.status];
  const label = step.customLabel || cfg.label;
  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={interactive ? onClick : undefined}
      style={{ cursor: interactive ? "pointer" : "default" }}
    >
      <rect
        width={TRAFFIC_W}
        height={TRAFFIC_H}
        rx="8"
        fill="#FFFFFF"
        stroke={status.ring}
        strokeWidth="1"
      />
      <rect
        x={6}
        y={6}
        width={42}
        height={16}
        rx="3"
        fill={cfg.color}
      />
      <text
        x={27}
        y={17}
        textAnchor="middle"
        fontSize="9"
        fontWeight="700"
        fill={cfg.textColor}
        fontFamily="Inter, system-ui, sans-serif"
      >
        {cfg.short}
      </text>
      <text
        x={6}
        y={36}
        fontSize="11"
        fontWeight="600"
        fill="#1B1B1B"
        fontFamily="Inter, system-ui, sans-serif"
      >
        {label.length > 14 ? `${label.slice(0, 14)}…` : label}
      </text>
      <circle cx={11} cy={47} r="2.5" fill={status.dot} />
      <text
        x={18}
        y={50}
        fontSize="9"
        fill={status.text}
        fontFamily="Inter, system-ui, sans-serif"
      >
        {ROADMAP_STATUS_LABELS[step.status]}
      </text>
    </g>
  );
}

interface PageProps {
  step: PageStep;
  x: number;
  y: number;
  interactive: boolean;
  onClick: () => void;
}

function PageNodeSVG({ step, x, y, interactive, onClick }: PageProps) {
  const cfg = pageNodeConfigs[step.pageType];
  const status = ROADMAP_STATUS_COLORS[step.status];
  const label = step.customLabel || cfg.label;
  const stage = step.stage ? stageColors[step.stage] : null;

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={interactive ? onClick : undefined}
      style={{ cursor: interactive ? "pointer" : "default" }}
    >
      <rect
        width={PAGE_W}
        height={PAGE_H}
        rx="10"
        fill="#FFFFFF"
        stroke={status.ring}
        strokeWidth="1.5"
      />
      <rect
        x={10}
        y={10}
        width={cfg.short.length * 8 + 14}
        height={18}
        rx="3"
        fill={cfg.color}
      />
      <text
        x={10 + (cfg.short.length * 8 + 14) / 2}
        y={22}
        textAnchor="middle"
        fontSize="10"
        fontWeight="700"
        fill={cfg.textColor}
        fontFamily="Inter, system-ui, sans-serif"
      >
        {cfg.short}
      </text>
      {stage && (
        <>
          <rect
            x={PAGE_W - 44}
            y={10}
            width={34}
            height={18}
            rx="3"
            fill={stage.bg}
          />
          <text
            x={PAGE_W - 27}
            y={22}
            textAnchor="middle"
            fontSize="9"
            fontWeight="700"
            fill={stage.text}
            fontFamily="Inter, system-ui, sans-serif"
          >
            {stage.label}
          </text>
        </>
      )}
      <text
        x={10}
        y={50}
        fontSize="13"
        fontWeight="600"
        fill="#1B1B1B"
        fontFamily="Inter, system-ui, sans-serif"
      >
        {label.length > 18 ? `${label.slice(0, 18)}…` : label}
      </text>
      <circle cx={15} cy={75} r="3" fill={status.dot} />
      <text
        x={24}
        y={78}
        fontSize="10"
        fill={status.text}
        fontFamily="Inter, system-ui, sans-serif"
      >
        {ROADMAP_STATUS_LABELS[step.status]}
      </text>
      {step.kpiTarget && (
        <text
          x={PAGE_W - 10}
          y={78}
          textAnchor="end"
          fontSize="9"
          fill="#7A7A7A"
          fontFamily="Inter, system-ui, sans-serif"
        >
          {step.kpiTarget.length > 14 ? `${step.kpiTarget.slice(0, 14)}…` : step.kpiTarget}
        </text>
      )}
    </g>
  );
}

interface LeadMagnetProps {
  step: LeadMagnetStep;
  x: number;
  y: number;
  interactive: boolean;
  onClick: () => void;
}

function LeadMagnetNodeSVG({
  step,
  x,
  y,
  interactive,
  onClick,
}: LeadMagnetProps) {
  const status = ROADMAP_STATUS_COLORS[step.status];
  const label = step.customLabel || leadMagnetConfig.label;
  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={interactive ? onClick : undefined}
      style={{ cursor: interactive ? "pointer" : "default" }}
    >
      <rect
        width={PAGE_W}
        height={PAGE_H}
        rx="10"
        fill="#FFFFFF"
        stroke={status.ring}
        strokeWidth="1.5"
        strokeDasharray="4 3"
      />
      <rect
        x={10}
        y={10}
        width={28}
        height={18}
        rx="3"
        fill={leadMagnetConfig.color}
      />
      <text
        x={24}
        y={22}
        textAnchor="middle"
        fontSize="10"
        fontWeight="700"
        fill={leadMagnetConfig.textColor}
        fontFamily="Inter, system-ui, sans-serif"
      >
        {leadMagnetConfig.short}
      </text>
      <text
        x={10}
        y={50}
        fontSize="13"
        fontWeight="600"
        fill="#1B1B1B"
        fontFamily="Inter, system-ui, sans-serif"
      >
        {label.length > 18 ? `${label.slice(0, 18)}…` : label}
      </text>
      <text
        x={10}
        y={66}
        fontSize="10"
        fill="#7A7A7A"
        fontFamily="Inter, system-ui, sans-serif"
      >
        {step.format.toUpperCase()}
      </text>
      <circle cx={15} cy={82} r="3" fill={status.dot} />
      <text
        x={24}
        y={85}
        fontSize="10"
        fill={status.text}
        fontFamily="Inter, system-ui, sans-serif"
      >
        {ROADMAP_STATUS_LABELS[step.status]}
      </text>
    </g>
  );
}

interface EmailSequenceProps {
  step: EmailSequenceStep;
  x: number;
  y: number;
  interactive: boolean;
  onClick: () => void;
}

function EmailSequenceNodeSVG({
  step,
  x,
  y,
  interactive,
  onClick,
}: EmailSequenceProps) {
  const status = ROADMAP_STATUS_COLORS[step.status];
  const label = step.customLabel || emailSequenceConfig.label;
  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={interactive ? onClick : undefined}
      style={{ cursor: interactive ? "pointer" : "default" }}
    >
      <rect
        width={PAGE_W}
        height={PAGE_H}
        rx="10"
        fill="#FFFFFF"
        stroke={status.ring}
        strokeWidth="1.5"
        strokeDasharray="4 3"
      />
      <rect
        x={10}
        y={10}
        width={32}
        height={18}
        rx="3"
        fill={emailSequenceConfig.color}
      />
      <text
        x={26}
        y={22}
        textAnchor="middle"
        fontSize="10"
        fontWeight="700"
        fill={emailSequenceConfig.textColor}
        fontFamily="Inter, system-ui, sans-serif"
      >
        {emailSequenceConfig.short}
      </text>
      <text
        x={10}
        y={50}
        fontSize="13"
        fontWeight="600"
        fill="#1B1B1B"
        fontFamily="Inter, system-ui, sans-serif"
      >
        {label.length > 18 ? `${label.slice(0, 18)}…` : label}
      </text>
      {step.emailCount && (
        <text
          x={10}
          y={66}
          fontSize="10"
          fill="#7A7A7A"
          fontFamily="Inter, system-ui, sans-serif"
        >
          {step.emailCount} emails
        </text>
      )}
      <circle cx={15} cy={82} r="3" fill={status.dot} />
      <text
        x={24}
        y={85}
        fontSize="10"
        fill={status.text}
        fontFamily="Inter, system-ui, sans-serif"
      >
        {ROADMAP_STATUS_LABELS[step.status]}
      </text>
    </g>
  );
}
